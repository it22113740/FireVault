# Free Fire Store — Build Plan

Oct 15, 2026 · @Sirithar Santhosh

## Overview

A Free Fire–only storefront: customers browse game accounts and top-up packs, then buy over WhatsApp with manual payment. Staff manage everything from a role-based admin dashboard. Build it as one Next.js app on Supabase, in 8 phases, each with a ready AI prompt (section 8).

**Who uses it**

- **Customer** (no login) — browses accounts and top-ups, taps "Buy on WhatsApp".
- **Sales admin** — applies via the public site, gets approved, posts accounts that go through review.
- **Super admin** — publishes directly, reviews sales admin posts, manages sales admins and top-ups.

**In scope (v1)**

- Public site: home, account listings with filters, listing detail, top-ups by category, sales admin application form.
- Admin dashboard: listings, review queue, sales admin applications, sales admin management, top-ups.
- Draft → review → publish workflow; Available / Reserved status on accounts.
- Approval creates the sales admin login with a random password and emails a reset link.
- Inactive sales admins are blocked at login with a "contact the administrator to make payment" message.

**Out of scope (v1)**

- Online payments, carts, checkout, customer accounts.
- Automatic top-up delivery or any Garena/Free Fire API integration.
- In-app chat — all buying happens on WhatsApp.

## Roles & permissions

Only two logged-in roles exist; customers never log in. Every rule below is enforced twice: in the UI and in the database (Row Level Security).

| Action | Customer | Sales admin | Super admin |
| --- | --- | --- | --- |
| View published accounts & top-ups | Yes | Yes | Yes |
| Apply to become sales admin | Yes (public form) | — | — |
| Create / edit own account listings | — | Yes, drafts only | Yes |
| Publish a listing | — | No — submits for review | Yes, directly |
| Approve / reject submitted listings | — | — | Yes |
| Set Available / Reserved | — | Own listings | All listings |
| Approve / deny applications | — | — | Yes |
| Activate / deactivate sales admins | — | — | Yes |
| Create / publish top-ups | — | — | Yes |
| Log in while inactive | — | Blocked with payment message | — |

The first super admin is created once by hand (seed script or Supabase dashboard). There is no public signup for super admins.

## Core workflows

Four workflows drive the app; the listing lifecycle is the one that needs the most care.

**1. Listing lifecycle**

&#91;embedded content: listing lifecycle · 5 states\]

A sales admin who edits a live listing sends it back to Pending review. Available / Reserved is a separate toggle on live listings and never needs review.

**2. Sales admin onboarding**

1. Applicant submits `/apply` → application `pending`.
2. Super admin reviews details and the WhatsApp group screenshot.
3. **Approve** → login created with a random password → reset-password email → sales admin sets their own password. **Deny** → applicant emailed, no login.

**3. Active / inactive**

- Super admin flips the Active switch on `/admin/sales-admins`.
- Inactive sales admins can't log in and see: *"Your account is inactive. Please contact the administrator to make the payment."* with a WhatsApp button to the admin.

**4. Top-ups and buying**

- Super admin creates a top-up (Membership, VIP Bundle or Diamonds) as Draft → **Publish** → live. No review step.
- Customer taps **Buy on WhatsApp** on any account or top-up → chat opens with a pre-filled message → payment and delivery happen manually in the chat → seller marks the account Reserved, then Archived once sold.

## Tech stack

One Next.js app serves both the public site and the dashboard; Supabase covers database, auth, image storage and email, so there is no separate backend to host.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript | Public pages render server-side for SEO; admin uses Server Actions — no separate API |
| UI | Tailwind CSS + shadcn/ui | AI tools generate it reliably; fast dark "gaming" theme |
| Forms & validation | React Hook Form + Zod | One schema validates both client and server |
| Database | Supabase Postgres | Relational data, enums, Row Level Security |
| Auth | Supabase Auth (email + password) | Admin API creates users with random passwords and sends reset links |
| File storage | Supabase Storage | Public bucket for listing/top-up images; private bucket for WhatsApp screenshots |
| Email | Supabase SMTP via Resend | Default Supabase mail is rate-limited; Resend free tier is enough |
| Bot protection | Cloudflare Turnstile | Stops spam on the public application form |
| Hosting | Vercel + Supabase (free tiers to start) | Zero-ops deploys from GitHub |

