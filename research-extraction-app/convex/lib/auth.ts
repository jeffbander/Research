import type { QueryCtx, MutationCtx, ActionCtx } from '../_generated/server';

type AnyCtx = QueryCtx | MutationCtx | ActionCtx;

export async function requireUserId(ctx: AnyCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');
  return identity.subject;
}

export function isAdmin(userId: string): boolean {
  const list = (process.env.CLERK_ADMIN_USER_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

export async function requireAdmin(ctx: AnyCtx): Promise<string> {
  const userId = await requireUserId(ctx);
  if (!isAdmin(userId)) throw new Error('Forbidden');
  return userId;
}
