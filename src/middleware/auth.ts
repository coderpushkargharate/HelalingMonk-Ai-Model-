import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models/User';
import { roleHasPermission, Role } from '@/lib/server/permissions';

export function signToken(user: any): string {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

// Verify the Bearer token and return the live, active user document (or null).
export async function getUser(req: NextRequest): Promise<any | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { sub: string };
    await connectDB();
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return null;
    return user;
  } catch {
    return null;
  }
}

type Guard = { user: any; error?: undefined } | { user?: undefined; error: NextResponse };

// Route-handler equivalent of the old Express requireAuth middleware: returns
// either the authenticated user or a ready-to-return 401 response.
export async function requireAuth(req: NextRequest): Promise<Guard> {
  const user = await getUser(req);
  if (!user) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }
  return { user };
}

// Returns a 403 response if the user's role isn't allowed, else null.
export function requireRole(user: any, ...roles: Role[]): NextResponse | null {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden: insufficient role' }, { status: 403 });
  }
  return null;
}

// Returns a 403 response if the user lacks the permission, else null.
export function requirePermission(user: any, permission: string): NextResponse | null {
  if (!roleHasPermission(user.role, permission)) {
    return NextResponse.json({ error: `Forbidden: missing ${permission}` }, { status: 403 });
  }
  return null;
}
