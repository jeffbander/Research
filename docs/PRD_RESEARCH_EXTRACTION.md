# PRD: Research Extraction — Local PHI De-Identification + Aigents Webhook Handoff

**Status:** v1 spec, ready to build.
**Reference implementation:** `jeffbander/research` branch `claude/phi-deidentification-handoff-bxsZm`, directory `research-extraction-app/`.

---

## 1. Mission

Build a single web page where a researcher pastes three large blocks of clinical text (Notes, Procedures, Laboratory Results), the browser de-identifies all three locally using a WebGPU-hosted Llama 3.2 model, and then forwards the cleansed strings to a configured Aigents chain via webhook. **PHI never leaves the browser before redaction.** The bearer token authenticating to Aigents lives server-side and is never exposed to the browser.

---

## 2. Why this exists

The lab needs to send clinical text to outside models (Claude / GPT / specialized medical models running in Aigents chains) for analysis. Sending raw PHI to those models is a HIPAA non-starter without BAAs. Browser-side de-identification with a local LLM lets researchers do the analysis without ever transmitting identifiable patient data to a third-party endpoint. The cleansed data still includes everything analytically interesting (clinical narrative, lab values, imaging findings) — just with names, DOBs, and other identifiers redacted.

---

## 3. User personas

- **Researcher** — pastes data, picks a PHI policy, triggers de-identification, sends to Aigents. Doesn't manage configs.
- **Admin** — creates Aigents webhook configurations (URL + bearer token + variable names), manages PHI policies, listed in `CLERK_ADMIN_USER_IDS`.

---

## 4. End-to-end user flow

1. User signs in via Clerk.
2. Page loads Llama-3.2-3B in the browser via WebGPU. ~2 GB download on first visit, cached in IndexedDB on subsequent visits.
3. User picks a PHI policy preset. Default: `internal_research` (patient name + DOB + SSN redacted; MRN, provider names, visit dates preserved). Optionally loads a saved policy or toggles per-category overrides.
4. User pastes text into three labeled textareas:
   - **Notes** — chart records, history, narrative (may include narrative labs)
   - **Procedures** — echocardiograms, CT, MRI reports
   - **Laboratory Results** — discrete lab values
5. User clicks "De-identify all fields." For each field, the browser chunks the text (~1500-token chunks, ~600-char overlap), runs each chunk through Llama 3.2 with a system prompt enumerating exactly which categories to redact and which to preserve, and stitches the output. A **shared `IdentifierMap` instance** spans all three fields, so "John Sample" becomes the same `[PATIENT_NAME-1]` in Notes, Procedures, and Labs.
6. The browser writes an audit record (input/output SHA-256 hashes, redaction counts per category, model version, policy snapshot) to Convex.
7. User picks an Aigents config from the admin-curated list and clicks "Send to Aigents." Browser invokes a Convex Node-runtime action; the action decrypts the stored bearer token, posts the payload to the configured webhook with the auth header attached server-side, captures the returned `chain_run_id`, and back-links it onto the audit record.
8. UI shows the `chain_run_id` as confirmation; user checks the Aigents UI for results. **No streaming back** — fire and forget.

---

## 5. Functional requirements

### 5.1 The page (`/research-extraction`)

- Auth-gated. Unauthenticated users redirect to `/sign-in`.
- Top bar: page title + admin link (visible only if caller is admin) + Clerk `<UserButton>`.
- Sections (top to bottom):
  - **Synthetic-data warning banner** — "Synthetic / authorized research data only."
  - **PHI Policy selector** — preset dropdown, optional saved-policy dropdown, expandable per-category checkboxes, live "Safe Harbor / NOT Safe Harbor" badge.
  - **Section 1: Load the local model** — button → Llama loads with progress bar; resolves to "Model ready" or error.
  - **Section 2: Paste source text** — three textareas with character + token counts and per-field progress (chunks done / redactions). "Load synthetic demo data" button populates all three with shared-patient fixtures. "De-identify all fields" button runs the scrub.
  - **Section 3: Send to Aigents** — config dropdown, optional chain-title override, "Send" button, success/failure banner with `chain_run_id`.

