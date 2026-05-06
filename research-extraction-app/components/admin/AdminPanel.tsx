'use client';

import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import AigentsConfigsTab from './AigentsConfigsTab';
import PhiPoliciesTab from './PhiPoliciesTab';

type Tab = 'configs' | 'policies';

export default function AdminPanel() {
  const me = useQuery(api.users.me);
  const [tab, setTab] = useState<Tab>('configs');

  if (me === undefined) {
    return <div className="text-sm text-zinc-500">Loading…</div>;
  }
  if (!me || !me.isAdmin) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-6 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        <strong>Forbidden.</strong> This page is admin-only. Ask whoever owns the
        Convex deployment to add your Clerk user ID ({me?.id ?? 'unknown'}) to{' '}
        <code className="font-mono">CLERK_ADMIN_USER_IDS</code>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex gap-6">
          <TabButton active={tab === 'configs'} onClick={() => setTab('configs')}>
            Aigents configs
          </TabButton>
          <TabButton active={tab === 'policies'} onClick={() => setTab('policies')}>
            PHI policies
          </TabButton>
        </nav>
      </div>
      {tab === 'configs' ? <AigentsConfigsTab /> : <PhiPoliciesTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-3 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
          : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}
