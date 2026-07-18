import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Patient } from '@/lib/server/models/Patient';
import { Appointment } from '@/lib/server/models/Appointment';
import { sendMail, appointmentBookedEmail } from '@/lib/server/mailer';

export const dynamic = 'force-dynamic';

// Public, unauthenticated booking from the marketing home page. Creates (or
// reuses) a patient record and an optional pending appointment that reception
// confirms from the desk. No auth — this is the lead-capture entry point.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, mobile, email, complaint, painAreas, preferredAt } =
      (await req.json().catch(() => ({}))) || {};
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!mobile && !email) {
      return NextResponse.json({ error: 'Please provide a mobile number or email' }, { status: 400 });
    }

    // Find-or-create the patient by mobile/email to avoid duplicates.
    const cleanMobile = (mobile || '').trim();
    const cleanEmail = (email || '').toLowerCase().trim();
    let patient: any = null;
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

    let appointment: any = null;
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

    return NextResponse.json(
      {
        ok: true,
        patientId: patient._id.toString(),
        appointmentId: appointment?._id?.toString() || null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('public booking error', err);
    return NextResponse.json(
      { error: 'Could not submit your booking. Please try again.' },
      { status: 500 }
    );
  }
}
