'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { UserButton } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';

export default function HeaderNav() {
  const me = useQuery(api.users.me);
  const isAdmin = me?.isAdmin ?? false;

  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/research-extraction" className="block">
            <h1 className="text-xl font-semibold">Research Extraction</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Local PHI de-identification, then handoff to Aigents
            </p>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Admin
            </Link>
          )}
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  );
}
