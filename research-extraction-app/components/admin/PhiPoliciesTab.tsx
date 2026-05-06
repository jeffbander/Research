'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { LOCKED_CATEGORIES, OPTIONAL_CATEGORIES, PRESETS, type OptionalCategory } from '@/lib/phi-policy';

interface SavedPolicy {
  _id: string;
  name: string;
  preset: string;
  redact: Record<string, boolean>;
  notes?: string;
  irb_protocol?: string;
}

const blank = {
  name: '',
  preset: 'internal_research' as 'safe_harbor' | 'internal_research' | 'minimal' | 'custom',
  redact: { ...PRESETS.internal_research.redact } as Record<string, boolean>,
  notes: '',
  irb_protocol: ''
};

export default function PhiPoliciesTab() {
  const data = useQuery(api.policies.list);
  const policies = (data?.policies ?? []) as SavedPolicy[];
  const create = useMutation(api.policies.create);
  const update = useMutation(api.policies.update);
  const remove = useMutation(api.policies.remove);

  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadIntoForm(p: SavedPolicy) {
    setEditingId(p._id);
    setForm({
      name: p.name,
      preset: (p.preset as typeof blank.preset) ?? 'custom',
      redact: { ...p.redact },
      notes: p.notes ?? '',
      irb_protocol: p.irb_protocol ?? ''
    });
  }

  function reset() {
    setEditingId(null);
    setForm(blank);
    setError(null);
  }

  function applyPreset(name: keyof typeof PRESETS) {
    setForm(f => ({ ...f, preset: name as typeof form.preset, redact: { ...PRESETS[name].redact } }));
  }

  function toggle(cat: OptionalCategory, value: boolean) {
    setForm(f => ({ ...f, preset: 'custom', redact: { ...f.redact, [cat]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        preset: form.preset,
        redact: form.redact,
        notes: form.notes || undefined,
        irb_protocol: form.irb_protocol || undefined
      };
      if (editingId) await update({ id: editingId as never, ...body });
      else await create(body);
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this PHI policy?')) return;
    setBusy(true);
    try { await remove({ id: id as never }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  const isSH = OPTIONAL_CATEGORIES.every(c => form.redact[c]);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-3">Saved policies</h3>
        {policies.length === 0 ? (
          <div className="text-sm text-zinc-500">None yet — create one below.</div>
        ) : (
          <div className="space-y-2">
            {policies.map(p => (
              <div key={p._id} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 flex items-start justify-between gap-4">
                <div className="text-sm">
                  <div className="font-medium">{p.name} <span className="text-xs text-zinc-500 font-normal">({p.preset})</span></div>
                  {p.irb_protocol && <div className="text-xs text-zinc-500">IRB: {p.irb_protocol}</div>}
                  <div className="text-xs text-zinc-500 mt-1">
                    Preserves: {OPTIONAL_CATEGORIES.filter(c => !p.redact[c]).join(', ') || '(none)'}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => loadIntoForm(p)} className="text-xs px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Edit</button>
                  <button type="button" onClick={() => handleDelete(p._id)} disabled={busy} className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">{editingId ? 'Edit policy' : 'Create new policy'}</h3>
        <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Name (unique)</span>
              <input
                type="text" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">IRB protocol (optional)</span>
              <input
                type="text" value={form.irb_protocol}
                onChange={e => setForm({ ...form, irb_protocol: e.target.value })}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Start from preset:</span>
            <button type="button" onClick={() => applyPreset('safe_harbor')}      className="px-2 py-1 rounded text-xs border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Safe Harbor</button>
            <button type="button" onClick={() => applyPreset('internal_research')} className="px-2 py-1 rounded text-xs border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Internal Research</button>
            <button type="button" onClick={() => applyPreset('minimal')}           className="px-2 py-1 rounded text-xs border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">Minimal</button>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              isSH
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            }`}>
              {isSH ? 'Safe Harbor' : 'NOT Safe Harbor'}
            </span>
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-2">
              Always redacted (locked): {LOCKED_CATEGORIES.join(', ')}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
              {OPTIONAL_CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.redact[cat] ?? true}
                    onChange={e => toggle(cat, e.target.checked)}
                  />
                  <span className="text-xs">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Notes</span>
            <textarea
              rows={2} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </label>

          {error && <div className="text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit" disabled={busy}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:bg-zinc-300"
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create policy'}
            </button>
            {editingId && (
              <button
                type="button" onClick={reset}
                className="px-4 py-2 rounded-md border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