**Project structure**

```
app/
  (public)/            home, accounts, accounts/[id], top-ups, apply
  (auth)/              login, forgot-password, reset-password, inactive
  admin/               dashboard (protected by middleware)
    listings/  review/  applications/  sales-admins/  top-ups/
lib/
  supabase/            server.ts, client.ts, admin.ts (service role, server only)
  validations/         zod schemas
  actions/             server actions per feature
components/            ui/ (shadcn), listing-card, topup-card, status-badge
supabase/migrations/   SQL migrations
middleware.ts          auth + role + is_active gate
```

## Database schema

Six tables cover everything. Paste the SQL below into the Phase 1 prompt (or the Supabase SQL editor) as the source of truth.

| Table | Holds |
| --- | --- |
| `profiles` | One row per logged-in user (role, contact details, active flag) |
| `sales_admin_applications` | Public applications awaiting approve / deny |
| `listings` | Free Fire accounts for sale |
| `topups` | Membership, VIP bundle and Diamond packs |
| `app_settings` | Admin WhatsApp number, currency, inactive message |
| `audit_logs` | Who approved, rejected, activated what, and when |

```sql
-- ENUMS
create type user_role          as enum ('super_admin','sales_admin');
create type application_status as enum ('pending','approved','denied');
create type publish_status     as enum ('draft','pending_review','published','rejected','archived');
create type availability       as enum ('available','reserved');
create type topup_category     as enum ('membership','vip_bundle','diamonds');
create type topup_status       as enum ('draft','published');

-- PROFILES (1:1 with auth.users)
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  role             user_role not null,
  full_name        text not null,
  email            text not null unique,
  whatsapp_number  text,
  contact_number   text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- SALES ADMIN APPLICATIONS
create table sales_admin_applications (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  email            text not null,
  whatsapp_number  text not null,
  contact_number   text not null,
  screenshot_path  text not null,          -- private bucket: applications/
  status           application_status not null default 'pending',
  deny_reason      text,
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  user_id          uuid references profiles(id),  -- set on approval
  created_at       timestamptz not null default now()
);
create unique index one_pending_per_email
  on sales_admin_applications (lower(email)) where status = 'pending';

-- LISTINGS (game accounts)
create table listings (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null,
  price            numeric(12,2) not null check (price >= 0),
  region           text not null,          -- e.g. 'IND','SG','BD' (see open questions)
  image_path       text not null,          -- public bucket: listings/
  availability     availability not null default 'available',
  publish_status   publish_status not null default 'draft',
  rejection_reason text,
  created_by       uuid not null references profiles(id),
  reviewed_by      uuid references profiles(id),
  submitted_at     timestamptz,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on listings (publish_status, availability, region);

-- TOP-UPS
create table topups (
  id               uuid primary key default gen_random_uuid(),
  category         topup_category not null,
  name             text not null,
  description      text not null,
  price            numeric(12,2) not null check (price >= 0),
  image_path       text not null,          -- public bucket: topups/
  status           topup_status not null default 'draft',
  sort_order       int not null default 0,
  created_by       uuid not null references profiles(id),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- SETTINGS (single row)
create table app_settings (
  id                   int primary key default 1 check (id = 1),
  admin_whatsapp       text not null,
  currency             text not null default 'LKR',
  inactive_message     text not null default
    'Your account is inactive. Please contact the administrator to make the payment and reactivate your account.'
);

-- AUDIT LOG
create table audit_logs (
  id          bigserial primary key,
  actor_id    uuid references profiles(id),
  action      text not null,     -- 'listing.approve', 'salesadmin.deactivate', ...
  entity      text not null,
  entity_id   uuid,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

-- ROLE HELPERS (used in RLS)
create function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$;
create function is_active_sales_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles
                 where id = auth.uid() and role = 'sales_admin' and is_active);
$$;
```

