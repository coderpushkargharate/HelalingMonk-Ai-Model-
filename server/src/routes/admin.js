import { Router } from 'express';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Report } from '../models/Report.js';
import { Appointment } from '../models/Appointment.js';
import { Payment } from '../models/Payment.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Whole-clinic analytics are admin-only.
router.use(requireAuth, requireRole('admin'));

// Aggregate counts for the super-admin overview. One round-trip, all in parallel.
router.get('/stats', async (_req, res) => {
  try {
    const [patients, reports, appointments, usersByRole, paidAgg, apptByStatus] = await Promise.all([
      Patient.countDocuments(),
      Report.countDocuments(),
      Appointment.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const roleCounts = { admin: 0, doctor: 0, reception: 0, patient: 0 };
    usersByRole.forEach((u) => {
      if (u._id in roleCounts) roleCounts[u._id] = u.count;
    });

    const apptStatus = {};
    apptByStatus.forEach((a) => {
      apptStatus[a._id] = a.count;
    });

    res.json({
      stats: {
        patients,
        reports,
        appointments,
        usersByRole: roleCounts,
        apptStatus,
        revenuePaise: paidAgg[0]?.total || 0,
        paidCount: paidAgg[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error('admin stats error', err);
    res.status(500).json({ error: 'Could not load stats' });
  }
});

export default router;
