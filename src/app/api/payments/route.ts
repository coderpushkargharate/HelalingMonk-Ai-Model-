import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Payment } from '@/lib/server/models/Payment';
import { requireAuth, requireRole } from '@/middleware/auth';

export const dynamic = 'force-dynamic';

// List payments, optionally ?patient=<id>. Staff only.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const roleErr = requireRole(user, 'admin', 'doctor', 'reception');
  if (roleErr) return roleErr;

  await connectDB();
  const filter: Record<string, unknown> = {};
  const patient = req.nextUrl.searchParams.get('patient');
  if (patient) filter.patient = patient;
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(300);
  return NextResponse.json({ payments: payments.map((p: any) => p.toJSONSafe()) });
}