**Row Level Security (enable on every table)**

- `listings` — anyone can read `published`; sales admins read/insert their own; they may update their own only while `draft` or `rejected` (plus `availability` on published ones); super admin can do everything.
- `topups` — anyone can read `published`; only super admin writes.
- `sales_admin_applications` — no public read; inserts go through a server action with the service role; super admin reads/updates.
- `profiles` — users read their own row; super admin reads/updates all.
- `app_settings` — public read; super admin update.
- `audit_logs` — super admin read; inserts only from server actions.
- A `BEFORE UPDATE` trigger on `listings` blocks a non-super-admin from setting `publish_status = 'published'`, and resets a sales admin's edited published listing back to `pending_review` (availability-only changes excepted).

**Storage buckets**

- `public-images` (public): `listings/{id}.webp`, `topups/{id}.webp` — max 2 MB, jpg/png/webp only.
- `applications` (private): WhatsApp screenshots, viewed by super admin through 60-second signed URLs.

## Pages & routes

20 routes in total: 7 public, 4 auth, 9 admin (some admin screens are shared by both roles with different data).

**Public site**

| Route | Page | Key contents |
| --- | --- | --- |
| `/` | Home | Hero, latest available accounts, top-up categories, "Become a seller" CTA |
| `/accounts` | Account listings | Grid of cards; filter by region, price range, availability; sort by newest / price |
| `/accounts/[id]` | Listing detail | Image, title, description, price, region, Available/Reserved badge, **Buy on WhatsApp** button (disabled when Reserved) |
| `/top-ups` | Top-ups | Tabs: Membership · VIP Bundle · Diamonds; each card has **Buy on WhatsApp** |
| `/apply` | Sales admin application | Name, email, WhatsApp no., contact no., screenshot upload, Turnstile |
| `/apply/success` | Confirmation | "We'll email you once reviewed" |
| `/how-to-buy` | How buying works | 3 steps: pick → chat on WhatsApp → pay manually and receive |

**Auth**

| Route | Purpose |
| --- | --- |
| `/login` | Email + password for both roles |
| `/forgot-password` | Sends reset link |
| `/reset-password` | Sets new password from the email link |
| `/inactive` | Shows the inactive/payment message and the admin WhatsApp button |

**Admin dashboard** (`/admin`, protected)

| Route | Super admin | Sales admin |
| --- | --- | --- |
| `/admin` | Counts: pending reviews, pending applications, live listings, top-ups | Own counts: drafts, in review, live, rejected |
| `/admin/listings` | All listings, all statuses, filters | Own listings only |
| `/admin/listings/new` · `/[id]/edit` | Save draft or **Publish** | Save draft or **Submit for review** |
| `/admin/review` | Queue of `pending_review` with Approve / Reject (+ reason) | — |
| `/admin/applications` | Pending / approved / denied tabs, screenshot preview, Approve / Deny | — |
| `/admin/sales-admins` | List with Active toggle, listing count, contact details | — |
| `/admin/top-ups` | CRUD by category, Publish / Unpublish, reorder | — |
| `/admin/settings` | Admin WhatsApp number, currency, inactive message | — |
| `/admin/profile` | Change password | Change password, update WhatsApp number |

**The WhatsApp button** opens `https://wa.me/<number>?text=<encoded message>`, pre-filled like: *"Hi, I'm interested in the Free Fire account 'Level 72 Elite Pass' (ID: A1B2C3) — LKR 15,000. Is it available?"* Top-ups use the same pattern with the pack name.

## UI, UX & loading experience

The app should never show a blank screen or a frozen button. Every wait shows a skeleton shaped like the real content, every action gives feedback within 100 ms, and motion stays short (150–300 ms) and purposeful.

**Design direction**

