import { Router } from 'express';
import { Patient } from '../models/Patient.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Staff-only module. Patients themselves don't hit these endpoints (Phase 3).
router.use(requireAuth, requireRole('admin', 'doctor', 'reception'));

// List patients. Doctors see only patients assigned to them unless ?scope=all.
// Reception/admin see everyone. Supports ?q= search over name / mobile / id.
router.get('/', async (req, res) => {
  const filter = {};

  if (req.user.role === 'doctor' && req.query.scope !== 'all') {
    filter.assignedDoctor = req.user._id;
  }

  const q = (req.query.q || '').trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { mobile: rx }, { patientId: rx }];
  }

  const patients = await Patient.find(filter)
    .populate('assignedDoctor', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ patients: patients.map((p) => p.toJSONSafe()) });
});

// Register a new patient. Doctors are auto-assigned the patient they create.
router.post('/', async (req, res) => {
  try {
    const { name, age, gender, mobile, email, painAreas, complaint, height, weight, assignedDoctor } =
      req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    const patient = new Patient({
      name: String(name).trim(),
      age: age ? Number(age) : undefined,
      gender: gender || '',
      mobile: mobile || '',
      email: email || '',
      painAreas: Array.isArray(painAreas) ? painAreas : [],
      complaint: complaint || '',
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      createdBy: req.user._id,
      // Doctor self-assigns; reception/admin may pass an explicit doctor id.
      assignedDoctor:
        req.user.role === 'doctor' ? req.user._id : assignedDoctor || null,
    });
    await patient.save();
    await patient.populate('assignedDoctor', 'name');
    res.status(201).json({ patient: patient.toJSONSafe() });
  } catch (err) {
    console.error('create patient error', err);
    res.status(500).json({ error: 'Could not create patient' });
  }
});

// Patient detail.
router.get('/:id', async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate('assignedDoctor', 'name');
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient: patient.toJSONSafe() });
});

// Assign (or reassign) a doctor to a patient.
router.patch('/:id/assign', async (req, res) => {
  const { doctorId } = req.body || {};
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });

  if (doctorId) {
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({ error: 'doctorId must reference a doctor account' });
    }
    patient.assignedDoctor = doctor._id;
  } else {
    patient.assignedDoctor = null;
  }
  await patient.save();
  await patient.populate('assignedDoctor', 'name');
  res.json({ patient: patient.toJSONSafe() });
});

// Reports timeline for a patient (newest first).
router.get('/:id/reports', async (req, res) => {
  const reports = await Report.find({ patient: req.params.id })
    .populate('doctor', 'name')
    .sort({ createdAt: -1 });
  res.json({ reports: reports.map((r) => r.toJSONSafe()) });
});

export default router;
