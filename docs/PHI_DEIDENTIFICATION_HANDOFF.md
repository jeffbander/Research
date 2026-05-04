# Bulk Local PHI De-Identification → Aigents Handoff

> Reference architecture for a future build in the lab's research-app repo. This memo is the architectural plan so the lab can implement it when the time comes.

---

## Context

The lab has multiple apps that need to send clinical text to outside models (Claude, GPT, Gemini, specialized medical models) for deeper analysis — summarization, hypothesis generation, structured extraction, etc. Sending raw PHI to those models is a HIPAA non-starter and requires BAAs the lab does not always have. The newly-shipped `/demos/local-ai` page proves the technique works for single notes (~1.5 pages, ~7K chars). The goal is to extend this to **bulk workloads — up to ~100 pages of PHI in a single paste — and then forward the cleansed payload to an Aigents chain via webhook.**

The intended outcome: the research app gets a single page where a researcher pastes a long document or set of notes, sees them cleansed in real time without leaving the browser, and one-clicks "Send to Aigents" to trigger downstream analysis chains. Zero PHI ever transits a server.

---

## The user's session, in plain English

1. Researcher opens `/tools/deident-bulk` in the research app.
2. Page initializes a local Llama 3.2 model in the browser via WebGPU (~30-60s first time, instant on return visits via IndexedDB cache).
3. Researcher pastes anywhere from one paragraph to ~100 pages of clinical text into a textarea.
4. Page splits the input into chunks the model can handle, scrubs each chunk, stitches the cleansed output back together with consistent placeholders across the whole document.
5. A live progress UI shows chunks-completed / total, current throughput, and estimated time remaining.
6. When done, researcher reviews the result, optionally edits the Aigents webhook URL + chain title + auth token, and clicks "Send to Aigents" — payload POSTs to Aigents, which routes to whatever chain the lab has configured (e.g. `extract_phenotypes`, `generate_summary`, `hypothesize_drug_targets`).
7. Researcher can also export an audit log (JSON) recording every chunk processed, redaction counts per chunk, model version, hash of input, hash of output, timestamps. Useful for IRB documentation.

---

## Three-stage pipeline

```
┌──────────────┐    ┌────────────────────┐    ┌──────────────────────┐
│ 1. INGEST    │ →  │ 2. CLEANSE LOCALLY │ →  │ 3. HANDOFF TO AIGENTS │
│ paste text   │    │ chunk → scrub →    │    │ POST cleansed         │
│ + capacity   │    │   stitch +         │    │ payload to webhook    │
│   meter      │    │ identifier map     │    │ (configurable URL)    │
└──────────────┘    └────────────────────┘    └──────────────────────┘
        │                    │                          │
        └────────────────────┴──────────────────────────┘
                             ↓
                    Audit log (downloadable JSON)
                    PHI never leaves browser
```

---

## Stage 1: Ingestion

**Component:** `BulkInput.tsx`

