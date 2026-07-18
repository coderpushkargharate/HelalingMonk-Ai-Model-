import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Report } from '@/lib/server/models/Report';
import { requireAuth, requireRole } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// Add / update the doctor's notes on a report. Doctors/admin only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const roleErr = requireRole(user, 'doctor', 'admin');
  if (roleErr) return roleErr;

  await connectDB();
  const { doctorNotes } = (await req.json().catch(() => ({}))) || {};
  const report = await Report.findById(params.id);
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  report.doctorNotes = doctorNotes || '';
  await report.save();
  await report.populate('doctor', 'name');
  return NextResponse.json({ report: report.toJSONSafe() });
}
