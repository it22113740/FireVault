# FireVault — Project Brief

Web app to sell Free Fire game accounts. Public storefront + admin panel.

## Stack
- Next.js (App Router, TypeScript, `src/` dir)
- Tailwind CSS + shadcn/ui
- Supabase: Postgres, Auth (admin only), Storage (listing images, payment slips)
- Deploy: Vercel

## Conventions
- Server Components by default; Server Actions for mutations
- Supabase clients: `src/lib/supabase/server.ts`, `client.ts`, `admin.ts` (service role, server-only)
- Zod for all form validation
- Never expose the service role key to the client
- Never use "Free Fire" / "Garena" in branding (trademark)
- Keep components small; put shared UI in `src/components/ui`

## Data model
- `listings`: id, title, description, price, level, rank, region, highlights text[], images text[], status (available | reserved | sold | archived), created_at
- `orders`: id, listing_id, buyer_name, buyer_phone, buyer_email, payment_method, payment_slip_url, amount, status (pending | paid | delivered | rejected | refunded), admin_note, created_at
- `profiles`: id (auth.users), role (user | admin)

Account login credentials are NOT stored in `listings`. Delivered manually after payment confirmation.

## Business rules
- Placing an order sets the listing to `reserved` (atomic — use a Postgres function / RPC to prevent double-sell)
- Admin rejects order → listing back to `available`
- Admin marks delivered → listing `sold`
- New order → notify admin (Telegram bot or email)

## RLS
- Public: SELECT listings where status = 'available' or 'reserved'; INSERT orders
- Public: upload to `payment-slips` bucket only (no read)
- Admin (profiles.role = 'admin'): full access to everything

## Routes
Public: `/`, `/accounts/[id]`, `/checkout/[id]`
Admin (middleware-protected): `/admin/login`, `/admin`, `/admin/posts`, `/admin/posts/new`, `/admin/posts/[id]/edit`, `/admin/orders`, `/admin/orders/[id]`

## Commands
- `npm run dev` — local dev
- `npx supabase db push` — apply migrations
- `npm run build` — must pass before commits

## Workflow
Build one phase at a time. After each phase: run `npm run build`, fix errors, then commit.