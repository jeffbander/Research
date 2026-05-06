import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoose';
import { requireUserId } from '@/lib/auth';
import { DeidentAudit } from '@/models/DeidentAudit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }); }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }); }

  await dbConnect();
  try {
    const audit = await DeidentAudit.create({ ...body, user_id: userId });
    return NextResponse.json({ success: true, data: audit }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Failed to create audit', error: (err as Error).message },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  let userId: string;
  try { userId = await requireUserId(); }
  catch { return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }); }

  await dbConnect();
  const url = new URL(req.url);
  const filter: Record<string, unknown> = { user_id: userId };
  if (url.searchParams.get('preset')) filter['policy.preset'] = url.searchParams.get('preset');

  const audits = await DeidentAudit.find(filter)
    .sort({ scrubbed_at: -1 })
    .limit(parseInt(url.searchParams.get('limit') || '50', 10));

  return NextResponse.json({ success: true, count: audits.length, data: audits });
}
