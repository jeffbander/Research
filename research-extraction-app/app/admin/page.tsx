import HeaderNav from '@/components/HeaderNav';
import AdminPanel from '@/components/admin/AdminPanel';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <HeaderNav />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <AdminPanel />
      </main>
    </div>
  );
}
