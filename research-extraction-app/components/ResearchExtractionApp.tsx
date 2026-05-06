'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  loadEngine,
  scrubField,
  type FieldKey,
  type FieldProgress
} from '@/lib/scrub-engine';
import { IdentifierMap } from '@/lib/identifier-map';
import {
  PRESETS,
  isSafeHarborCompliant,
  OPTIONAL_CATEGORIES,
  type PhiPolicy
} from '@/lib/phi-policy';
import { sha256 } from '@/lib/hash';
import { generateSyntheticChart } from '@/lib/synthetic-chart';
import PolicySelector from './PolicySelector';

type EngineState = 'idle' | 'loading' | 'ready' | 'error';

const FIELD_LABELS: Record<FieldKey, string> = {
  notes:      'Notes (chart records, history, narrative labs)',
  procedures: 'Procedures (echocardiograms, CT, MRI reports)',
  labs:       'Laboratory Results (discrete lab values)'
};

const FIELD_PLACEHOLDERS: Record<FieldKey, string> = {
  notes:      'Paste clinical notes, history, and chart records here…',
  procedures: 'Paste imaging / procedure reports here…',
  labs:       'Paste laboratory results here…'
};

export default function ResearchExtractionApp() {
  const configs = useQuery(api.aigentsConfigs.list) ?? [];
  const createAudit = useMutation(api.audits.create);
  const sendForward = useAction(api.forward.send);

  const [engineState, setEngineState] = useState<EngineState>('idle');
  const [loadProgress, setLoadProgress] = useState<{ pct: number; text: string }>({ pct: 0, text: '' });
  const [loadError, setLoadError] = useState<string | null>(null);

  const [policy, setPolicy] = useState<PhiPolicy>(PRESETS.internal_research);

  const [inputs, setInputs] = useState<Record<FieldKey, string>>({
    notes: '', procedures: '', labs: ''
  });
  const [cleansed, setCleansed] = useState<Record<FieldKey, string>>({
    notes: '', procedures: '', labs: ''
  });
  const [progress, setProgress] = useState<Record<FieldKey, FieldProgress>>({
    notes:      { field: 'notes',      status: 'pending', chunksTotal: 0, chunksDone: 0, redactions: 0 },
    procedures: { field: 'procedures', status: 'pending', chunksTotal: 0, chunksDone: 0, redactions: 0 },
    labs:       { field: 'labs',       status: 'pending', chunksTotal: 0, chunksDone: 0, redactions: 0 }
  });

  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [chainTitleOverride, setChainTitleOverride] = useState<string>('');
  const [auditId, setAuditId] = useState<string | null>(null);
  const [forwardResult, setForwardResult] = useState<{ ok: boolean; chain_run_id?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (configs.length > 0 && !selectedConfigId) setSelectedConfigId(configs[0]._id);
  }, [configs, selectedConfigId]);

  async function handleLoadModel() {
    setEngineState('loading');
    setLoadError(null);
    try {
      await loadEngine({
        onProgress: (r) => setLoadProgress({ pct: r.progress, text: r.text })
      });
      setEngineState('ready');
    } catch (err) {
      setEngineState('error');
      setLoadError((err as Error).message);
    }
  }

  function handleLoadDemoData() {
    const chart = generateSyntheticChart({ pages: 3 });
    setInputs({
      notes: chart.notes,
      procedures: chart.procedures,
      labs: chart.labs
    });
    setCleansed({ notes: '', procedures: '', labs: '' });
    setProgress({
      notes:      { field: 'notes',      status: 'pending', chunksTotal: 0, chunksDone: 0, redactions: 0 },
      procedures: { field: 'procedures', status: 'pending', chunksTotal: 0, chunksDone: 0, redactions: 0 },
      labs:       { field: 'labs',       status: 'pending', chunksTotal: 0, chunksDone: 0, redactions: 0 }
    });
    setAuditId(null);
    setForwardResult(null);
  }

  async function handleScrubAll() {
    if (engineState !== 'ready') return;
    setBusy(true);
    setForwardResult(null);
    setAuditId(null);

    const map = new IdentifierMap();
    const newCleansed: Record<FieldKey, string> = { notes: '', procedures: '', labs: '' };
    const fieldOrder: FieldKey[] = ['notes', 'procedures', 'labs'];

    const startedAt = Date.now();
    const engine = await loadEngine();

    try {
      for (const field of fieldOrder) {
        const raw = inputs[field];
        if (!raw.trim()) {
          setProgress(p => ({
            ...p,
            [field]: { ...p[field], status: 'completed', chunksTotal: 0, chunksDone: 0 }
          }));
          continue;
        }
        const result = await scrubField(
          engine, field, raw, map, policy,
          (pr) => setProgress(p => ({ ...p, [field]: pr }))
        );
        newCleansed[field] = result.cleansed;
        setCleansed(c => ({ ...c, [field]: result.cleansed }));
      }

      const elapsedMs = Date.now() - startedAt;
      const inputSha  = await sha256(fieldOrder.map(f => inputs[f]).join('\n---\n'));
      const outputSha = await sha256(fieldOrder.map(f => newCleansed[f]).join('\n---\n'));

      const redactedCats = OPTIONAL_CATEGORIES.filter(c => policy.redact[c]);
      const preservedCats = OPTIONAL_CATEGORIES.filter(c => !policy.redact[c]);

      const id = await createAudit({
        doc_id: crypto.randomUUID(),
        fields: {
          notes:      fieldStatsFor('notes',      inputs, newCleansed, progress),
          procedures: fieldStatsFor('procedures', inputs, newCleansed, progress),
          labs:       fieldStatsFor('labs',       inputs, newCleansed, progress)
        },
        combined: {
          input_sha256: inputSha,
          output_sha256: outputSha,
          redaction_categories: map.counts()
        },
        model_used: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        elapsed_ms: elapsedMs,
        policy: {
          preset: presetNameFor(policy),
          is_safe_harbor: isSafeHarborCompliant(policy),
          redacted_categories: ['PATIENT_NAME', 'DOB', 'SSN', ...redactedCats],
          preserved_categories: preservedCats
        }
      });
      setAuditId(id as string);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendToAigents() {
    if (!selectedConfigId) return;
    const config = configs.find((c: { _id: string }) => c._id === selectedConfigId);
    if (!config) return;

    setBusy(true);
    setForwardResult(null);
    try {
      const payload = {
        source_name: 'research_extraction',
        source_id: auditId ?? crypto.randomUUID(),
        chain_title: chainTitleOverride || config.default_chain_title || '',
        first_step_user_input: 'Process patient extraction',
        starting_variables: {
          [config.variables.notes]:      cleansed.notes,
          [config.variables.procedures]: cleansed.procedures,
          [config.variables.labs]:       cleansed.labs
        }
      };
      const r = await sendForward({
        config_id: selectedConfigId as never,
        audit_id: (auditId ?? undefined) as never,
        payload
      });
      setForwardResult({
        ok: r.success === true,
        chain_run_id: r.chain_run_id,
        error: r.success ? undefined : (r.error || `HTTP ${r.status}`)
      });
    } catch (err) {
      setForwardResult({ ok: false, error: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const scrubReady = engineState === 'ready'
    && Object.values(inputs).some(v => v.trim().length > 0)
    && !busy;
  const sendReady = !busy
    && Object.values(cleansed).some(v => v.trim().length > 0)
    && !!selectedConfigId;

  return (
    <div className="space-y-8">
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <strong>Synthetic / authorized research data only.</strong> This tool de-identifies text in
        your browser via a local AI model — no PHI is sent to any server until you click Send to
        Aigents, at which point the cleansed text is forwarded for analysis.
      </div>

      <PolicySelector policy={policy} onChange={setPolicy} />

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold mb-2">1. Load the local model</h2>
        {engineState === 'idle' && (
          <button
            onClick={handleLoadModel}
            className="px-4 py-2 rounded-md bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Load Llama 3.2 (3B)
          </button>
        )}
        {engineState === 'loading' && (
          <div>
            <div className="text-sm mb-2">{loadProgress.text}</div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
              <div
                className="bg-zinc-900 dark:bg-zinc-100 h-2 rounded-full transition-all"
                style={{ width: `${Math.round((loadProgress.pct || 0) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {engineState === 'ready' && (
          <div className="text-sm text-emerald-700 dark:text-emerald-400">Model ready.</div>
        )}
        {engineState === 'error' && (
          <div className="text-sm text-red-700 dark:text-red-400">
            Failed to load model: {loadError}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">2. Paste source text into each field</h2>
          <button
            type="button"
            onClick={handleLoadDemoData}
            className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Load synthetic demo data
          </button>
        </div>
        <div className="space-y-4">
          {(['notes', 'procedures', 'labs'] as FieldKey[]).map(field => (
            <FieldInput
              key={field}
              field={field}
              label={FIELD_LABELS[field]}
              placeholder={FIELD_PLACEHOLDERS[field]}
              value={inputs[field]}
              onChange={v => setInputs(p => ({ ...p, [field]: v }))}
              progress={progress[field]}
              cleansed={cleansed[field]}
            />
          ))}
        </div>
        <div className="mt-6">
          <button
            onClick={handleScrubAll}
            disabled={!scrubReady}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
          >
            {busy ? 'De-identifying…' : 'De-identify all fields'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold mb-4">3. Send to Aigents</h2>
        {configs.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            No Aigents configs available. An admin needs to add one in the{' '}
            <a href="/admin" className="text-blue-600 dark:text-blue-400 hover:underline">admin page</a>.
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Aigents config</span>
              <select
                value={selectedConfigId}
                onChange={e => setSelectedConfigId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {configs.map((c: { _id: string; name: string; default_chain_title?: string }) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.default_chain_title ? ` → ${c.default_chain_title}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">Chain title (optional override)</span>
              <input
                type="text"
                value={chainTitleOverride}
                onChange={e => setChainTitleOverride(e.target.value)}
                placeholder={configs.find((c: { _id: string; default_chain_title?: string }) => c._id === selectedConfigId)?.default_chain_title || 'chain_title'}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
            <button
              onClick={handleSendToAigents}
              disabled={!sendReady}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
            >
              {busy ? 'Sending…' : 'Send cleansed payload to Aigents'}
            </button>
            {forwardResult && (
              <div className={`text-sm rounded-md p-3 ${
                forwardResult.ok
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'
              }`}>
                {forwardResult.ok
                  ? <>Triggered chain run <code className="font-mono">{forwardResult.chain_run_id || '(no id returned)'}</code>. Check the Aigents UI for results.</>
                  : <>Failed: {forwardResult.error}</>}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function presetNameFor(policy: PhiPolicy): string {
  for (const [name, preset] of Object.entries(PRESETS)) {
    if (OPTIONAL_CATEGORIES.every(c => preset.redact[c] === policy.redact[c])) return name;
  }
  return 'custom';
}

function fieldStatsFor(
  field: FieldKey,
  inputs: Record<FieldKey, string>,
  cleansed: Record<FieldKey, string>,
  progress: Record<FieldKey, FieldProgress>
) {
  return {
    original_chars: inputs[field].length,
    cleansed_chars: cleansed[field].length,
    chunks: progress[field].chunksTotal,
    redactions: progress[field].redactions
  };
}

function FieldInput({
  field, label, placeholder, value, onChange, progress, cleansed
}: {
  field: FieldKey;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  progress: FieldProgress;
  cleansed: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={`field-${field}`} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        <span className="text-xs text-zinc-500">
          {value.length.toLocaleString()} chars · ~{Math.ceil(value.length / 4).toLocaleString()} tokens
          {progress.status !== 'pending' && (
            <> · {progress.status === 'completed' ? 'done' : `${progress.chunksDone}/${progress.chunksTotal} chunks`}</>
          )}
          {progress.redactions > 0 && <> · {progress.redactions} redactions</>}
        </span>
      </div>
      <textarea
        id={`field-${field}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-800"
      />
      {cleansed && (
        <details className="mt-2">
          <summary className="text-xs text-zinc-500 cursor-pointer">Show cleansed output ({cleansed.length.toLocaleString()} chars)</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-zinc-50 dark:bg-zinc-800 p-3 text-xs">{cleansed}</pre>
        </details>
      )}
    </div>
  );
}