- Dark gaming theme: near-black background (`#0B0B0F`), card surface (`#15151C`), Free Fire orange/amber accent (`#FF8A00` → `#FFB800` gradient) for CTAs only, green for Available, amber for Reserved.
- Font: Rajdhani or Oxanium for headings (gaming feel), Inter for body text.
- Cards with subtle border glow on hover, 12–16 px radius, generous spacing; one primary CTA per screen.
- Icons: lucide-react. Design tokens live in `tailwind.config.ts` + CSS variables so the AI never hard-codes colours.

**Extra libraries**

| Library | Used for |
| --- | --- |
| `motion` (Framer Motion) | Page/section fade-ins, card stagger, hover lift, layout animation on filter changes, modal/sheet transitions |
| `sonner` | Toasts for save, publish, approve, errors |
| `nextjs-toploader` | Thin orange progress bar on every route change |
| `tailwindcss-animate` (with shadcn) | Shimmer, pulse, spin, accordion |
| `embla-carousel-react` | Home hero and "latest accounts" carousel |
| `plaiceholder` or Supabase image transform | Blurred image placeholders |

**Loading & skeleton rules**

| Situation | What the user sees |
| --- | --- |
| Route change | Top progress bar immediately; `loading.tsx` skeleton for the new page |
| Public grids (`/accounts`, `/top-ups`, home sections) | Skeleton cards matching the real card exactly (image block, 2 text lines, price, button) with a left-to-right shimmer; same count as the page size so nothing jumps |
| Listing detail | Skeleton image + text blocks; image fades in from a blurred placeholder |
| Filters / tabs / pagination | Old results dim to 60% with a small spinner, then new cards fade + stagger in (40 ms apart); URL updates instantly |
| Admin tables | Skeleton rows (8) with column-width bars; counts on dashboard show skeleton numbers |
| Buttons (Save, Publish, Approve, Submit) | Disabled + spinner + verb in progress ("Publishing…") via `useFormStatus`; never double-submits |
| Quick toggles (Available/Reserved, Active) | Optimistic update with `useOptimistic`; rolls back with an error toast if it fails |
| Image upload | Instant local preview, progress bar, WebP conversion message |
| Errors | `error.tsx` per route group with a friendly message and Retry; never a raw stack trace |
| Empty states | Illustration/icon + one line + action ("No accounts in this region yet — clear filters") |

Sections stream with `<Suspense>` so the header and filters appear first and the slow data fills in after.

**Motion rules**

- Entrances: fade + 8 px rise, 200 ms, ease-out; lists stagger 40 ms, max 10 items animated.
- Hover (desktop): card lifts 4 px with accent glow; buttons scale to 0.97 on press.
- Modals/sheets: slide + fade 200 ms; mobile filters open as a bottom sheet.
- Status changes: badge colour cross-fades; approved rows slide out of the review queue.
- Respect `prefers-reduced-motion` — turn off movement, keep fades.
- Animate only `opacity` and `transform` (60 fps on cheap Android phones).

**UX details that matter**

- Mobile-first: sticky bottom bar on listing detail with price + **Buy on WhatsApp**; tap targets ≥ 44 px.
- Copy the listing ID with one tap (customers paste it in WhatsApp).
- Region and price shown on every card; Reserved cards greyed with a ribbon, not hidden.
- Admin forms: autosave drafts every 10 s, "unsaved changes" warning on leave, inline validation as you type.
- Live character counters on title/description; price input formats with thousands separators.
- Confirm dialogs only for destructive or irreversible actions (Deny, Deactivate, Archive).
- Review queue: keyboard shortcuts (A approve, R reject, J/K next/prev) for the super admin.
- Rejected listings show the reason in a highlighted banner at the top of the edit form.
- Accessibility: visible focus rings, AA contrast on the dark theme, alt text from listing title.

**Performance targets**

- LCP < 2.5 s and CLS < 0.1 on 4G mobile — skeletons must match final sizes exactly.
- Images: `next/image`, WebP, sized per breakpoint, lazy below the fold, hero image priority.

## Security & business rules

These are the rules most likely to be missed when AI writes the code — check each one in review.

**Sales admin approval**