### 5.2 The admin page (`/admin`)

- Gated to users in `CLERK_ADMIN_USER_IDS`. Non-admins see a clear "Forbidden" message with their Clerk user ID for self-service request.
- Two tabs:
  - **Aigents configs** — list / create / edit / delete. Form covers: name (unique), webhook URL, auth type (none/bearer/basic), auth token (write-only on edit), default chain title, default folder ID, three Aigents variable names (notes/procedures/labs), active flag, free-text description.
  - **PHI policies** — list / create / edit / delete. Preset shortcuts (Safe Harbor / Internal Research / Minimal) populate the per-category checkboxes; custom toggles allowed. Live "Safe Harbor" badge updates as you toggle.

### 5.3 Cross-field identifier consistency

The same person, MRN, or provider across the three fields must redact to the same numbered placeholder. Achieved via a single `IdentifierMap` instance shared across all three fields' scrubbing. The model emits `[CATEGORY: original-text]` markers; post-processing consolidates by exact-match (case-insensitive, whitespace-normalized) on the `original-text` portion within a category.

### 5.4 Synthetic data fixture

`generateSyntheticChart({ pages?, seed? })` returns `{ notes, procedures, labs, meta }` for a deterministic fictional patient. All three reference the same patient so the cross-field consolidation is exercised. Notes include encounter narratives. Procedures include echocardiogram / CT / MRI report templates. Labs include CBC / CMP / lipid panel structured output.

---

## 6. Non-functional requirements

### 6.1 Security

- **Bearer tokens are encrypted at rest** with AES-256-GCM. Plaintext format: `iv(12) || tag(16) || ciphertext`, base64-encoded. Encryption key from `DEIDENT_ENCRYPTION_KEY` env (32 random bytes, base64).
- The token field is `auth_token_encrypted` on the schema. Queries that the browser can call return the document **without** that field. Only Node-runtime actions read it (via internal queries) and only inside the action, never sent back to the client.
- Auth: Clerk + JWT bridge to Convex. Every Convex function asserts `requireUserId(ctx)`; admin operations also assert `requireAdmin(ctx)` against `CLERK_ADMIN_USER_IDS`.
- CSP on `/research-extraction` allows WebLLM (`'wasm-unsafe-eval'`, Hugging Face hosts, blob workers).

### 6.2 Performance

