import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Patient } from '@/lib/server/models/Patient';
import { requireAuth, requireRole } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

// List patients. Doctors see only patients assigned to them unless ?scope=all.
// Reception/admin see everyone. Supports ?q= search over name / mobile / id.
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const roleErr = requireRole(user, 'admin', 'doctor', 'reception');
  if (roleErr) return roleErr;

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};

  if (user.role === 'doctor' && sp.get('scope') !== 'all') {
    filter.assignedDoctor = user._id;
  }

  const q = (sp.get('q') || '').trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { mobile: rx }, { patientId: rx }];
  }

  const patients = await Patient.find(filter)
    .populate('assignedDoctor', 'name')
    .sort({ createdAt: -1 })
    .limit(200);
  return NextResponse.json({ patients: patients.map((p: any) => p.toJSONSafe()) });
}

// Register a new patient. Doctors are auto-assigned the patient they create.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const roleErr = requireRole(user, 'admin', 'doctor', 'reception');
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { name, age, gender, mobile, email, painAreas, complaint, height, weight, assignedDoctor } =
      (await req.json().catch(() => ({}))) || {};
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 });
    }

    const patient = new Patient({
      name: String(name).trim(),
      age: age ? Number(age) : undefined,
      gender: gender || '',
      mobile: mobile || '',
      email: email || '',
      painAreas: Array.isArray(painAreas) ? painAreas : [],
      complaint: complaint || '',
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      createdBy: user._id,
      // Doctor self-assigns; reception/admin may pass an explicit doctor id.
      assignedDoctor: user.role === 'doctor' ? user._id : assignedDoctor || null,
    });
    await patient.save();
    await patient.populate('assignedDoctor', 'name');
    return NextResponse.json({ patient: patient.toJSONSafe() }, { status: 201 });
  } catch (err) {
    console.error('create patient error', err);
    return NextResponse.json({ error: 'Could not create patient' }, { status: 500 });
  }
}