- Single large textarea (paste-only for v1).
- Live "Document size" meter: total chars, estimated total tokens, estimated chunk count (e.g. *"187,420 chars · ~52,000 tokens · will be processed as 28 chunks"*).
- Hard ceiling at ~500K chars (~140K tokens, ~150 pages) just to prevent runaway memory use. Soft warning at 100 pages.
- Synthetic-data warning banner identical to the one already on `/demos/local-ai`.
- "Load sample bulk document" button with a synthetic 30-page mock chart for first-time users (build one fixture file similar to today's `sample-notes.ts`).

**Reuse from MSWLab.ai:** the `CapacityMeter.tsx` pattern, but remove the per-chunk cap and surface total-document stats.

---

## Stage 2: Local cleansing — the actual hard part

### 2a. Chunking strategy

The 4096-token context window means each chunk can carry **at most ~1700 tokens of input** (after system prompt + output reservation). New module: `lib/document-chunker.ts`.

Chunking algorithm:

1. Split input on **double-newline paragraph boundaries** first (most clinical text has clear paragraph breaks: HPI, PMH, Meds, etc.).
2. If a paragraph alone exceeds the budget, fall back to **sentence-level splitting** (regex: `/(?<=[.!?])\s+(?=[A-Z])/`).
3. If a sentence alone exceeds the budget (rare — long lists), split on commas or word boundaries with a hard char limit.
4. **Greedy-pack** chunks: keep adding paragraphs/sentences to the current chunk until adding the next one would exceed ~1500 tokens (give 200 tokens of slack vs the 1700 ceiling).
5. **Overlap tail (~150 tokens)**: prepend the last ~600 chars of the previous chunk to the next chunk so the model has cross-boundary context. This costs ~10% more tokens but dramatically improves consistency on relationships ("her son", "the patient's wife").

### 2b. Cross-chunk identifier consistency

The non-obvious challenge: **the same person needs to redact to the same placeholder across chunks.** If "John Sample" appears in chunk 3 and "John" appears in chunk 17, both need to become `[NAME-1]`, not `[NAME]` and `[NAME]` independently.

Two-pass approach:

**Pass A — Discovery pass** (uses the small 1B model, fast):
- Process all chunks with the standard PHI-scrub prompt.
- After each chunk, parse out every `[CATEGORY: discovered-text]` redaction the model emitted (modify the prompt to include the original text inside the bracket, e.g. `[NAME: John Sample]`).
- Build a `Map<originalText, canonicalPlaceholder>` keyed by category. First "John Sample" gets `[NAME-1]`, first MRN gets `[MRN-1]`, etc.
- Skip output stitching during this pass — discovery only.

**Pass B — Final scrub pass** (uses the 3B model for quality, OR reuses pass A output):
- Re-process chunks (or use pass A output), but pre-seed the system prompt with: *"The following identifiers have already been assigned: [NAME-1] = John Sample; [NAME-2] = Sarah Sample; [MRN-1] = 88112233. When you encounter these or obvious references to them ('the patient', 'her son', 'his wife'), use the same placeholder."*
- This handles the relationship problem regex never can.

**Simpler v1 alternative**: skip pass A. Just append a running identifier dictionary to the system prompt as chunks complete. Less accurate but ships faster. Recommended for v1.

### 2c. Streaming progress UI

**Component:** `BulkProgress.tsx`

- Per-chunk status row: pending / in-progress (with current throughput tok/s) / completed (with redaction count).
- Top-line aggregate: `Chunk 7 of 28 · 142 redactions so far · 18 min remaining`.
- Cancel button that calls `engine.interruptGenerate()` and stops the chunk loop.
- Pause/resume support — useful when the user needs to switch tabs without losing progress (the engine remains warm in memory).

### 2d. Stitching

**Module:** `lib/stitch-output.ts`

- Concatenate per-chunk outputs.
- De-duplicate the overlap tail: if chunk N ended with `...patient was discharged.` and chunk N+1's overlap starts with `patient was discharged. Follow-up...`, drop the duplicated prefix.
- Final output preserves original paragraph structure (the chunker tagged paragraph boundaries; restore them).

---

## Stage 3: Aigents handoff

### 3a. Webhook config UI

**Component:** `AigentsHandoff.tsx`

Fields (persisted in `localStorage` so the researcher doesn't re-enter every session):
- **Webhook URL** (text input) — the Aigents-side endpoint
- **Auth type** (None / Bearer / Basic — matches the Aigents `create_webhook` schema)
- **Auth token** (password input)
- **Chain title** (text input) — passed as a payload field; Aigents routes to the chain matching this title
- **Folder ID** (optional) — for chain-run organization in Aigents
- **User email** (text input, defaulted to logged-in user)

### 3b. Payload schema

Designed to map directly onto Aigents' `start_chain_run` shape (per the MCP tool contract: `chain_title`, `user_email`, `first_step_user_input`, `starting_variables`, `source_name`, `source_id`, `folder_id`).

```json
{
  "source_name": "research_app_deident",
  "source_id": "<UUID generated client-side>",
  "user_email": "researcher@example.com",
  "chain_title": "<configured chain name>",
  "folder_id": "<optional>",
  "first_step_user_input": "<full cleansed document text>",
  "starting_variables": {
    "deident_meta": {
      "doc_id": "<UUID>",
      "original_chars": 187420,
      "cleansed_chars": 184110,
      "chunk_count": 28,
      "model_used": "Llama-3.2-3B-Instruct-q4f16_1-MLC",
      "model_version": "0.2.83",
      "redaction_categories": { "NAME": 47, "DATE": 132, "MRN": 4, "PHONE": 12, "LOCATION": 18 },
      "input_sha256": "<hash>",
      "output_sha256": "<hash>",
      "scrubbed_at": "2026-05-04T14:23:01Z",
      "elapsed_ms": 1043200,
      "user_agent_gpu": "<from navigator.gpu adapter info>"
    }
  }
}
```

The `deident_meta` block is what makes this trustworthy downstream — Aigents chains can verify the source, the model version, the redaction surface area, and (with a stored-elsewhere expected-hash) prove the payload wasn't tampered with after cleansing.

### 3c. The actual POST

```ts
await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(authType === 'Bearer' && { Authorization: `Bearer ${authToken}` }),
    ...(authType === 'Basic'  && { Authorization: `Basic ${authToken}` }),
  },
  body: JSON.stringify(payload),
});
```

Show the response (chain run ID) in the UI so the researcher can click through to Aigents to watch the chain execute.

### 3d. Audit log export

**Component:** `AuditLog.tsx`

After every cleansing run, expose a "Download audit log" button that writes a JSON file containing every chunk's input-hash, output-hash, redaction count by category, timestamp, and the per-chunk `[CATEGORY: original]` discovery map (the dictionary that proves what was actually redacted). **Important compliance note: the original-text dictionary is sensitive — by default omit it from the export and require explicit "include sensitive dictionary" toggle.**

---

## Hardware reality — honest matrix

The 1B model fits anywhere modern; the 3B model needs ~4 GB VRAM. Throughput numbers below are field-ish estimates; **actual perf will vary**. "100-page" means ~250K chars / ~70K input tokens, processed as ~40 chunks of ~1700 tokens each.

| Hardware                                  | 1B works? | 3B works? | 1B throughput | 3B throughput | 100-page time (1B) | 100-page time (3B) |
|-------------------------------------------|-----------|-----------|---------------|---------------|--------------------|--------------------|
| MacBook Air M1 (8 GB)                     | yes       | tight     | 35-50 tok/s   | 15-25 tok/s   | ~12 min            | ~25 min            |
| MacBook Pro M1 Pro/Max (16 GB+)           | yes       | yes       | 50-70 tok/s   | 25-40 tok/s   | ~8 min             | ~15 min            |
| MacBook Pro M3/M4 Pro/Max                 | yes       | yes       | 80-120 tok/s  | 40-70 tok/s   | ~5 min             | ~9 min             |
| Windows + RTX 3060 (12 GB)                | yes       | yes       | 60-90 tok/s   | 30-50 tok/s   | ~7 min             | ~13 min            |
| Windows + RTX 4070+ (12 GB+)              | yes       | yes       | 100-150 tok/s | 50-80 tok/s   | ~4 min             | ~8 min             |
| Windows / Linux integrated GPU (Iris Xe)  | yes       | no        | 10-20 tok/s   | n/a           | ~30 min            | n/a                |
| Windows + older GTX 1060 (6 GB)           | yes       | tight     | 30-50 tok/s   | 10-20 tok/s   | ~12 min            | ~30 min            |
| iPad Pro M2/M4                            | partial   | no        | varies        | n/a           | likely too slow    | n/a                |
| iPhone / Android                          | no        | no        | n/a           | n/a           | not viable         | not viable         |
| Chromebook (low-end)                      | no        | no        | n/a           | n/a           | not viable         | not viable         |

**Recommendation:** the research app should auto-detect (the existing `src/lib/webgpu-detect.ts` `recommendModel()` already does this via `maxBufferSize >= 2GB` proxy). Default to 3B on capable hardware, 1B otherwise, with a manual override. **For 100-page workloads, encourage users on any laptop ≥ M1 Pro / RTX 3060 to stick with 3B for quality — the extra time is worth it because regex-baseline misses too much narrative PHI.**

---

## Reusable code — lift these from the MSWLab.ai repo

When implementing in the research-app repo, copy these files verbatim or with minor edits:

| File in MSWLab.ai repo                                  | Purpose                                                            | Changes needed for research app |
|---------------------------------------------------------|--------------------------------------------------------------------|---------------------------------|
| `src/lib/webgpu-detect.ts`                              | WebGPU detection + model recommendation                            | None — port as-is               |
| `src/lib/webllm-client.ts`                              | MLCEngine wrapper + streaming chat                                 | Add per-chunk loop helper       |
| `src/lib/text-stats.ts`                                 | Token estimator + capacity math                                    | None — port as-is               |
| `src/lib/phi-scrub-prompt.ts`                           | HIPAA Safe Harbor system prompt                                    | Modify to emit `[CAT: text]` for the discovery pass |
| `src/hooks/useWebGPUInfo.ts`                            | React hook for capability detection                                | None — port as-is               |
| `src/hooks/useWebLLMEngine.ts`                          | React hook for engine lifecycle                                    | Add bulk-mode generate that takes `chunks[]` |
| `src/components/local-ai/SystemDetectionCard.tsx`       | UI for WebGPU detection                                            | Style to research-app theme     |
| `src/components/local-ai/ModelLoader.tsx`               | Model picker + progress UI                                         | Style only                      |
| `src/components/local-ai/CapacityMeter.tsx`             | Live token/budget meter                                            | Adapt for total-document stats  |
| `src/components/local-ai/CopyButton.tsx`                | Clipboard copy with confirm state                                  | None — port as-is               |
| `src/components/local-ai/RedactionStream.tsx`           | Framer Motion redaction animation                                  | Optional — useful for review pane |

**Key infra setting**: the research app's deploy needs CSP exemptions for WebLLM (matches the `/demos/*` CSP block in `netlify.toml`):
- `script-src` must include `'wasm-unsafe-eval'`
- `connect-src` must include `https://huggingface.co https://*.huggingface.co https://raw.githubusercontent.com`
- `worker-src 'self' blob:`

---

## New code to write (research-app repo)

| New file                                | Purpose                                                                |
|-----------------------------------------|------------------------------------------------------------------------|
| `lib/document-chunker.ts`               | Paragraph→sentence→word fallback splitter, greedy-pack with overlap   |
| `lib/identifier-map.ts`                 | `Map<original, canonicalPlaceholder>` accumulated across chunks       |
| `lib/stitch-output.ts`                  | Concatenate chunk outputs, de-dup overlap, restore paragraph breaks   |
| `lib/audit-log.ts`                      | Build + serialize audit JSON; SHA-256 hashes via SubtleCrypto         |
| `lib/aigents-payload.ts`                | Build the JSON payload matching Aigents `start_chain_run` schema      |
| `lib/aigents-client.ts`                 | POST to webhook URL with configurable auth                            |
| `components/BulkInput.tsx`              | Large paste textarea + total-doc capacity meter                       |
| `components/BulkProgress.tsx`           | Per-chunk progress rows, cancel/pause/resume                          |
| `components/ReviewPane.tsx`             | Side-by-side: original-with-overlay vs cleansed; toggle dictionary    |
| `components/AigentsHandoff.tsx`         | Webhook URL + auth + chain title form, "Send" button                  |
| `components/AuditLog.tsx`               | Download audit JSON; toggle to include/exclude sensitive dictionary   |
| `pages/DeidentBulk.tsx`                 | Top-level page, orchestrates the three stages                         |

---

## Verification plan

End-to-end smoke test for the research-app implementation:

1. **WebGPU sanity** — open page on M1 MacBook in Chrome → System Check shows "Supported, ~3.6 GB max buffer", recommends 3B model. Repeat on iPhone → shows "WebGPU not available, paste-only fallback" or graceful refusal.
2. **Single-chunk path** — paste 1 page (~3K chars) → 1 chunk → cleanses in < 60s on M1. Verify output has no obvious PHI leaks via `grep -E '\d{3}-\d{3}-\d{4}'`.
3. **Multi-chunk consistency** — paste a synthetic 10-page doc that mentions "John Sample" 12 times across 4 paragraphs. Confirm all 12 instances become `[NAME-1]` (not 12 different `[NAME]`). Same for MRN, etc.
4. **100-page stress test** — use a 250K-char synthetic fixture. Time it on M1 Pro and confirm < 20 min. Confirm memory stays under 6 GB (Activity Monitor). Confirm cancel button actually stops processing within ~2s.
5. **Aigents handoff** — set up a test Aigents chain that just echoes `first_step_user_input`. Click "Send to Aigents" → confirm chain run starts → confirm the echo matches what was cleansed locally byte-for-byte.
6. **Audit log integrity** — download the audit JSON. Verify `output_sha256` matches `sha256(cleansed_text)`. Verify `redaction_categories` counts match what `countRedactions()` reports on the cleansed text.
7. **Network tab proof** — DevTools Network tab during cleansing should show ZERO requests after the model+wasm shards finish downloading. The only POST should be the explicit "Send to Aigents" call at the end.
8. **Offline test** — disconnect wifi mid-document → cleansing continues uninterrupted → reconnect before sending to Aigents (or queue the send for when connection returns).

---

## Out of scope for v1 — defer until proven needed

- File uploads (.docx, .pdf, .txt) — paste-only for v1
- OCR for scanned-image PDFs — separate problem, separate library (tesseract.js)
- Browser-to-browser federated multi-user chunking
- Custom-trained PHI model fine-tuned on the lab's text style
- Streaming-back from Aigents while it processes — out of this page's scope; researcher checks Aigents UI for chain run output
- Saving cleansed payloads in the browser between sessions — explicitly avoid this; the whole point is data leaves only on the user's deliberate "Send" action
- Multi-language clinical text — Llama 3.2 handles English well; non-English clinical text is a separate evaluation
- Rate-limiting / quotas — local inference is free, no need

---

## Open questions for the implementer

1. **Discovery-pass tradeoff**: ship v1 with the simpler running-dictionary approach (faster to build, ~85% consistency) or do the full two-pass discovery (slower to build, ~98% consistency)? Recommend v1 = simple, v2 = two-pass.
2. **Aigents chain contract**: does the lab want one canonical `deident_handoff` chain that downstream chains chain off of, or should each calling app pick its own chain? Recommend canonical entry-point chain that fans out.
3. **Webhook auth storage**: localStorage is convenient but persists the bearer token in plain text. Acceptable for an internal-only research app behind Clerk, but worth noting. Alternative: re-prompt for token each session.
4. **3B model + 100 pages on a slow laptop**: 25-30 min is a long time to leave a tab open. Should the page support **detached background processing** via a Service Worker so the user can keep using the rest of the app? Adds complexity; defer to v2 unless researchers complain.
5. **Larger context model**: WebLLM ships Llama-3.2 at 4K context per the MLC override. Self-hosting a custom MLC build at 16K-32K context would let chunks be 4-8x bigger and dramatically reduce cross-chunk consistency problems. Worth considering for v2.

---

## Configurable PHI policy

The current scrubber over-redacts because the prompt is open-ended ("redact anything that could identify a patient"). Replace it with an enumerated, user-configurable policy: a small floor of always-redacted categories, and everything else as a toggle.

**Floor (locked, always redacted):** Patient name, DOB, SSN.
**Optional (user toggles):** MRN, provider/doctor names, visit dates, phone, email, address, ages > 89, account/device IDs, relative names, employer, URLs/IPs, biometric IDs, photo refs, other unique IDs.

Presets:
- `safe_harbor` — every optional category on. Output is HIPAA Safe Harbor compliant.
- `internal_research` — preserve MRN, provider names, visit dates for record linkage; redact everything else. Output is NOT Safe Harbor.
- `minimal` — only the locked floor. For workflows where the lab needs maximum context and has IRB coverage.

### Types and prompt builder

```ts
// lib/phi-policy.ts

/** Categories that are ALWAYS redacted. Not user-configurable. */
export const LOCKED_CATEGORIES = ['PATIENT_NAME', 'DOB', 'SSN'] as const;

/** Categories the user can choose to preserve or redact. */
export const OPTIONAL_CATEGORIES = [
  'MRN',
  'PROVIDER_NAME',
  'VISIT_DATE',
  'PHONE',
  'EMAIL',
  'ADDRESS',
  'AGE_OVER_89',
  'ACCOUNT_NUMBER',
  'DEVICE_ID',
  'RELATIVE_NAME',
  'EMPLOYER_NAME',
  'URL_OR_IP',
  'BIOMETRIC_ID',
  'FACIAL_PHOTO_REF',
  'OTHER_UNIQUE_ID',
] as const;

export type LockedCategory = typeof LOCKED_CATEGORIES[number];
export type OptionalCategory = typeof OPTIONAL_CATEGORIES[number];
export type PhiCategory = LockedCategory | OptionalCategory;

export interface PhiPolicy {
  /** Map of optional category -> whether to redact it. Locked cats are implicit. */
  redact: Record<OptionalCategory, boolean>;
  /** Free-form notes the user wants in the audit log (e.g. "IRB #2024-118"). */
  notes?: string;
}

export const PRESETS: Record<string, PhiPolicy> = {
  safe_harbor: {
    redact: Object.fromEntries(OPTIONAL_CATEGORIES.map(c => [c, true])) as PhiPolicy['redact'],
  },
  internal_research: {
    redact: {
      MRN: false,
      PROVIDER_NAME: false,
      VISIT_DATE: false,
      PHONE: true, EMAIL: true, ADDRESS: true, AGE_OVER_89: true,
      ACCOUNT_NUMBER: true, DEVICE_ID: true, RELATIVE_NAME: true,
      EMPLOYER_NAME: true, URL_OR_IP: true, BIOMETRIC_ID: true,
      FACIAL_PHOTO_REF: true, OTHER_UNIQUE_ID: true,
    },
  },
  minimal: {
    redact: Object.fromEntries(OPTIONAL_CATEGORIES.map(c => [c, false])) as PhiPolicy['redact'],
  },
};

export function isSafeHarborCompliant(policy: PhiPolicy): boolean {
  return OPTIONAL_CATEGORIES.every(c => policy.redact[c]);
}
```

```ts
// lib/phi-scrub-prompt.ts

import { LOCKED_CATEGORIES, OPTIONAL_CATEGORIES, PhiPolicy } from './phi-policy';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  PATIENT_NAME: "the patient's full name, first name, last name, nicknames, initials",
  DOB:          "date of birth in any format",
  SSN:          "Social Security Numbers in any format",
  MRN:          "medical record numbers, chart numbers, patient IDs",
  PROVIDER_NAME:"names of physicians, nurses, and other clinical staff (Dr., NP, PA, RN)",
  VISIT_DATE:   "admission, discharge, encounter, procedure, and follow-up dates",
  PHONE:        "telephone and fax numbers",
  EMAIL:        "email addresses",
  ADDRESS:      "street addresses, cities, ZIP codes (any geographic detail finer than state)",
  AGE_OVER_89:  "ages 90 and above (replace with 'over 89')",
  ACCOUNT_NUMBER:"health plan, account, certificate, and license numbers",
  DEVICE_ID:    "device serial numbers, implant identifiers",
  RELATIVE_NAME:"names of family members, household members, employers' contacts",
  EMPLOYER_NAME:"names of the patient's employer",
  URL_OR_IP:    "web URLs and IP addresses tied to the patient",
  BIOMETRIC_ID: "fingerprints, voiceprints, retina scans",
  FACIAL_PHOTO_REF:"references to identifying photos",
  OTHER_UNIQUE_ID:"any other unique identifier or code",
};

export function buildSystemPrompt(policy: PhiPolicy): string {
  const toRedact = [
    ...LOCKED_CATEGORIES,
    ...OPTIONAL_CATEGORIES.filter(c => policy.redact[c]),
  ];
  const toPreserve = OPTIONAL_CATEGORIES.filter(c => !policy.redact[c]);

  const redactList = toRedact
    .map(c => `- [${c}] — ${CATEGORY_DESCRIPTIONS[c]}`)
    .join('\n');

  const preserveList = toPreserve.length
    ? toPreserve.map(c => `- ${CATEGORY_DESCRIPTIONS[c]}`).join('\n')
    : '(none — redact everything listed above)';

  return `You are a PHI redaction tool. Process the user's clinical text and return it with ONLY the following categories replaced by bracketed placeholders.

REDACT these categories (replace with [CATEGORY-N] placeholders, numbered consistently):
${redactList}

PRESERVE these verbatim — do NOT redact, do NOT alter:
${preserveList}

Rules:
1. Only redact categories listed in REDACT above. Do not invent new categories.
2. Output the full text with substitutions in place. Preserve all formatting, line breaks, and clinical content.
3. Use stable numbering: the first patient name encountered is [PATIENT_NAME-1], second distinct person is [PATIENT_NAME-2], etc.
4. If a category in PRESERVE could arguably be PHI in some other context, still preserve it — the user has explicitly opted in.
5. Do not add commentary. Output only the transformed text.`;
}
```

### Audit log fields the policy adds

```ts
auditLog.policy = {
  preset: presetName,                              // 'safe_harbor' | 'internal_research' | 'minimal' | 'custom'
  is_safe_harbor: isSafeHarborCompliant(policy),
  redacted_categories: [...LOCKED_CATEGORIES, ...optionalRedacted],
  preserved_categories: optionalPreserved,
  notes: policy.notes,
};
```

When `is_safe_harbor: false`, the UI should display a persistent banner ("Output is NOT Safe Harbor compliant — appropriate only for internal research with IRB coverage") and the Aigents handoff payload should carry the same flag so downstream chains can refuse to treat it as publishable.

### Settings UI

`components/settings/PhiPolicyPanel.tsx`:
- Preset selector (radio group): Safe Harbor / Internal Research / Minimal / Custom.
- For each optional category: a toggle row showing the description and current state. Selecting any custom value flips the preset to "Custom."
- Notes textarea (e.g. for IRB #).
- Live preview pane that shows the rebuilt system prompt so power users can verify what the model will be told.
- Save button writes to localStorage and rebuilds the engine's system prompt on next chunk.

---

## Where this gets built

When the time comes:
- Lift the files from the table above out of the MSWLab.ai repo
- Build the new components in the research-app's existing component conventions
- Wire to the research app's Clerk-equivalent auth (so it's lab-internal)
- Configure Aigents webhook URLs per environment (dev / staging / prod chains)
- Add the deploy-time CSP entries
