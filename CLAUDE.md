# FireVault

Game account & top-up store. Customers browse and buy on WhatsApp (no checkout);
sales admins and a super admin manage listings from `/admin`.

**`PLAN.md` is the source of truth** for roles, schema, routes, business rules and
UI/UX rules. Read the relevant section before changing anything.

## Where this codebase differs from PLAN.md (on purpose)
- Next.js 16, not 15: route protection lives in `proxy.ts` (`middleware.ts` was
  renamed). Read `node_modules/next/dist/docs/` before using Next APIs.
- `cacheComponents` is on: anything reading cookies, `params` or `searchParams`
  must render inside `<Suspense>`. Public reads use `lib/supabase/public.ts`
  (no cookies) inside `"use cache"` functions tagged with `lib/cache-tags.ts`,
  behind `await connection()` so `next build` never queries the database;
  every mutation calls `updateTag()` for the tags it affects.
- Supabase key env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new name for
  the anon key).
- `listings.description/region/image_path` default to `''` so drafts can be
  saved incomplete; submit/publish enforces them (Zod + DB check).
- `app_settings.regions` holds the editable region list.

## Conventions
- Server Components by default; Server Actions in `lib/actions/` for mutations.
  Every action re-checks the caller with `requireRole()` / `requireUser()`.
- Zod schemas in `lib/validations/`, shared by React Hook Form and the server.
- Supabase clients: `lib/supabase/server.ts` (user session), `client.ts`
  (browser), `public.ts` (anon, cacheable), `admin.ts` (service role,
  `server-only`). Never import `admin.ts` outside server code.
- Never use "Free Fire" / "Garena" in branding (trademark).
- shadcn/ui in `components/ui`; shared app components in `components/`.

## Commands
- `npm run dev` — local dev
- `npx supabase db push` — apply migrations
- `node --env-file=.env.local scripts/seed-super-admin.mts` — create the first super admin
- `npm run build` — must pass before commits

## Workflow
Build one phase at a time (PLAN.md "Build plan"). After each phase: run
`npm run build`, fix errors, then commit.
