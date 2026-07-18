import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { User } from '@/lib/server/models/User';
import { signToken } from '@/middleware/auth';
import { permissionsForRole } from '@/lib/server/permissions';

export const dynamic = 'force-dynamic';

// Open self-signup. The very first account ever created becomes the admin
// (bootstrap); everyone else who self-registers is a patient. Staff accounts
// (doctor/reception) are created by an admin via POST /api/users.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { name, email, password } = (await req.json().catch(() => ({}))) || {};
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'name, email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const isFirstUser = (await User.estimatedDocumentCount()) === 0;
    const role = isFirstUser ? 'admin' : 'patient';

    const user = new User({ name, email, role });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    return NextResponse.json(
      { token, user: user.toSafeJSON(), permissions: permissionsForRole(user.role) },
      { status: 201 }
    );
  } catch (err) {
    console.error('register error', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
