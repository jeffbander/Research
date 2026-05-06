# Research Extraction

Next.js app for browser-side PHI de-identification with Aigents handoff.
The page at `/research-extraction` accepts three pasted fields (Notes,
Procedures, Laboratory Results), de-identifies them locally via WebGPU +
Llama 3.2, then forwards the cleansed payload to a configured Aigents
chain. PHI never reaches a server.

## Stack

- Next.js 14 (App Router) on Vercel
- Clerk for auth
- MongoDB Atlas (Mongoose) for AigentsConfig + DeidentAudit + PhiPolicy
- @mlc-ai/web-llm for in-browser inference

## First-time setup

1. **Clerk** — create a project at https://dashboard.clerk.com. Copy
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
2. **MongoDB Atlas** — create a free M0 cluster, add a database user, add
   `0.0.0.0/0` to the network access list (or Vercel's egress IPs). Copy
   the connection string.
3. **Encryption key** — generate one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
4. Copy `.env.example` to `.env.local` and fill in the values.
5. `npm install`
6. Seed an AigentsConfig:
   ```bash
   AIGENTS_WEBHOOK_URL=https://aigents.example.com/webhook \
   AIGENTS_TOKEN=<your-bearer-token> \
   AIGENTS_CHAIN_TITLE=research_extraction_chain \
   npm run seed:aigents
   ```
7. `npm run dev` → http://localhost:3000

## Vercel deploy

1. Push this directory to a GitHub repo (or set Root Directory =
   `research-extraction-app` if deploying the whole monorepo).
2. Add the env vars from `.env.example` to Vercel's project settings.
3. Add your Clerk user ID to `CLERK_ADMIN_USER_IDS` so you can manage
   AigentsConfigs without seeding.
4. Deploy. The first user to sign in becomes a regular user; admins are
   only those listed in `CLERK_ADMIN_USER_IDS`.

## API surface

All routes require auth. Admin = listed in `CLERK_ADMIN_USER_IDS`.

| Method | Path                                  | Who    | Purpose |
| ------ | ------------------------------------- | ------ | ------- |
| POST   | `/api/deident/audit`                  | user   | Persist a cleansing event |
| GET    | `/api/deident/audit`                  | user   | List the caller's audit records |
| GET    | `/api/deident/aigents-configs`        | user   | List active configs (no tokens) |
| GET    | `/api/deident/aigents-configs/:id`    | user   | Get one config (no token) |
| POST   | `/api/deident/aigents-configs`        | admin  | Create a config (token encrypted at rest) |
| PUT    | `/api/deident/aigents-configs/:id`    | admin  | Update a config |
| DELETE | `/api/deident/aigents-configs/:id`    | admin  | Delete a config |
| GET    | `/api/deident/policies`               | user   | List PHI policies + LOCKED/OPTIONAL category lists |
| POST   | `/api/deident/forward`                | user   | Forward a cleansed payload to Aigents (server attaches stored token) |

## Aigents chain contract

The page sends to `/api/deident/forward`, which posts to the AigentsConfig's
`webhook_url`. The payload is shaped to match Aigents `start_chain_run`:

```json
{
  "source_name": "research_extraction",
  "source_id": "<uuid>",
  "chain_title": "<from config or override>",
  "first_step_user_input": "Process patient extraction",
  "starting_variables": {
    "<config.variables.notes>":      "<cleansed Notes>",
    "<config.variables.procedures>": "<cleansed Procedures>",
    "<config.variables.labs>":       "<cleansed Labs>"
  }
}
```

The variable names are configurable per AigentsConfig record so existing
chains can plug in whatever variable names they already use.

## How the de-identification works

1. The page loads Llama 3.2 3B (q4f16_1) via WebGPU. ~2 GB download on
   first visit, cached in IndexedDB after that.
2. For each of the three fields, the text is split into ~1500-token
   chunks with a ~600-char overlap tail.
3. Each chunk is scrubbed with a system prompt that enumerates exactly
   which PHI categories to redact and which to preserve. The current
   default preset is `internal_research` — patient name + DOB + SSN
   redacted; MRN, provider names, and visit dates preserved.
4. The model outputs `[CATEGORY: original-text]` markers; a shared
   `IdentifierMap` walks all three fields and consolidates each unique
   value to a stable `[CATEGORY-N]` placeholder. So "John Sample" in
   Notes and Procedures becomes the same `[PATIENT_NAME-1]`.
5. Output chunks are stitched with overlap-aware deduplication.
6. An audit record is POSTed to `/api/deident/audit` with input/output
   SHA-256 hashes, redaction counts per category, and the policy
   snapshot.
7. On Send to Aigents, the cleansed strings + metadata are posted to
   `/api/deident/forward`. The server attaches the bearer token (decrypted
   from Mongo) and posts to the configured webhook. Returned chain run
   ID is shown in the UI and back-linked onto the audit record.

## What is NOT in v1

- Per-user PHI policy override UI (uses the hardcoded `internal_research`
  preset; backend supports policy CRUD already, just no UI yet)
- Discovery-pass two-pass scrubbing for higher cross-chunk consistency
- Streaming results back from Aigents — check the Aigents UI for output
- File uploads (paste-only)
- Multi-language clinical text
