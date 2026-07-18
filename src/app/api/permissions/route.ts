import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/server/permissions';

export const dynamic = 'force-dynamic';

// Expose the role→permission map so the frontend can gate UI consistently.
export async function GET() {
  return NextResponse.json({ permissions: PERMISSIONS });
}
