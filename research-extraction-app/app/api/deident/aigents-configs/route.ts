import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoose';
import { requireUserId, requireAdmin } from '@/lib/auth';
import { AigentsConfig } from '@/models/AigentsConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireUserId(); }
  catch { return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }); }

  await dbConnect();
  const configs = await AigentsConfig.find({ is_active: true });
  return NextResponse.json({
    success: true,
    count: configs.length,
    data: configs.map(c => c.toSafeJSON())
  });
}

export async function POST(req: NextRequest) {
  let userId: string;
  try { userId = await requireAdmin(); }
  catch (e) {
    const err = e as { status?: number };
    return NextResponse.json(
      { success: false, message: err.status === 403 ? 'Forbidden' : 'Unauthorized' },
      { status: err.status ?? 401 }
    );
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }); }

  await dbConnect();
  try {
    const config = await AigentsConfig.create({ ...body, created_by: userId });
    return NextResponse.json({ success: true, data: config.toSafeJSON() }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Failed to create config', error: (err as Error).message },
      { status: 400 }
    );
  }
}
