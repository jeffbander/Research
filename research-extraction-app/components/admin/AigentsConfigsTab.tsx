'use client';

import { useState } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface Config {
  _id: string;
  name: string;
  webhook_url: string;
  auth_type: 'none' | 'bearer' | 'basic';
  default_chain_title?: string;
  default_folder_id?: string;
  description?: string;
  is_active: boolean;
  variables: { notes: string; procedures: string; labs: string };
}

const blankForm = {
  name: '',
  webhook_url: '',
  auth_type: 'bearer' as 'none' | 'bearer' | 'basic',
  auth_token: '',
  default_chain_title: '',
  default_folder_id: '',
  description: '',
  is_active: true,
  variables_notes: 'notes_cleansed',
  variables_procedures: 'procedures_cleansed',
  variables_labs: 'labs_cleansed'
};

export default function AigentsConfigsTab() {
  const configs = (useQuery(api.aigentsConfigs.list) ?? []) as Config[];
  const create = useAction(api.aigentsConfigsAdmin.create);
  const update = useAction(api.aigentsConfigsAdmin.update);
  const remove = useAction(api.aigentsConfigsAdmin.remove);

  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadIntoForm(c: Config) {
    setEditingId(c._id);
    setForm({
      name: c.name,
      webhook_url: c.webhook_url,
      auth_type: c.auth_type,
      auth_token: '',
      default_chain_title: c.default_chain_title ?? '',
      default_folder_id: c.default_folder_id ?? '',
      description: c.description ?? '',
      is_active: c.is_active,
      variables_notes: c.variables.notes,
      variables_procedures: c.variables.procedures,
      variables_labs: c.variables.labs
    });
  }

  function reset() {
    setEditingId(null);
    setForm(blankForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const variables = {
        notes: form.variables_notes,
        procedures: form.variables_procedures,
        labs: form.variables_labs
      };
      const base = {
        name: form.name,
        webhook_url: form.webhook_url,
        auth_type: form.auth_type,
        default_chain_title: form.default_chain_title || undefined,
        default_folder_id: form.default_folder_id || undefined,
        description: form.description || undefined,
        is_active: form.is_active,
        variables
      };
      if (editingId) {
        await update({
          id: editingId as never,
          ...base,
          ...(form.auth_token ? { auth_token: form.auth_token } : {})
        } as never);
      } else {
        await create({
          ...base,
          ...(form.auth_token ? { auth_token: form.auth_token } : {})
        } as never);
      }
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this Aigents config?')) return;
    setBusy(true);
    try { await remove({ id: id as never }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-3">Active configs</h3>
        {configs.length === 0 ? (
          <div className="text-sm text-zinc-500">None yet — create one below.</div>
        ) : (
          <div className="space-y-2">
            {configs.map(c => (
              <div key={c._id} className="rounded-md border border-zinc-200 dark:border-zinc-800 p-4 flex items-start justify-between gap-4">
                <div className="text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-zinc-500 font-mono break-all">{c.webhook_url}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {c.auth_type} · chain: {c.default_chain_title || '(none)'} · vars: {c.variables.notes}, {c.variables.procedures}, {c.variables.labs}
                  </div>
                  {c.description && <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{c.description}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadIntoForm(c)}
                    className="text-xs px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c._id)}
                    disabled={busy}
                    className="text-xs px-2 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-base font-semibold mb-3">
          {editingId ? 'Edit config' : 'Create new config'}
        </h3>
        <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
          <Field label="Name (unique)">
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Webhook URL">
            <input type="url" required value={form.webhook_url} onChange={e => setForm({ ...form, webhook_url: e.target.value })} placeholder="https://aigents.example.com/webhook" />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Auth type">
              <select value={form.auth_type} onChange={e => setForm({ ...form, auth_type: e.target.value as typeof form.auth_type })}>
                <option value="none">none</option>
                <option value="bearer">bearer</option>
                <option value="basic">basic</option>
              </select>
            </Field>
            <Field label={editingId ? 'Auth token (leave blank to keep current)' : 'Auth token'}>
              <input type="password" value={form.auth_token} onChange={e => setForm({ ...form, auth_token: e.target.value })} autoComplete="new-password" />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Default chain title">
              <input type="text" value={form.default_chain_title} onChange={e => setForm({ ...form, default_chain_title: e.target.value })} />
            </Field>
            <Field label="Default folder ID">
              <input type="text" value={form.default_folder_id} onChange={e => setForm({ ...form, default_folder_id: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div>
            <div className="text-xs text-zinc-500 mb-2">
              Variable names sent to Aigents (the chain reads these from <code>starting_variables</code>):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Notes variable">
                <input type="text" required value={form.variables_notes} onChange={e => setForm({ ...form, variables_notes: e.target.value })} />
              </Field>
              <Field label="Procedures variable">
                <input type="text" required value={form.variables_procedures} onChange={e => setForm({ ...form, variables_procedures: e.target.value })} />
              </Field>
              <Field label="Labs variable">
                <input type="text" required value={form.variables_labs} onChange={e => setForm({ ...form, variables_labs: e.target.value })} />
              </Field>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            Active
          </label>
          {error && <div className="text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:bg-zinc-300"
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create config'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="mt-1 [&>input]:block [&>input]:w-full [&>input]:rounded-md [&>input]:border [&>input]:border-zinc-300 [&>input]:bg-white [&>input]:px-3 [&>input]:py-2 [&>input]:text-sm [&>input]:dark:border-zinc-700 [&>input]:dark:bg-zinc-800 [&>select]:block [&>select]:w-full [&>select]:rounded-md [&>select]:border [&>select]:border-zinc-300 [&>select]:bg-white [&>select]:px-3 [&>select]:py-2 [&>select]:text-sm [&>select]:dark:border-zinc-700 [&>select]:dark:bg-zinc-800">
        {children}
      </div>
    </label>
  );
}
