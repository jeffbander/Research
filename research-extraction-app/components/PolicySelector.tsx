'use client';

import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  LOCKED_CATEGORIES,
  OPTIONAL_CATEGORIES,
  PRESETS,
  isSafeHarborCompliant,
  type OptionalCategory,
  type PhiPolicy
} from '@/lib/phi-policy';

interface SavedPolicy {
  _id: string;
  name: string;
  preset: string;
  redact: Record<string, boolean>;
}

export default function PolicySelector({
  policy,
  onChange
}: {
  policy: PhiPolicy;
  onChange: (p: PhiPolicy) => void;
}) {
  const [presetKey, setPresetKey] = useState<string>('internal_research');
  const [savedId, setSavedId] = useState<string>('');
  const [showCustom, setShowCustom] = useState(false);

  const saved = useQuery(api.policies.list);
  const savedPolicies: SavedPolicy[] = (saved?.policies as SavedPolicy[]) ?? [];

  useEffect(() => {
    onChange(PRESETS.internal_research);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyPreset(key: string) {
    setPresetKey(key);
    setSavedId('');
    if (PRESETS[key]) onChange(PRESETS[key]);
  }

  function applySaved(id: string) {
    setSavedId(id);
    setPresetKey('saved');
    const p = savedPolicies.find(x => x._id === id);
    if (p) {
      const redact = Object.fromEntries(
        OPTIONAL_CATEGORIES.map(c => [c, p.redact[c] ?? true])
      ) as Record<OptionalCategory, boolean>;
      onChange({ redact });
    }
  }

  function toggleCategory(cat: OptionalCategory, value: boolean) {
    const next: PhiPolicy = {
      redact: { ...policy.redact, [cat]: value }
    };
    onChange(next);
    setPresetKey('custom');
    setSavedId('');
  }

  const isSH = isSafeHarborCompliant(policy);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">PHI policy</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isSH
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
        }`}>
          {isSH ? 'Safe Harbor' : 'NOT Safe Harbor'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label className="block text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Preset</span>
          <select
            value={presetKey}
            onChange={e => applyPreset(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="safe_harbor">Safe Harbor (strictest)</option>
            <option value="internal_research">Internal Research (preserve MRN/provider/visit dates)</option>
            <option value="minimal">Minimal (locked floor only)</option>
            {presetKey === 'custom' && <option value="custom">Custom</option>}
            {presetKey === 'saved' && <option value="saved">Saved policy</option>}
          </select>
        </label>

        {savedPolicies.length > 0 && (
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Or load a saved policy</span>
            <select
              value={savedId}
              onChange={e => e.target.value ? applySaved(e.target.value) : applyPreset('internal_research')}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            >
              <option value="">— none —</option>
              {savedPolicies.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowCustom(s => !s)}
        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
      >
        {showCustom ? 'Hide' : 'Show'} per-category toggles
      </button>

      {showCustom && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Always redacted: {LOCKED_CATEGORIES.join(', ')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
            {OPTIONAL_CATEGORIES.map(cat => (
              <label key={cat} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={policy.redact[cat] ?? true}
                  onChange={e => toggleCategory(cat, e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs">{cat}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