1. Super admin clicks Approve → server action (service role) calls `auth.admin.createUser({ email, password: <32-char random>, email_confirm: true })`.
2. Insert `profiles` row (role `sales_admin`, details copied from the application, `is_active = true`).
3. Send a password-reset email (`resetPasswordForEmail`, redirect to `/reset-password`) with a welcome line.
4. Mark application `approved`, set `user_id`, write audit log. Wrap in try/catch — if step 2–4 fails, delete the auth user so it can be retried.
5. Deny → status `denied` + optional reason, email the applicant. Email already in `profiles` → block approval.

**Inactive sales admins**

- On login: after `signInWithPassword` succeeds, read `profiles.is_active`. If false → `signOut()` and redirect to `/inactive`.
- In `middleware.ts`: every `/admin/*` request re-checks role and `is_active`, so deactivating someone kicks them out on their next click.
- RLS uses `is_active_sales_admin()`, so an inactive user's API calls fail even if the UI is bypassed.
- Their published listings stay visible by default (see open questions).

**Listings**

- Sales admin flow: `draft` → **Submit** → `pending_review` → super admin **Approve** → `published` (or **Reject** with reason → `rejected` → edit → resubmit).
- Super admin flow: `draft` → **Publish** → `published`.
- Editing a published listing as a sales admin sends it back to review; only the Available/Reserved toggle is instant.
- `archived` replaces deletion for anything once published (keeps history).
- Required before submit/publish: title, description, price > 0, region, image.

**General**

- `SUPABASE_SERVICE_ROLE_KEY` only in `lib/supabase/admin.ts`, imported only by server code (`import 'server-only'`).
- Every server action re-checks the caller's role — never trust a hidden form field.
- Validate all input with Zod on the server; strip HTML from descriptions (render as plain text).
- Images: check type and size server-side, convert to WebP, random file names.
- `/apply`: Turnstile + one pending application per email + rate limit (e.g. 5 per IP per hour).
- Phone numbers stored in E.164 (`+94771234567`) so `wa.me` links always work.

## Build plan & AI prompts

Build in 8 phases, one AI session per phase, and commit after each. Export this doc as Markdown, save it in the repo as `PLAN.md`, and start every session with the context prompt.

| # | Phase | Done when | Est. |
| --- | --- | --- | --- |
| 0 | Setup | App runs locally, deployed to Vercel, Supabase linked | 0.5 day |
| 1 | Database | Migrations applied, RLS on, seed super admin works | 1 day |
| 2 | Auth & guards | Login, reset, middleware, inactive block all work | 1 day |
| 3 | Applications | Apply → approve creates user + reset email; deny works | 1.5 days |
| 4 | Listings & review | Full draft → review → publish flow for both roles | 2 days |
| 5 | Top-ups | CRUD + publish for 3 categories | 1 day |
| 6 | Public site | All public pages + WhatsApp buttons | 2 days |
| 7 | Polish, test, launch | Checklist in section 9 passes; live on domain | 1.5 days |

Roughly 10–11 working days for one developer.

**Context prompt (paste at the start of every session)**

```
You are building a Free Fire account & top-up store. Read PLAN.md in the repo root —
it is the source of truth for roles, schema, routes and rules. Stack: Next.js 15 App Router,
TypeScript, Tailwind, shadcn/ui, Supabase (Postgres, Auth, Storage), Zod, React Hook Form.
Rules: use Server Actions (no API routes unless needed), re-check role in every action,
never expose the service role key to the client, validate with Zod on the server,
follow PLAN.md 'UI, UX & loading experience' for every screen (skeleton per page,
pending buttons, toasts, motion rules),
keep components small. Only do the phase I give you. When done, list the files you changed
and how to test it.
```

**Phase 0 — Setup**

