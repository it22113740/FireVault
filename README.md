# FireVault

Game account & top-up store with a role-based admin dashboard. Customers buy on
WhatsApp; sales admins and a super admin manage everything at `/admin`.
`PLAN.md` is the source of truth for features and rules.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in. `SUPABASE_SERVICE_ROLE_KEY`
   is required (applications and approvals use it).
3. `npx supabase db push` to apply the migrations. The latest one replaces the
   old checkout/orders tables; their data is dropped.
4. `node --env-file=.env.local scripts/seed-super-admin.mts` to create (or
   promote) the first super admin.
5. In Supabase → **Authentication**:
   - **URL Configuration**: set the Site URL to your domain and add
     `<your domain>/auth/confirm` to the redirect URLs.
   - **Email Templates → Reset password**: set the link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
     Approval emails for new sellers only work with this template.
   - **Email Templates → Confirm sign up**: set the link to
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
     so customers can confirm their email on any device.
   - **SMTP**: use a custom SMTP provider (e.g. Resend); the built-in one is
     heavily rate-limited.
6. Log in at `/login` and set the admin WhatsApp number in **Settings**.
7. `npm run dev`

Optional: Cloudflare Turnstile keys protect `/apply` and `/signup` (required in production),
and `RESEND_API_KEY` + `EMAIL_FROM` email applicants who are denied.

After schema changes, regenerate types:
`npx supabase gen types typescript --linked > lib/database.types.ts`

## Salesperson deactivation emails

Apply `20261103000000_sales_admin_email_notifications.sql`, and configure
`RESEND_API_KEY`, `EMAIL_FROM`, and a strong random `CRON_SECRET` in production.
Admin deactivation queues an email in the same database transaction and attempts
immediate delivery. Expiry emails are scheduled when access is granted or renewed;
renewal cancels the previous pending expiry email. Existing active accounts are
scheduled by the migration, including accounts whose access has already expired.

`vercel.json` schedules `/api/cron/sales-admin-notifications` once daily with
`0 0 * * *` (UTC), compatible with Vercel Hobby. Expiry emails and failed-delivery
retries wait until the next scheduled run; admin deactivation still attempts an
immediate email. The worker processes up to 10 notifications per run, so larger
queues can take additional days to drain.

For faster delivery, use an external scheduler to GET the endpoint every five
minutes with `Authorization: Bearer <CRON_SECRET>`, or change the Vercel schedule
to `*/5 * * * *` on a plan supporting that frequency. Expiry notifications do not
require login. Failed deliveries become eligible for retry after five minutes.
The worker uses a lease plus a Resend idempotency key to protect against duplicate sends.
Resend's idempotency window is finite, so a prolonged database outage after a
successful send can still result in a duplicate on retry. Monitor job failures
(HTTP 503/500); missing email configuration leaves emails queued for retry.
