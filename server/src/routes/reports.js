import { Router } from 'express';
import { Report } from '../models/Report.js';
import { Patient } from '../models/Patient.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sendMail, reportReadyEmail } from '../lib/mailer.js';

const router = Router();

router.use(requireAuth);

// List reports across patients. Admin sees all; a doctor sees only their own
// unless ?scope=all. Newest first. Includes basic patient info for tables.
router.get('/', requireRole('admin', 'doctor'), async (req, res) => {
  const filter = {};
  if (req.user.role === 'doctor' && req.query.scope !== 'all') {
    filter.doctor = req.user._id;
  }
  const reports = await Report.find(filter)
    .populate('doctor', 'name')
    .populate('patient', 'name patientId')
    .sort({ createdAt: -1 })
    .limit(300);
  res.json({
    reports: reports.map((r) => ({
      ...r.toJSONSafe(),
      patientInfo: r.patient?._id
        ? { id: r.patient._id.toString(), name: r.patient.name, patientId: r.patient.patientId }
        : null,
    })),
  });
});

// Create a report from a completed AI assessment. Doctors only.
router.post('/', requireRole('doctor', 'admin'), async (req, res) => {
  try {
    const {
      patientId, // Patient _id
      painAreas,
      overallScore,
      findings,
      suggestedExercises,
      doctorNotes,
    } = req.body || {};

    if (!patientId) return res.status(400).json({ error: 'patientId is required' });
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const list = Array.isArray(findings) ? findings : [];
    const flaggedCount = list.filter((f) => f.severity && f.severity !== 'normal').length;

    const report = new Report({
      patient: patient._id,
      doctor: req.user._id,
      painAreas: Array.isArray(painAreas) ? painAreas : patient.painAreas,
      overallScore: typeof overallScore === 'number' ? overallScore : null,
      findings: list,
      findingsCount: list.length,
      flaggedCount,
      suggestedExercises: Array.isArray(suggestedExercises) ? suggestedExercises : [],
      doctorNotes: doctorNotes || '',
    });
    await report.save();
    await report.populate('doctor', 'name');

    // Email the patient that their report is ready (if they have an email).
    if (patient.email) {
      const mail = reportReadyEmail({
        patientName: patient.name,
        doctorName: report.doctor?.name,
        overallScore: report.overallScore,
        flaggedCount: report.flaggedCount,
      });
      sendMail({ to: patient.email, ...mail });
    }

    res.status(201).json({ report: report.toJSONSafe() });
  } catch (err) {
    console.error('create report error', err);
    res.status(500).json({ error: 'Could not save report' });
  }
});

// Get a single report.
router.get('/:id', async (req, res) => {
  const report = await Report.findById(req.params.id).populate('doctor', 'name');
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({ report: report.toJSONSafe() });
});

// Add / update the doctor's notes on a report.
router.patch('/:id/notes', requireRole('doctor', 'admin'), async (req, res) => {
  const { doctorNotes } = req.body || {};
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  report.doctorNotes = doctorNotes || '';
  await report.save();
  await report.populate('doctor', 'name');
  res.json({ report: report.toJSONSafe() });
});

export default router;