```
Phase 0: Create a Next.js 15 app (TypeScript, Tailwind, App Router, src-less) with shadcn/ui
using the design tokens, fonts and colours in PLAN.md 'UI, UX & loading experience'.
Install motion, sonner, nextjs-toploader, embla-carousel-react. Build shared UI
primitives first: Skeleton (with shimmer), SkeletonCard, SkeletonTableRows,
SubmitButton (useFormStatus spinner + pending label), EmptyState, ErrorState,
FadeIn and Stagger motion wrappers (respecting prefers-reduced-motion), and mount
Toaster + TopLoader in the root layout. Add @supabase/ssr and set up
lib/supabase/server.ts, client.ts and admin.ts (service role, 'server-only').
Add .env.example with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL, TURNSTILE keys.
Create the folder structure from PLAN.md with placeholder pages and a shared
public layout (navbar, footer) and admin layout (sidebar).
```

**Phase 1 — Database**

```
Phase 1: Create supabase/migrations/0001_init.sql from the SQL in PLAN.md
'Database schema'. Add: RLS policies exactly as described there, the listings
BEFORE UPDATE trigger, updated_at triggers, the two storage buckets with policies,
and a seed script (scripts/seed-super-admin.ts) that creates the first super admin
from env vars. Generate TypeScript types into lib/database.types.ts.
```

**Phase 2 — Auth & guards**

```
Phase 2: Build /login, /forgot-password, /reset-password and /inactive.
After login, load the profile: if role is sales_admin and is_active is false,
sign out and redirect to /inactive, which shows app_settings.inactive_message and a
WhatsApp button to app_settings.admin_whatsapp. Write middleware.ts that protects
/admin/*, refreshes the session, and redirects inactive users to /inactive on every
request. Add a requireRole('super_admin' | 'sales_admin') helper for server actions.
Admin sidebar shows only the links allowed for the role.
```

**Phase 3 — Sales admin applications**

```
Phase 3: Build /apply (name, email, WhatsApp no., contact no., WhatsApp group
screenshot upload, Cloudflare Turnstile). Server action: verify Turnstile, Zod-validate,
normalise phones to E.164, upload screenshot to the private 'applications' bucket,
insert with the service role, block if a pending application exists for that email.
Build /admin/applications for super admin: tabs Pending/Approved/Denied, screenshot
shown via 60s signed URL, Approve and Deny (with reason) buttons. Approve follows
PLAN.md 'Sales admin approval' steps 1–5 exactly, including rollback on failure
and an audit_logs row. Build /admin/sales-admins with an Active switch
(confirm dialog, audit log).
```

**Phase 4 — Listings & review**

```
Phase 4: Build /admin/listings (table with status + availability badges, filters),
/admin/listings/new and /admin/listings/[id]/edit (title, description, price, region
select, image upload with preview → WebP in public-images/listings/).
Buttons by role: super admin = Save draft | Publish; sales admin = Save draft |
Submit for review. Sales admins see only their own listings and can edit only draft or
rejected ones; an Available/Reserved toggle works on any of their listings.
Build /admin/review (super admin): pending_review queue, preview, Approve → published,
Reject → rejected with required reason shown to the sales admin. Archive instead of
delete for published listings. Audit-log every status change.
```

**Phase 5 — Top-ups**

```
Phase 5: Build /admin/top-ups for super admin: tabs Membership / VIP Bundle /
Diamonds, create/edit form (image, name, description, price), Save draft | Publish |
Unpublish, drag or up/down to set sort_order. Images to public-images/topups/.
```

**Phase 6 — Public site**

```
Phase 6: Build the public pages listed in PLAN.md 'Pages & routes': home, /accounts
with filters (region, price range, availability) via URL search params and pagination,
/accounts/[id], /top-ups with category tabs, /how-to-buy. Only published rows.
Create a WhatsAppButton component that builds a wa.me link with a pre-filled message
(item name, short ID, price with currency). Account listings use the seller's WhatsApp
number; super admin listings and top-ups use app_settings.admin_whatsapp.
Disable the button and show 'Reserved' when availability is reserved.
Add SEO metadata, Open Graph images from the listing image, and loading skeletons.
Mobile-first — most customers arrive from WhatsApp on phones.
```

**Phase 7 — Polish & launch**

```
Phase 7: Add /admin/settings and /admin/profile. Add the admin dashboard counts.
Add empty states, toasts, confirm dialogs and error boundaries everywhere.
Then review the whole codebase against PLAN.md 'Security & business rules' and the
testing checklist, list every gap you find, and fix them.
```

