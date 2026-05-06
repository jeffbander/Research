import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoose';
import { requireUserId, requireAdmin } from '@/lib/auth';
import { AigentsConfig } from '@/models/AigentsConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireUserId(); }
  catch { return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }); }

  const { id } = await params;
  await dbConnect();
  const config = await AigentsConfig.findById(id);
  if (!config) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: config.toSafeJSON() });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); }
  catch (e) {
    const err = e as { status?: number };
    return NextResponse.json(
      { success: false, message: err.status === 403 ? 'Forbidden' : 'Unauthorized' },
      { status: err.status ?? 401 }
    );
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }); }

  await dbConnect();
  const config = await AigentsConfig.findById(id).select('+auth_token');
  if (!config) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

  const editable = ['name', 'webhook_url', 'auth_type', 'auth_token',
                    'default_chain_title', 'default_folder_id',
                    'description', 'is_active', 'variables'];
  for (const field of editable) {
    if (body[field] !== undefined) (config as unknown as Record<string, unknown>)[field] = body[field];
  }
  await config.save();
  return NextResponse.json({ success: true, data: config.toSafeJSON() });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); }
  catch (e) {
    const err = e as { status?: number };
    return NextResponse.json(
      { success: false, message: err.status === 403 ? 'Forbidden' : 'Unauthorized' },
      { status: err.status ?? 401 }
    );
  }

  const { id } = await params;
  await dbConnect();
  const config = await AigentsConfig.findByIdAndDelete(id);
  if (!config) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, message: 'Deleted' });
}
