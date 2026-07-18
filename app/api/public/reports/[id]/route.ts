import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { PublicReport } from '@/lib/server/models/PublicReport';

export const dynamic = 'force-dynamic';

// Fetch a stored public report by id.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const doc = await PublicReport.findOne({ reportId: params.id });
    if (!doc) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    return NextResponse.json(doc.data);
  } catch (err) {
    console.error('public report fetch error', err);
    return NextResponse.json({ error: 'Could not load the report.' }, { status: 500 });
  }
}
