import { UserButton } from '@clerk/nextjs';
import ResearchExtractionApp from '@/components/ResearchExtractionApp';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Research Extraction</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Local PHI de-identification, then handoff to Aigents
            </p>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        <ResearchExtractionApp />
      </main>
    </div>
  );
}
