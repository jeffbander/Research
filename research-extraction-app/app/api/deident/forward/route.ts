import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoose';
import { requireUserId } from '@/lib/auth';
import { AigentsConfig } from '@/models/AigentsConfig';
import { DeidentAudit } from '@/models/DeidentAudit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ForwardBody {
  config_id: string;
  audit_id?: string;
  payload: {
    chain_title?: string;
    [k: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch (e: unknown) {
    const err = e as { status?: number };
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: err.status ?? 401 });
  }

  let body: ForwardBody;
  try { body = await req.json() as ForwardBody; }
  catch { return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 }); }

  if (!body?.config_id || !body?.payload) {
    return NextResponse.json(
      { success: false, message: 'config_id and payload are required' },
      { status: 400 }
    );
  }

  await dbConnect();
  const config = await AigentsConfig.findById(body.config_id).select('+auth_token');
  if (!config) {
    return NextResponse.json({ success: false, message: 'Aigents config not found' }, { status: 404 });
  }
  if (!config.is_active) {
    return NextResponse.json({ success: false, message: 'Aigents config is inactive' }, { status: 400 });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = config.decryptedToken();
  if (config.auth_type === 'bearer' && token) headers.Authorization = `Bearer ${token}`;
  else if (config.auth_type === 'basic' && token) headers.Authorization = `Basic ${token}`;

  let upstream: Response;
  try {
    upstream = await fetch(config.webhook_url, {
      method: 'POST', headers, body: JSON.stringify(body.payload)
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: 'Failed to reach Aigents', error: (err as Error).message },
      { status: 502 }
    );
  }

  const text = await upstream.text();
  let upstreamBody: unknown;
  try { upstreamBody = JSON.parse(text); } catch { upstreamBody = text; }

  const chainRunId =
    upstreamBody && typeof upstreamBody === 'object' && upstreamBody !== null
      ? ((upstreamBody as Record<string, unknown>).chain_run_id ??
         (upstreamBody as Record<string, unknown>).run_id ??
         (upstreamBody as Record<string, unknown>).id) as string | undefined
      : undefined;

  if (body.audit_id && chainRunId) {
    await DeidentAudit.findByIdAndUpdate(body.audit_id, {
      aigents_config_id: body.config_id,
      aigents_chain_run_id: chainRunId,
      aigents_chain_title: body.payload.chain_title,
      aigents_forwarded_at: new Date()
    });
  }

  return NextResponse.json({
    success: upstream.ok,
    status: upstream.status,
    chain_run_id: chainRunId,
    data: upstreamBody
  }, { status: upstream.ok ? 200 : 502 });
}
