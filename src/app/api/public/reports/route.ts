import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { PublicReport } from '@/lib/server/models/PublicReport';

export const dynamic = 'force-dynamic';

// Upsert a public (guest) report. Body is the whole StoredReport blob, including
// its `id`, so the report URL works across browsers and devices.
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const report = (await req.json().catch(() => ({}))) || {};
    const reportId = report.id;
    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'Report id is required' }, { status: 400 });
    }
    await PublicReport.findOneAndUpdate(
      { reportId },
      { reportId, data: report },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return NextResponse.json({ ok: true, id: reportId }, { status: 201 });
  } catch (err) {
    console.error('public report save error', err);
    return NextResponse.json({ error: 'Could not save the report.' }, { status: 500 });
  }
}
