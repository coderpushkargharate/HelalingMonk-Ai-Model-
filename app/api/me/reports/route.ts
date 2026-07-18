import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Report } from '@/lib/server/models/Report';
import { Patient } from '@/lib/server/models/Patient';
import { requireAuth } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// A logged-in patient User is matched to their clinic Patient record(s) by email
// (patients are registered by reception/doctor, so the link is the shared email).
async function myPatientIds(user: any) {
  if (!user.email) return [];
  const patients = await Patient.find({ email: user.email.toLowerCase() }).select('_id');
  return patients.map((p: any) => p._id);
}

// GET /api/me/reports — the signed-in patient's own assessment reports.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    await connectDB();
    const ids = await myPatientIds(user);
    if (ids.length === 0) return NextResponse.json({ reports: [] });
    const reports = await Report.find({ patient: { $in: ids } })
      .populate('doctor', 'name')
      .sort({ createdAt: -1 });
    return NextResponse.json({ reports: reports.map((r: any) => r.toJSONSafe()) });
  } catch (err) {
    console.error('me/reports error', err);
    return NextResponse.json({ error: 'Could not load your reports' }, { status: 500 });
  }
}
