import { auth } from '@clerk/nextjs/server';

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return userId;
}

export async function isAdmin(userId: string): Promise<boolean> {
  const list = (process.env.CLERK_ADMIN_USER_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

export async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!(await isAdmin(userId))) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  return userId;
}
