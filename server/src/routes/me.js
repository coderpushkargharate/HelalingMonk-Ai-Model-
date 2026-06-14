import { Router } from 'express';
import { Report } from '../models/Report.js';
import { Patient } from '../models/Patient.js';
import { Appointment } from '../models/Appointment.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Patient self-service. A logged-in patient User is matched to their clinic
// Patient record(s) by email (patients are registered by reception/doctor, so
// the link is the shared email address).
router.use(requireAuth);

async function myPatientIds(user) {
  if (!user.email) return [];
  const patients = await Patient.find({ email: user.email.toLowerCase() }).select('_id');
  return patients.map((p) => p._id);
}

// GET /api/me/reports — the signed-in patient's own assessment reports.
router.get('/reports', async (req, res) => {
  try {
    const ids = await myPatientIds(req.user);
    if (ids.length === 0) return res.json({ reports: [] });
    const reports = await Report.find({ patient: { $in: ids } })
      .populate('doctor', 'name')
      .sort({ createdAt: -1 });
    res.json({ reports: reports.map((r) => r.toJSONSafe()) });
  } catch (err) {
    console.error('me/reports error', err);
    res.status(500).json({ error: 'Could not load your reports' });
  }
});

// GET /api/me/appointments — the signed-in patient's upcoming appointments.
router.get('/appointments', async (req, res) => {
  try {
    const ids = await myPatientIds(req.user);
    if (ids.length === 0) return res.json({ appointments: [] });
    const appts = await Appointment.find({ patient: { $in: ids } })
      .populate('doctor', 'name')
      .populate('patient', 'name')
      .sort({ scheduledAt: -1 })
      .limit(50);
    res.json({ appointments: appts.map((a) => a.toJSONSafe()) });
  } catch (err) {
    console.error('me/appointments error', err);
    res.status(500).json({ error: 'Could not load your appointments' });
  }
});

export default router;
