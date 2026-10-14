import { createClient } from "@supabase/supabase-js";

// Anonymous client with no cookies/session, so it can run inside "use cache".
// Use for public storefront reads only; RLS applies as the anon role.
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
