import { Router } from 'express';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ROLES, permissionsForRole } from '../permissions.js';
import { sendMail, welcomeStaffEmail } from '../lib/mailer.js';

const router = Router();

// Staff-accessible doctor directory for booking / assignment dropdowns. Declared
// BEFORE the admin guard below so reception and doctors can read it too. Returns
// only active doctors with safe fields.
router.get('/doctors', requireAuth, requireRole('admin', 'doctor', 'reception'), async (_req, res) => {
  const docs = await User.find({ role: 'doctor', active: true }).sort({ name: 1 });
  res.json({ users: docs.map((u) => u.toSafeJSON()) });
});

// Every route below here is admin-only.
router.use(requireAuth, requireRole('admin'));

// List all users, optionally filtered by ?role=doctor
router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ users: users.map((u) => u.toSafeJSON()) });
});

// Admin creates a staff/user account (doctor, reception, or another admin).
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = new User({ name, email, role, createdBy: req.user._id });
    await user.setPassword(password);
    await user.save();

    // Notify the new staff member (non-blocking — never fails the request).
    const mail = welcomeStaffEmail({ name, email, role, tempPassword: password });
    sendMail({ to: email, ...mail });

    res.status(201).json({
      user: user.toSafeJSON(),
      permissions: permissionsForRole(user.role),
    });
  } catch (err) {
    console.error('create user error', err);
    res.status(500).json({ error: 'Could not create user' });
  }
});

// Enable / disable an account.
router.patch('/:id/active', async (req, res) => {
  const { active } = req.body || {};
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user._id.equals(req.user._id)) {
    return res.status(400).json({ error: 'You cannot change your own status' });
  }
  user.active = Boolean(active);
  await user.save();
  res.json({ user: user.toSafeJSON() });
});

export default router;
