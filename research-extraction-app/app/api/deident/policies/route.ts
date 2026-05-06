import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongoose';
import { requireUserId } from '@/lib/auth';
import { PhiPolicy } from '@/models/PhiPolicy';
import { LOCKED_CATEGORIES, OPTIONAL_CATEGORIES } from '@/lib/phi-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireUserId(); }
  catch { return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 }); }

  await dbConnect();
  const policies = await PhiPolicy.find({ is_active: true });
  return NextResponse.json({
    success: true,
    count: policies.length,
    data: policies,
    meta: {
      locked_categories: LOCKED_CATEGORIES,
      optional_categories: OPTIONAL_CATEGORIES
    }
  });
}
