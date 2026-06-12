import { Router } from 'express';
import { User } from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { permissionsForRole } from '../permissions.js';

const router = Router();

// Open self-signup. The very first account ever created becomes the admin
// (bootstrap); everyone else who self-registers is a patient. Staff accounts
// (doctor/reception) are created by an admin via POST /api/users.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const isFirstUser = (await User.estimatedDocumentCount()) === 0;
    const role = isFirstUser ? 'admin' : 'patient';

    const user = new User({ name, email, role });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    res.status(201).json({
      token,
      user: user.toSafeJSON(),
      permissions: permissionsForRole(user.role),
    });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.active) return res.status(403).json({ error: 'Account disabled' });

    const token = signToken(user);
    res.json({
      token,
      user: user.toSafeJSON(),
      permissions: permissionsForRole(user.role),
    });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Current session — used by the frontend to restore auth on reload.
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user.toSafeJSON(),
    permissions: permissionsForRole(req.user.role),
  });
});

export default router;
