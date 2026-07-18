import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models/User';
import { signToken } from '@/lib/server/auth';
import { permissionsForRole } from '@/lib/server/permissions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = (await req.json().catch(() => ({}))) || {};
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.verifyPassword(password))) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    if (!user.active) return NextResponse.json({ error: 'Account disabled' }, { status: 403 });

    const token = signToken(user);
    return NextResponse.json({
      token,
      user: user.toSafeJSON(),
      permissions: permissionsForRole(user.role),
    });
  } catch (err) {
    console.error('login error', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
