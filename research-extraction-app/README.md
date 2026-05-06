# Research Extraction

Next.js app for browser-side PHI de-identification with Aigents handoff.
The page at `/research-extraction` accepts three pasted fields (Notes,
Procedures, Laboratory Results), de-identifies them locally via WebGPU +
Llama 3.2, then triggers a configured Aigents chain run with the
cleansed text. PHI never reaches a server.

## Stack

- Next.js 14 (App Router) on Vercel
- Convex for the database, server functions, and external HTTP calls
- Clerk for auth (bridged to Convex via JWT)
- @mlc-ai/web-llm for in-browser inference

There are no Next.js API routes. The browser calls Convex queries,
mutations, and actions directly via `useQuery` / `useMutation` / `useAction`.

## First-time setup

1. **Clerk** — create an application at https://dashboard.clerk.com.
   - Copy `Publishable Key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Copy `Secret Key` → `CLERK_SECRET_KEY`
   - In **JWT Templates**, create a template named exactly `convex`.
     Copy the **Issuer URL** for `CLERK_JWT_ISSUER_DOMAIN` (e.g.
     `https://moving-coyote-12.clerk.accounts.dev`).
2. **Convex** — sign up at https://dashboard.convex.dev.
3. **Encryption key** — generate one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_*` and
   Clerk values. Leave Convex-side env vars for step 6.
5. `npm install`
6. **Bootstrap Convex** (one time):
   ```bash
   npm run convex:dev
   ```
   This logs you in, creates a deployment, generates `convex/_generated/`,
   pushes the schema, and runs in watch mode. Leave it running. Then in
   the Convex dashboard for that deployment, set environment variables:
   - `DEIDENT_ENCRYPTION_KEY` — from step 3
   - `CLERK_JWT_ISSUER_DOMAIN` — from step 1
   - `CLERK_ADMIN_USER_IDS` — your Clerk user ID (after first sign-in,
     comma-separated for multiple admins)
7. In a second terminal: `npm run dev` → http://localhost:3000

## Vercel deploy

1. Push this directory to GitHub.
2. **Vercel** → Import the repo.
   - **Root Directory** = `research-extraction-app` (if monorepo)
   - **Build Command** = `npx convex deploy --cmd 'npm run build'`
     (so Convex pushes the latest schema/functions on every Vercel build)
3. In Vercel **Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `CONVEX_DEPLOY_KEY` (from Convex dashboard → Deployment Settings)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
4. Convex-side env vars (`DEIDENT_ENCRYPTION_KEY`,
   `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_ADMIN_USER_IDS`) live in the
   Convex dashboard, not Vercel.
5. Deploy. After your first sign-in, grab your Clerk user ID and add
   it to `CLERK_ADMIN_USER_IDS` in Convex.

## Creating an AigentsConfig

After bootstrap, run the action from the Convex dashboard
(Functions → `aigentsConfigsAdmin:create`) or via the CLI:

```bash
npx convex run aigentsConfigsAdmin:create '{
  "name": "default",
  "webhook_url": "https://aigents.example.com/webhook",
  "auth_type": "bearer",
  "auth_token": "<your-bearer-token>",
  "default_chain_title": "research_extraction_chain"
}'
```

The token is encrypted with AES-256-GCM before being written to the
database (the action runs in Node runtime to access `crypto`).

## Convex function map

| Function                                   | Kind              | Who   | Purpose |
| ------------------------------------------ | ----------------- | ----- | ------- |
| `aigentsConfigs.list`                      | query             | user  | List active configs (no tokens) |
| `aigentsConfigs.get`                       | query             | user  | Get one config (no token) |
| `aigentsConfigsAdmin.create`               | action (Node)     | admin | Create a config; encrypts token |
| `aigentsConfigsAdmin.update`               | action (Node)     | admin | Update a config; re-encrypts on token change |
| `aigentsConfigsAdmin.remove`               | action            | admin | Delete a config |
| `audits.create`                            | mutation          | user  | Persist a cleansing event |
| `audits.listForUser`                       | query             | user  | List the caller's audit records |
| `policies.list`                            | query             | user  | List PHI policies + LOCKED/OPTIONAL category lists |
| `forward.send`                             | action (Node)     | user  | Decrypt token, POST cleansed payload to Aigents, link chain run |
| `aigentsConfigs.*Internal`, `audits.linkChainRunInternal` | internal | —     | Helpers used only by actions |

## Aigents chain contract

The page sends a single payload to `forward.send` (Convex action), which
posts to the AigentsConfig's `webhook_url`. The shape:

```json
{
  "source_name": "research_extraction",
  "source_id": "<audit_id or uuid>",
  "chain_title": "<from config or override>",
  "first_step_user_input": "Process patient extraction",
  "starting_variables": {
    "<config.variables.notes>":      "<cleansed Notes>",
    "<config.variables.procedures>": "<cleansed Procedures>",
    "<config.variables.labs>":       "<cleansed Labs>"
  }
}
```

Variable names are configurable per AigentsConfig record so existing
chains plug in their own variable names without code changes.

## How the de-identification works

1. The page loads Llama 3.2 3B via WebGPU. ~2 GB download on first
   visit, cached in IndexedDB after that.
2. For each of the three fields, the text is split into ~1500-token
   chunks with a ~600-char overlap tail.
3. Each chunk is scrubbed with a system prompt that enumerates exactly
   which PHI categories to redact and which to preserve. The default
   preset is `internal_research` — patient name + DOB + SSN redacted;
   MRN, provider names, and visit dates preserved.
4. The model outputs `[CATEGORY: original-text]` markers; a shared
   `IdentifierMap` walks all three fields and consolidates each unique
   value to a stable `[CATEGORY-N]` placeholder, so "John Sample" in
   Notes and Procedures becomes the same `[PATIENT_NAME-1]`.
5. Output chunks are stitched with overlap-aware deduplication.
6. An audit record is created via `audits.create` with input/output
   SHA-256 hashes and per-category redaction counts.
7. On Send to Aigents, the cleansed strings + audit id flow into
   `forward.send`. The action decrypts the bearer token (read inside
   the Convex Node runtime, never exposed to the browser), posts to
   the configured webhook, and writes the returned chain_run_id back
   onto the audit record.

## Why Convex (vs the previous Mongo + REST API design)

- One backend instead of two (no Next.js API routes, no Mongoose
  bootstrap, no Atlas connection caching)
- Auth bridge to Clerk is built-in via `ConvexProviderWithClerk`
- Reactive queries — UI auto-updates when an admin adds an AigentsConfig
- Bearer token never leaves the Convex Node runtime, encryption stays
  on the function side
- Schema validation is enforced by Convex at the function boundary
