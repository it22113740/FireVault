# FireVault

Game account & top-up store. Customers sign up, browse and buy on WhatsApp (no
checkout), and rate sellers; sales admins (sellers) and a super admin manage
listings from `/admin`.

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
- Added after PLAN.md:
  - A third role, `customer`. The whole site needs a login except the paths
    in `isPublicPath()` (`lib/roles.ts`), enforced in `proxy.ts`. Customers
    sign up at `/signup`; `/admin/customers` lists them and can block them
    (`is_active`).
  - Sales admins get one month of access per activation (`profiles.active_until`).
  - Per-seller review (`profiles.listings_need_review`, chosen on approval,
    editable on `/admin/sales-admins`). Sellers without review publish
    directly like a super admin (`publishesDirectly()` in `lib/listings.ts`,
    `can_self_publish()` in the listings trigger) and their live edits stay live.
  - Sellers must create a shop (`seller_profiles`) before using `/admin`
    (`/admin/onboarding`, then `/admin/shop`). Public pages: `/sellers` and
    `/sellers/[slug]`.
  - Customers leave one feedback per seller (`seller_feedback`: like/dislike,
    1–5 stars, review). Totals come from the `seller_directory` view.
  - Listing sellers: a super admin files a listing under seller shops. One
    shop = that seller owns it (`created_by`); several = a shared listing
    the super admin owns, with the shops in `listing_sellers`. Shared
    listings show on every shop, buyers choose which seller to WhatsApp, and
    any of those sellers can mark it Reserved
    (`set_shared_listing_availability()`). `published_listings.seller_ids`/
    `sellers` cover both cases.
  - Top-up orders (`topup_orders`): customers buy from the Buy dialog on
    `/top-ups`, paying by bank transfer (`app_settings.bank_accounts`, any
    number of accounts), eZ Cash (`ezcash_number` + a message in English,
    Sinhala and Tamil) or Binance (`binance_pay_id`, `binance_name`); see
    `lib/payments.ts`. Then player UID, quantity 1–5, WhatsApp and proof of
    payment (slip/screenshot, private `receipts` bucket); the order keeps
    `payment_method`. The old single-account `bank_*` columns are unused,
    left for a later drop. A
    trigger copies name/price from the live top-up. The super admin is
    alerted on WhatsApp via Twilio (`lib/twilio.ts`) plus email, and closes
    orders on `/admin/orders`.
  - Game updates (`game_updates`, image only, 1920 × 1080 = `UPDATE_IMAGE_SIZE`
    in `lib/game-updates.ts`): super admin posts on `/admin/updates`, public
    page `/updates`. Named "Game updates", not "FF", per the trademark rule.
  - Staff images (listings, top-ups, shop logo/cover) up to 30 MB are staged
    in the private `uploads` bucket and converted to WebP by the action
    (`lib/stage-image.ts` → `stagedToWebp()`).

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
