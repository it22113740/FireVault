# FireVault

Game account & top-up store with a role-based admin dashboard. See `PLAN.md`.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. `npx supabase db push` to apply the migrations.
4. `node --env-file=.env.local scripts/seed-super-admin.mts` to create the first super admin.
5. In Supabase → Authentication → Email Templates → **Reset password**, set the link to:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   and set the Site URL and redirect URLs to your domain.
6. `npm run dev`
