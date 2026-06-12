import { Router } from 'express';
import { Appointment, APPOINTMENT_STATUSES } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  sendMail,
  appointmentBookedEmail,
  appointmentRescheduledEmail,
} from '../lib/mailer.js';

const router = Router();

// Staff-only module.
router.use(requireAuth, requireRole('admin', 'doctor', 'reception'));

// Pretty date string for emails, in IST (clinic timezone).
function formatWhen(date) {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// List appointments. Filters: ?date=YYYY-MM-DD, ?doctor=<id>, ?patient=<id>,
// ?status=. Doctors are scoped to their own appointments unless ?scope=all.
router.get('/', async (req, res) => {
  const filter = {};

  if (req.user.role === 'doctor' && req.query.scope !== 'all') {
    filter.doctor = req.user._id;
  } else if (req.query.doctor) {
    filter.doctor = req.query.doctor;
  }
  if (req.query.patient) filter.patient = req.query.patient;
  if (req.query.status && APPOINTMENT_STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  // Single-day window (clinic-local). Defaults to no date filter.
  if (req.query.date) {
    const start = new Date(`${req.query.date}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (!Number.isNaN(start.getTime())) filter.scheduledAt = { $gte: start, $lt: end };
  }

  const appts = await Appointment.find(filter)
    .populate('patient', 'name')
    .populate('doctor', 'name')
    .sort({ scheduledAt: 1 })
    .limit(300);
  res.json({ appointments: appts.map((a) => a.toJSONSafe()) });
});

// Book an appointment. Reception/doctor/admin.
router.post('/', async (req, res) => {
  try {
    const { patientId, doctorId, scheduledAt, durationMin, reason } = req.body || {};
    if (!patientId || !scheduledAt) {
      return res.status(400).json({ error: 'patientId and scheduledAt are required' });
    }
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return res.status(400).json({ error: 'scheduledAt is not a valid date' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    // Doctors booking for themselves; otherwise use provided doctor or the
    // patient's assigned doctor as a sensible default.
    let doctor = doctorId || patient.assignedDoctor || null;
    if (req.user.role === 'doctor') doctor = req.user._id;
    if (doctor) {
      const doc = await User.findById(doctor);
      if (!doc || doc.role !== 'doctor') {
        return res.status(400).json({ error: 'doctorId must reference a doctor account' });
      }
    }

    const appt = new Appointment({
      patient: patient._id,
      doctor: doctor || null,
      scheduledAt: when,
      durationMin: durationMin ? Number(durationMin) : 30,
      reason: reason || '',
      createdBy: req.user._id,
    });
    await appt.save();
    await appt.populate('patient', 'name');
    await appt.populate('doctor', 'name');

    if (patient.email) {
      const mail = appointmentBookedEmail({
        patientName: patient.name,
        doctorName: appt.doctor?.name,
        when: formatWhen(when),
        reason: reason || '',
      });
      sendMail({ to: patient.email, ...mail });
    }

    res.status(201).json({ appointment: appt.toJSONSafe() });
  } catch (err) {
    console.error('book appointment error', err);
    res.status(500).json({ error: 'Could not book appointment' });
  }
});

// Reschedule. Reception/admin (doctors may reschedule their own).
router.patch('/:id/reschedule', async (req, res) => {
  const { scheduledAt } = req.body || {};
  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    return res.status(400).json({ error: 'scheduledAt is not a valid date' });
  }
  const appt = await Appointment.findById(req.params.id).populate('patient', 'name email');
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (req.user.role === 'doctor' && String(appt.doctor) !== String(req.user._id)) {
    return res.status(403).json({ error: 'You can only reschedule your own appointments' });
  }

  appt.scheduledAt = when;
  appt.status = 'scheduled';
  await appt.save();
  await appt.populate('doctor', 'name');

  if (appt.patient?.email) {
    const mail = appointmentRescheduledEmail({
      patientName: appt.patient.name,
      doctorName: appt.doctor?.name,
      when: formatWhen(when),
    });
    sendMail({ to: appt.patient.email, ...mail });
  }
  res.json({ appointment: appt.toJSONSafe() });
});

// Update status (completed / cancelled / no_show).
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!APPOINTMENT_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` });
  }
  const appt = await Appointment.findById(req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  appt.status = status;
  await appt.save();
  await appt.populate('patient', 'name');
  await appt.populate('doctor', 'name');
  res.json({ appointment: appt.toJSONSafe() });
});

export default router;
