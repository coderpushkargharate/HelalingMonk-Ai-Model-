import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models/User';
import { requireAuth, requireRole } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// Staff-accessible doctor directory for booking / assignment dropdowns.
// Returns only active doctors with safe fields.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const roleErr = requireRole(user, 'admin', 'doctor', 'reception');
  if (roleErr) return roleErr;

  await connectDB();
  const docs = await User.find({ role: 'doctor', active: true }).sort({ name: 1 });
  return NextResponse.json({ users: docs.map((u: any) => u.toSafeJSON()) });
}