- 3B model on a modern laptop: ~25-50 tok/s. A 100-page document (~70K input tokens, ~40 chunks) should cleanse in well under 20 minutes.
- Sequential per-field scrubbing for v1; chunks within a field are sequential (engine isn't truly concurrent). Parallelism is a v2 enhancement.
- Production Next.js build: all routes compile, no type errors. The `/research-extraction` bundle is large (~2 MB) due to WebLLM client; this is acceptable.

### 6.3 Hosting

- **Vercel** for the Next.js app.
- **Convex** for database + functions (no Mongo, no separate API tier).
- **Clerk** for auth.
- Build command: `npx convex deploy --cmd 'npm run build'` so every Vercel deploy pushes the latest Convex schema/functions.

---

## 7. Tech stack — locked in

- Next.js 14 (App Router) + TypeScript + Tailwind
- Convex
- Clerk (`@clerk/nextjs`)
- `@mlc-ai/web-llm`

Browser ↔ Convex via `useQuery` / `useMutation` / `useAction`. **Do not add Next.js API routes.**

---

## 8. Data model (Convex schema)

```ts
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const fieldStats = v.object({
  original_chars: v.number(),
  cleansed_chars: v.number(),
  chunks: v.number(),
  redactions: v.number()
});

export default defineSchema({
  aigentsConfigs: defineTable({
    name: v.string(),
    webhook_url: v.string(),
    auth_type: v.union(v.literal('none'), v.literal('bearer'), v.literal('basic')),
    auth_token_encrypted: v.optional(v.string()),
    default_chain_title: v.optional(v.string()),
    default_folder_id: v.optional(v.string()),
    description: v.optional(v.string()),
    is_active: v.boolean(),
    variables: v.object({
      notes: v.string(),       // default 'notes_cleansed'
      procedures: v.string(),  // default 'procedures_cleansed'
      labs: v.string()         // default 'labs_cleansed'
    }),
    created_by: v.optional(v.string())
  })
    .index('by_name', ['name'])
    .index('by_active', ['is_active']),

  deidentAudits: defineTable({
    doc_id: v.string(),
    user_id: v.string(),
    fields: v.object({ notes: fieldStats, procedures: fieldStats, labs: fieldStats }),
    combined: v.object({
      input_sha256: v.string(),
      output_sha256: v.string(),
      redaction_categories: v.record(v.string(), v.number())
    }),
    model_used: v.string(),
    elapsed_ms: v.number(),
    policy: v.object({
      preset: v.string(),
      is_safe_harbor: v.boolean(),
      redacted_categories: v.array(v.string()),
      preserved_categories: v.array(v.string()),
      notes: v.optional(v.string())
    }),
    aigents_config_id: v.optional(v.string()),
    aigents_chain_run_id: v.optional(v.string()),
    aigents_chain_title: v.optional(v.string()),
    aigents_forwarded_at: v.optional(v.number()),
    scrubbed_at: v.number()
  }).index('by_user', ['user_id', 'scrubbed_at']),

  phiPolicies: defineTable({
    name: v.string(),
    preset: v.union(
      v.literal('safe_harbor'),
      v.literal('internal_research'),
      v.literal('minimal'),
      v.literal('custom')
    ),
    redact: v.record(v.string(), v.boolean()),
    notes: v.optional(v.string()),
    irb_protocol: v.optional(v.string()),
    is_active: v.boolean(),
    created_by: v.optional(v.string())
  }).index('by_active', ['is_active'])
});
```

---

## 9. Convex function surface

| Function | Kind | Who | Purpose |
|---|---|---|---|
| `aigentsConfigs.list` | query | user | List active configs (no tokens) |
| `aigentsConfigs.get` | query | user | Get one config (no token) |
| `aigentsConfigs.insertInternal` | internalMutation | — | Used by admin actions |
| `aigentsConfigs.patchInternal` | internalMutation | — | Used by admin actions |
| `aigentsConfigs.deleteInternal` | internalMutation | — | Used by admin actions |
| `aigentsConfigs.getWithTokenInternal` | internalQuery | — | Used by `forward.send` |
| `aigentsConfigsAdmin.create` | action (`"use node"`) | admin | Encrypt token, then insertInternal |
| `aigentsConfigsAdmin.update` | action (`"use node"`) | admin | Encrypt new token if provided, then patchInternal |
| `aigentsConfigsAdmin.remove` | action | admin | deleteInternal |
| `audits.create` | mutation | user | Persist a cleansing event |
| `audits.listForUser` | query | user | List the caller's audit records |
| `audits.linkChainRunInternal` | internalMutation | — | Used by `forward.send` |
| `policies.list` | query | user | List active policies + meta (locked/optional category lists) |
| `policies.create` | mutation | admin | New PHI policy |
| `policies.update` | mutation | admin | Edit |
| `policies.remove` | mutation | admin | Delete |
| `users.me` | query | any | Returns `{ id, email, name, isAdmin }` or null |
| `forward.send` | action (`"use node"`) | user | Decrypt token, POST to webhook, link chain run id back to audit |

---

## 10. PHI policy model

```ts
// lib/phi-policy.ts
export const LOCKED_CATEGORIES = ['PATIENT_NAME', 'DOB', 'SSN'] as const;

export const OPTIONAL_CATEGORIES = [
  'MRN', 'PROVIDER_NAME', 'VISIT_DATE', 'PHONE', 'EMAIL', 'ADDRESS',
  'AGE_OVER_89', 'ACCOUNT_NUMBER', 'DEVICE_ID', 'RELATIVE_NAME',
  'EMPLOYER_NAME', 'URL_OR_IP', 'BIOMETRIC_ID', 'FACIAL_PHOTO_REF',
  'OTHER_UNIQUE_ID'
] as const;

export const PRESETS = {
  safe_harbor:       { redact: <every-optional-true> },
  internal_research: { redact: { MRN: false, PROVIDER_NAME: false, VISIT_DATE: false, /* rest true */ } },
  minimal:           { redact: <every-optional-false> }
};

export const isSafeHarborCompliant = (p) =>
  OPTIONAL_CATEGORIES.every(c => p.redact[c]);
```

---

## 11. PHI scrub system prompt

The model is instructed to emit `[CATEGORY: original-text]` markers; the `IdentifierMap` consolidates them after scrubbing.

```
You are a PHI redaction tool. Process the user's clinical text and return it with ONLY the following categories replaced.

REDACT these categories. Replace each occurrence with [CATEGORY: original-text] so the original is preserved inside the bracket exactly as it appeared:
- [PATIENT_NAME] — the patient's full name, first name, last name, nicknames, initials
- [DOB] — date of birth in any format
- [SSN] — Social Security Numbers in any format
{...for each redact:true category, with description}

PRESERVE these verbatim — do NOT redact, do NOT alter:
- {description for each preserve category}

Rules:
1. Only redact categories listed in REDACT above. Do not invent new categories.
2. Output the FULL text with substitutions in place. Preserve all formatting, line breaks, headers, bullets, and clinical content.
3. The bracket format is exactly [CATEGORY: original-text] — single space after the colon, original text verbatim including capitalization.
4. If a value spans categories (e.g. a date that is also a DOB), use the most specific (DOB).
5. Do not add commentary, prefaces, or summaries. Output only the transformed text.
```

---

## 12. Local de-identification algorithm

### 12.1 Chunking (`lib/chunker.ts`)

Token estimate: `Math.ceil(s.length / 4)`. Target chunk size: ~1500 tokens. Overlap tail: ~600 chars.

1. If `estimateTokens(text) <= 1500`, return one chunk.
2. Split on `\n\s*\n` (paragraph boundaries).
3. For each paragraph that exceeds the budget, split on `(?<=[.!?])\s+(?=[A-Z])` (sentences).
4. For sentences still too long, hard-split at character boundaries (`tokens * 4` chars).
5. Greedy-pack units into chunks until adding the next would exceed ~1500 tokens.
6. After packing, prepend `chunk[N-1].slice(-600)` to `chunk[N]` as overlap context.

### 12.2 IdentifierMap (`lib/identifier-map.ts`)

```ts
const MARKER_RE = /\[([A-Z_]+):\s*([^\]]+?)\]/g;

class IdentifierMap {
  applyTo(text: string): string {
    return text.replace(MARKER_RE, (_, category, original) => {
      const key = `${category}::${original.trim().toLowerCase()}`;
      let placeholder = this.mapping.get(key);
      if (!placeholder) {
        const n = (this.counters.get(category) ?? 0) + 1;
        this.counters.set(category, n);
        placeholder = `[${category}-${n}]`;
        this.mapping.set(key, placeholder);
        // also record this.discovered for counts() and dictionary()
      }
      return placeholder;
    });
  }
  counts(): Record<string, number>; // distinct originals per category
  totalRedactions(): number;
}
```

A single instance is created per scrub session and used for all three fields.

### 12.3 Stitching (`lib/stitch.ts`)

For each pair of adjacent chunk outputs `(a, b)`, find the longest suffix of `a` that's a prefix of `b` (search window ~800 chars), then append `b.slice(overlap)` to the running result. Drops the duplicated overlap context.

### 12.4 Engine + scrubField (`lib/scrub-engine.ts`)

```ts
import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm';

let engineSingleton: MLCEngine | null = null;

export async function loadEngine(opts?): Promise<MLCEngine> {
  if (engineSingleton) return engineSingleton;
  engineSingleton = await CreateMLCEngine('Llama-3.2-3B-Instruct-q4f16_1-MLC', {
    initProgressCallback: opts?.onProgress
  });
  return engineSingleton;
}

export async function scrubField(
  engine, field, rawText, identifierMap, policy, onProgress
): Promise<{ field, cleansed, chunks, redactions }> {
  const chunks = chunkText(rawText);
  const systemPrompt = buildSystemPrompt(policy);
  const outputs: string[] = [];
  for (const chunk of chunks) {
    const completion = await engine.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: chunk.text }],
      temperature: 0,
      max_tokens: 2000,
      stream: false
    });
    const raw = completion.choices[0]?.message?.content ?? '';
    outputs.push(identifierMap.applyTo(raw));
    onProgress?.({ field, status: 'in_progress', chunksTotal: chunks.length, chunksDone: outputs.length, redactions: identifierMap.totalRedactions() });
  }
  return { field, cleansed: stitchChunks(outputs), chunks: chunks.length, redactions: identifierMap.totalRedactions() };
}
```

---

## 13. Aigents handoff contract

The browser invokes `useAction(api.forward.send)` with:

```ts
{
  config_id: Id<'aigentsConfigs'>,
  audit_id?: Id<'deidentAudits'>,
  payload: {
    source_name: 'research_extraction',
    source_id: <audit_id or generated uuid>,
    chain_title: <override OR config.default_chain_title>,
    first_step_user_input: 'Process patient extraction',
    starting_variables: {
      [config.variables.notes]:      cleansed.notes,
      [config.variables.procedures]: cleansed.procedures,
      [config.variables.labs]:       cleansed.labs
    }
  }
}
```

The action:
1. Fetches the config via `getWithTokenInternal`.
2. Decrypts `auth_token_encrypted`.
3. POSTs to `webhook_url` with `Authorization: Bearer <token>` (or `Basic`).
4. Parses response for `chain_run_id` / `run_id` / `id`.
5. If `audit_id` present, calls `audits.linkChainRunInternal` to set `aigents_config_id`, `aigents_chain_run_id`, `aigents_chain_title`, `aigents_forwarded_at`.
6. Returns `{ success, status, chain_run_id, data }` to the browser.

**Variable names are configurable per AigentsConfig** so existing chains plug in their own naming without code changes.

---

## 14. Encryption (`convex/lib/encryption.ts`)

```ts
'use node';
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const KEY = () => Buffer.from(process.env.DEIDENT_ENCRYPTION_KEY!, 'base64');

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const c  = crypto.createCipheriv(ALGO, KEY(), iv);
  const enc = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const d = crypto.createDecipheriv(ALGO, KEY(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
}
```

Used only inside files marked `"use node"` (currently `aigentsConfigsAdmin.ts` and `forward.ts`).

---

## 15. Auth bridge

- Clerk dashboard → JWT Templates → create one named exactly `convex`. Copy its **Issuer URL**.
- `convex/auth.config.ts`:

```ts
export default {
  providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN!, applicationID: 'convex' }]
};
```

- `components/Providers.tsx`:

```tsx
'use client';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function Providers({ children }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

- `convex/lib/auth.ts`:

```ts
export async function requireUserId(ctx): Promise<string> {
  const id = await ctx.auth.getUserIdentity();
  if (!id) throw new Error('Unauthorized');
  return id.subject;
}
export function isAdmin(uid: string): boolean {
  return (process.env.CLERK_ADMIN_USER_IDS || '').split(',').map(s => s.trim()).includes(uid);
}
export async function requireAdmin(ctx): Promise<string> {
  const uid = await requireUserId(ctx);
  if (!isAdmin(uid)) throw new Error('Forbidden');
  return uid;
}
```

---

## 16. CSP + Webpack (`next.config.js`)

```js
module.exports = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
  async headers() {
    return [{
      source: '/research-extraction',
      headers: [{
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
          "connect-src 'self' https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com https://*.clerk.accounts.dev https://*.clerk.com",
          "img-src 'self' data: https://*.clerk.com",
          "style-src 'self' 'unsafe-inline'",
          "worker-src 'self' blob:",
          "font-src 'self' data:"
        ].join('; ')
      }]
    }];
  }
};
```

---

## 17. Environment variables

| Var | Where to set | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Vercel + `.env.local` | Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Vercel + `.env.local` | Clerk client SDK |
| `CLERK_SECRET_KEY` | Vercel + `.env.local` | Clerk server SDK |
| `CONVEX_DEPLOY_KEY` | Vercel | Lets Vercel build push Convex schema |
| `DEIDENT_ENCRYPTION_KEY` | **Convex dashboard** | 32 random bytes, base64. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `CLERK_JWT_ISSUER_DOMAIN` | **Convex dashboard** | Issuer URL from Clerk's `convex` JWT template |
| `CLERK_ADMIN_USER_IDS` | **Convex dashboard** | Comma-separated Clerk user IDs allowed to manage configs/policies |

---

## 18. Setup steps

1. `npx create-next-app@latest research-extraction --typescript --tailwind --app --no-src-dir --eslint --import-alias "@/*"`
2. `cd research-extraction && npm install convex @clerk/nextjs @mlc-ai/web-llm`
3. Write all files per the layout in Section 19.
4. `npx convex dev` (one time — interactive, creates the deployment, generates `convex/_generated/`, pushes schema, runs in watch mode).
5. In Convex dashboard, set `DEIDENT_ENCRYPTION_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_ADMIN_USER_IDS`.
6. In Clerk dashboard, create a JWT template named `convex` and copy the Issuer URL into the Convex env above.
7. Copy `.env.example` → `.env.local`, fill in Clerk + Convex URLs.
8. `npm run dev` → http://localhost:3000 → sign up.
9. Grab your Clerk user ID, add it to `CLERK_ADMIN_USER_IDS` in Convex.
10. Visit `/admin` → create your first AigentsConfig with the lab's webhook URL + bearer token.
11. Visit `/research-extraction` → "Load synthetic demo data" → "De-identify all fields" → "Send to Aigents".
12. Verify a chain run appears in the Aigents UI.

For Vercel deploy:
- Build Command: `npx convex deploy --cmd 'npm run build'`
- Add the four `NEXT_PUBLIC_*` and Vercel env vars.

---

## 19. File layout

```
research-extraction/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── middleware.ts                 # Clerk middleware; public: /sign-in*, /sign-up*
├── convex.json                   # { "functions": "convex/", "generateCommonJSApi": false }
├── .env.example
├── .gitignore                    # node_modules, .next, .convex
├── README.md
├── app/
│   ├── layout.tsx                # wraps in <Providers>
│   ├── globals.css
│   ├── page.tsx                  # redirects to /research-extraction
│   ├── sign-in/[[...sign-in]]/page.tsx
│   ├── sign-up/[[...sign-up]]/page.tsx
│   ├── research-extraction/page.tsx
│   └── admin/page.tsx
├── components/
│   ├── Providers.tsx             # ClerkProvider + ConvexProviderWithClerk
│   ├── HeaderNav.tsx             # nav + conditional Admin link
│   ├── ResearchExtractionApp.tsx # the orchestrator
│   ├── PolicySelector.tsx        # preset + saved + per-category toggles
│   └── admin/
│       ├── AdminPanel.tsx        # admin gate + tabs
│       ├── AigentsConfigsTab.tsx
│       └── PhiPoliciesTab.tsx
├── lib/
│   ├── chunker.ts
│   ├── identifier-map.ts
│   ├── stitch.ts
│   ├── phi-policy.ts             # LOCKED + OPTIONAL + PRESETS + types
│   ├── phi-scrub-prompt.ts       # buildSystemPrompt(policy)
│   ├── scrub-engine.ts           # loadEngine + scrubField (uses WebLLM)
│   ├── synthetic-chart.ts        # generateSyntheticChart()
│   └── hash.ts                   # SHA-256 via SubtleCrypto
└── convex/
    ├── schema.ts
    ├── auth.config.ts
    ├── aigentsConfigs.ts         # queries + internal mutations (pure)
    ├── aigentsConfigsAdmin.ts    # "use node"; actions that encrypt
    ├── audits.ts                 # mutation + query + internal linkChainRun
    ├── policies.ts               # queries + admin-gated mutations
    ├── forward.ts                # "use node"; decrypt + fetch + linkback
    ├── users.ts                  # me() returns { id, email, name, isAdmin }
    └── lib/
        ├── auth.ts               # requireUserId / requireAdmin
        └── encryption.ts         # AES-256-GCM