**UI/UX pass (run after Phases 3, 4, 5 and 6)**

```
UI/UX pass on the screens built in the last phase. For each route: add loading.tsx
with a skeleton that matches the final layout exactly (no layout shift), wrap slow
data in <Suspense>, add error.tsx with Retry, and an EmptyState. Every form button
uses SubmitButton; every mutation shows a sonner toast; quick toggles use
useOptimistic with rollback. Animate card grids with Stagger (fade + 8px rise,
200ms, 40ms stagger), hover lift on desktop, bottom sheets on mobile. Only animate
opacity/transform. Check at 360px width and with reduced motion on. List what you
changed per route.
```

## Testing & deployment

Run this checklist by hand with three browsers open: logged out, sales admin, super admin.

**Roles & access**

- [ ] Logged-out user opening `/admin` is sent to `/login`
- [ ] Sales admin opening `/admin/review`, `/admin/applications`, `/admin/top-ups` gets blocked
- [ ] Sales admin cannot see or edit another sales admin's listing (try by changing the ID in the URL)
- [ ] Sales admin cannot publish by calling the Supabase API directly from the browser console

**Applications**

- [ ] Apply → appears under Pending with a viewable screenshot
- [ ] Second application with the same email while pending is refused
- [ ] Approve → user created, reset email received, link sets password, login works
- [ ] Deny → applicant emailed, cannot log in

**Active / inactive**

- [ ] Deactivate a logged-in sales admin → next click lands on `/inactive`
- [ ] Inactive sales admin login → payment message + admin WhatsApp button
- [ ] Reactivate → login works again

**Listings & top-ups**

- [ ] Sales admin draft → submit → appears in review queue, not on the public site
- [ ] Approve → live on `/accounts`; Reject → reason visible to sales admin; resubmit works
- [ ] Sales admin edits a live listing → goes back to review
- [ ] Super admin draft → Publish → live immediately
- [ ] Reserved listing shows badge and disabled WhatsApp button
- [ ] Top-up drafts hidden publicly; published ones appear under the right tab in the right order

**Public & mobile**

- [ ] WhatsApp links open the correct number with the correct pre-filled text on Android and iPhone
- [ ] Pages usable at 360 px width; images load fast (WebP, `next/image`)
- [ ] Lighthouse mobile performance ≥ 85 on `/accounts`

**Deployment steps**

1. Create Supabase project (Singapore region — closest to Sri Lanka); run migrations; run the super admin seed.
2. Supabase Auth → set Site URL and redirect URLs to the production domain; set up custom SMTP (Resend) with a verified sender domain.
3. Push to GitHub → import into Vercel → add env vars → deploy.
4. Add the custom domain (Cloudflare DNS → Vercel), force HTTPS.
5. Turn on Supabase daily backups (or a weekly `pg_dump` script on the free plan).
6. Post-launch: create 2–3 real listings and one test sales admin, run the checklist on production.

## Open questions for the client

The plan assumes the defaults below; confirm each before Phase 4, since changing them later touches the schema.

| Question | Default in this plan |
| --- | --- |
| Whose WhatsApp gets the customer for a sales admin's listing — the seller or the main admin? | Seller's number; admin's number for super admin listings and top-ups |
| Currency? | LKR, shown as "LKR 15,000" |
| Fixed list of regions, or free text? | Fixed dropdown (e.g. IND, SG, BD, ID, BR, ME) that super admin can edit |
| One image per listing, or a gallery? | One required image; gallery can be added later |
| Do accounts need a "Sold" status, or are sold ones archived? | Archived (hidden) |
| When a sales admin goes inactive, do their live listings stay up? | Stay up |
| Can a reserved listing be set back to available? | Yes, by owner or super admin |
| Is there a fee/commission sales admins pay (behind the "make the payment" message)? | Handled outside the app; message only |
| Domain name and logo? | Needed before Phase 7 |
| Language — English only, or also Tamil/Sinhala? | English only for v1 |
