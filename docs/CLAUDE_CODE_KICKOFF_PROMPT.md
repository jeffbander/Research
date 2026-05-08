# Claude Code kickoff prompt

Paste everything below the line into a fresh Claude Code session in the target repo.

---

## What I want you to build

A Next.js + Convex + Clerk web application called **Research Extraction**. The page at `/research-extraction` accepts three large text inputs (clinical Notes, imaging Procedures, Laboratory Results), de-identifies all three locally in the browser via a WebGPU-hosted Llama 3.2 model, and forwards the cleansed strings to a configured Aigents chain via webhook. The bearer token for the webhook lives encrypted in Convex and is never exposed to the browser. Auth is Clerk-gated; admins manage Aigents webhook configs and PHI policies through an `/admin` page.

The complete spec is the PRD I'm pasting in my next message. Read it end to end before writing any code.

## Stack — locked in

- Next.js 14 (App Router) + TypeScript + Tailwind
- Convex (DB + server functions; no Next.js API routes)
- `@clerk/nextjs` for auth, bridged to Convex via JWT template named `convex`
- `@mlc-ai/web-llm` for in-browser inference

Browser ↔ Convex through `useQuery` / `useMutation` / `useAction` only.

## Build order — milestones

Treat each milestone as a checkpoint. Run `npm run build` after each one and don't proceed until it's green. Commit at each milestone with a clear message.

1. **Scaffold + deps.** `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --eslint --import-alias "@/*"` then `npm install convex @clerk/nextjs @mlc-ai/web-llm`. Add `convex.json`, `next.config.js` with the CSP block + `asyncWebAssembly`, `middleware.ts` (Clerk), `.env.example`, `.gitignore` (include `.convex/`).
2. **Stack-agnostic libs.** Write `lib/phi-policy.ts`, `lib/phi-scrub-prompt.ts`, `lib/chunker.ts`, `lib/identifier-map.ts`, `lib/stitch.ts`, `lib/hash.ts`, `lib/synthetic-chart.ts`. Pure TypeScript, no React, no Convex deps.
3. **Convex layer.** `convex/schema.ts`, `convex/auth.config.ts`, `convex/lib/auth.ts`, `convex/lib/encryption.ts`, `convex/users.ts`, `convex/aigentsConfigs.ts`, `convex/aigentsConfigsAdmin.ts` (`"use node"`), `convex/audits.ts`, `convex/policies.ts`, `convex/forward.ts` (`"use node"`). Don't run `npx convex dev` yet — write stub `convex/_generated/{server,dataModel,api}.ts` files (use `anyApi` from `convex/server` for the api stub, derive `DataModel` from `schema`, import `GenericId` from `convex/values` not `convex/server`). The user runs `npx convex dev` later to overwrite stubs.
4. **App shell + auth.** `app/layout.tsx` (wraps in `<Providers>`), `components/Providers.tsx` (`ClerkProvider` + `ConvexProviderWithClerk`), `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`, `app/page.tsx` (redirect to `/research-extraction`), `components/HeaderNav.tsx`. Build check: all routes prerender with dummy Clerk keys.
5. **Scrub engine.** `lib/scrub-engine.ts` exporting `loadEngine` (singleton MLCEngine) and `scrubField` (chunk → run → consolidate via shared `IdentifierMap` → stitch). Marked `'use client'`.
6. **Main page.** `app/research-extraction/page.tsx` + `components/ResearchExtractionApp.tsx` + `components/PolicySelector.tsx`. Three textareas, model loader, "Load synthetic demo data" button, "De-identify all fields" button, "Send to Aigents" section. Wire to `useQuery(api.aigentsConfigs.list)`, `useMutation(api.audits.create)`, `useAction(api.forward.send)`.
7. **Admin pages.** `app/admin/page.tsx` + `components/admin/AdminPanel.tsx` (gates via `useQuery(api.users.me)`, shows tabs) + `AigentsConfigsTab.tsx` + `PhiPoliciesTab.tsx`. Full CRUD on both.
8. **README.** Setup steps for Clerk JWT template, Convex bootstrap (`npx convex dev`), env vars (NEXT_PUBLIC_* in Vercel; DEIDENT_ENCRYPTION_KEY + CLERK_JWT_ISSUER_DOMAIN + CLERK_ADMIN_USER_IDS in **Convex**, not Vercel), Vercel build command (`npx convex deploy --cmd 'npm run build'`).

## Build-check incantation

The Next.js prerender step needs valid-format Clerk keys to compile. Use:

```bash
DUMMY_PK="pk_test_$(node -e "process.stdout.write(Buffer.from('clerk.example.com\$').toString('base64'))")"
DUMMY_SK="sk_test_$(node -e "process.stdout.write(Buffer.from('dummy_secret').toString('base64'))")"
NEXT_PUBLIC_CONVEX_URL=https://example.convex.cloud \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$DUMMY_PK" \
  CLERK_SECRET_KEY="$DUMMY_SK" \
  npm run build
```

Expected output: 6 routes (`/`, `/_not-found`, `/admin`, `/research-extraction`, `/sign-in/...`, `/sign-up/...`), no type errors, `/research-extraction` ~2 MB (WebLLM client is heavy — that's fine).

## Conventions

- Default to no comments. Add one only when the *why* is non-obvious.
- Tailwind classes inline; no separate CSS modules unless a file gets unwieldy.
- After each milestone, commit with a single-line summary. Don't bundle milestones into one giant commit.
- Don't add features I didn't ask for (no audit-log viewer page, no file upload, no rate limiting, no streaming-back-from-Aigents — all explicitly out of scope per the PRD).
- Don't try to run `npx convex dev` yourself — it's interactive, requires a real account, and will block. Write the stub `_generated/` files and tell me to run it.
- The bearer token MUST be encrypted at rest. Use AES-256-GCM exactly as specified in the PRD. The token never leaves the Convex Node runtime.
- Cross-field identifier consolidation is non-negotiable — a single `IdentifierMap` instance must span all three fields' scrubbing within a session.

## Reference

A working version of this exact spec exists at `jeffbander/research` branch `claude/phi-deidentification-handoff-bxsZm` in `research-extraction-app/`. Don't copy verbatim — write fresh against the PRD so you understand each piece. But if you get stuck on a shape (Convex action signature, MLCEngine API call), look there.

## Acceptance — when you're done

- [ ] All 6 routes build green
- [ ] Three textareas, demo data button, scrub button, send button on `/research-extraction`
- [ ] `/admin` gates non-admins; both tabs CRUD-complete
- [ ] AigentsConfig.auth_token_encrypted is ciphertext at rest, decrypted only inside `forward.send`
- [ ] Same-patient text in multiple fields produces the same `[PATIENT_NAME-1]` placeholder across all cleansed outputs
- [ ] README walks an absolute beginner through Clerk + Convex + Vercel setup

When you finish, push to a feature branch and open a PR. Don't merge yourself.

---

## Now read the PRD I'm pasting next.

Then start at milestone 1.
