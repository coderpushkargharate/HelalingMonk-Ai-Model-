import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { permissionsForRole } from '@/lib/server/permissions';

export const dynamic = 'force-dynamic';

// Current session — used by the frontend to restore auth on reload.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  return NextResponse.json({
    user: user.toSafeJSON(),
    permissions: permissionsForRole(user.role),
  });
}