```

---

## 20. Acceptance criteria

- [ ] `npm run build` exits 0 with all routes prerendered. Use a properly-formatted dummy Clerk publishable key for prerender: ```pk_test_$(node -e "process.stdout.write(Buffer.from('clerk.example.com\$').toString('base64'))")```.
- [ ] `/research-extraction` requires auth; `/admin` rejects non-admins with a clear message and shows their Clerk user ID.
- [ ] "Load synthetic demo data" populates all three textareas with same-patient synthetic content.
- [ ] "De-identify all fields" produces output containing markers like `[PATIENT_NAME-1]`, `[DOB-1]`, etc. The same person renders to the same number across Notes / Procedures / Labs.
- [ ] AigentsConfig.auth_token_encrypted in the Convex dashboard is base64 ciphertext, not plaintext (verify by inspecting the document).
- [ ] "Send to Aigents" fires the upstream webhook with `Authorization: Bearer <plaintext>` (decrypted server-side); the cleansed payload is byte-identical to what the page produced.
- [ ] Returned `chain_run_id` is shown in the UI and back-linked onto the audit record.
- [ ] DevTools Network tab during scrubbing shows zero outbound requests other than: Hugging Face (model download, only on first load), Clerk (auth tokens), and the Convex deployment URL.
- [ ] Admin can create / edit / delete AigentsConfigs and PHI policies entirely from the UI — no CLI required.
- [ ] PHI policy switcher on `/research-extraction` shows live "Safe Harbor" badge that updates as categories are toggled.

---

## 21. Out of scope (v1)

- File uploads (.pdf, .docx) — paste-only
- OCR for scanned image PDFs
- Two-pass discovery scrub for higher cross-chunk consistency (single-pass running-dictionary is sufficient for v1; ~85% consistency)
- Streaming results back from Aigents — fire-and-forget
- Multi-language clinical text — Llama 3.2 + English only
- Per-user PHI policy default (uses session-level selection)
- Audit-log viewer page (data is queryable via `audits.listForUser`, no UI yet)
- Rate limiting (Convex's natural action limits suffice)
- Service worker for tab-detached background processing

---

## 22. Verification plan

1. **WebGPU sanity** — open the page in Chrome on an M1+ MacBook. Model loads to "ready" state.
2. **Single-chunk smoke test** — paste 1 page (~3K chars) into Notes, click De-identify, confirm output has no obvious PHI patterns left in the Notes redacted categories.
3. **Cross-field consistency** — paste a 5-page synthetic document mentioning the same patient name in all three fields. Confirm the same `[PATIENT_NAME-1]` placeholder is used in all three cleansed outputs.
4. **Long-text stress** — paste ~50K chars per field (~150K total). Confirm completion in under 15 minutes on M1 Pro and memory stays under 6 GB.
5. **Aigents handoff** — set up a test Aigents chain that echoes `notes_cleansed`. Click Send to Aigents. Confirm the chain run appears in Aigents UI with the byte-identical cleansed text.
6. **Audit integrity** — query `audits.listForUser` after a scrub. Verify `combined.output_sha256` matches `sha256(cleansed.notes + '\n---\n' + cleansed.procedures + '\n---\n' + cleansed.labs)`.
7. **Token security** — open Convex dashboard, find the AigentsConfig record, confirm `auth_token_encrypted` is unreadable base64.
8. **Network proof** — DevTools Network tab during scrubbing shows zero outbound requests (after the model is cached). The only POSTs should be the explicit Send to Aigents click and the audits.create mutation.

---

## 23. Reference implementation

See `jeffbander/research`, branch `claude/phi-deidentification-handoff-bxsZm`, directory `research-extraction-app/`. Use it for cross-checking exact code shapes — but write the new build fresh against this PRD rather than copying verbatim, so you understand each piece.
