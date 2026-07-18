import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Appointment, APPOINTMENT_STATUSES } from '@/lib/server/models/Appointment';
import { requireAuth, requireRole } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// Update status (completed / cancelled / no_show).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const roleErr = requireRole(user, 'admin', 'doctor', 'reception');
  if (roleErr) return roleErr;

  await connectDB();
  const { status } = (await req.json().catch(() => ({}))) || {};
  if (!APPOINTMENT_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }
  const appt = await Appointment.findById(params.id);
  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
  appt.status = status;
  await appt.save();
  await appt.populate('patient', 'name');
  await appt.populate('doctor', 'name');
  return NextResponse.json({ appointment: appt.toJSONSafe() });
}
