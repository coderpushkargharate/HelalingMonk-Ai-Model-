import { Router } from 'express';
import { Patient } from '../models/Patient.js';
import { Appointment } from '../models/Appointment.js';
import { sendMail, appointmentBookedEmail } from '../lib/mailer.js';

const router = Router();

// Public, unauthenticated booking from the marketing home page. Creates (or
// reuses) a patient record and an optional pending appointment that reception
// confirms from the desk. No auth — this is the lead-capture entry point.
router.post('/booking', async (req, res) => {
  try {
    const { name, mobile, email, complaint, painAreas, preferredAt } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!mobile && !email) {
      return res.status(400).json({ error: 'Please provide a mobile number or email' });
    }

    // Find-or-create the patient by mobile/email to avoid duplicates.
    const cleanMobile = (mobile || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    let patient = null;
    if (cleanMobile) patient = await Patient.findOne({ mobile: cleanMobile });
    if (!patient && cleanEmail) patient = await Patient.findOne({ email: cleanEmail });
    if (!patient) {
      patient = new Patient({
        name: name.trim(),
        mobile: cleanMobile,
        email: cleanEmail,
        complaint: complaint || '',
        painAreas: Array.isArray(painAreas) ? painAreas : [],
      });
      await patient.save();
    }

    let appointment = null;
    const when = preferredAt ? new Date(preferredAt) : null;
    if (when && !Number.isNaN(when.getTime())) {
      appointment = new Appointment({
        patient: patient._id,
        scheduledAt: when,
        reason: complaint || 'Online booking request',
      });
      await appointment.save();

      if (patient.email) {
        const mail = appointmentBookedEmail({
          patientName: patient.name,
          when: when.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
          reason: complaint || '',
        });
        sendMail({ to: patient.email, ...mail });
      }
    }

    res.status(201).json({
      ok: true,
      patientId: patient._id.toString(),
      appointmentId: appointment?._id?.toString() || null,
    });
  } catch (err) {
    console.error('public booking error', err);
    res.status(500).json({ error: 'Could not submit your booking. Please try again.' });
  }
});

export default router;
