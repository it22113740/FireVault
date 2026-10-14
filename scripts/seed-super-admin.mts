// Creates (or promotes) the first super admin. Safe to re-run.
//   node --env-file=.env.local scripts/seed-super-admin.mts
// Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_NAME and SEED_SUPER_ADMIN_PASSWORD
// (at least 8 characters; required for a new user, resets an existing one).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
const fullName = process.env.SEED_SUPER_ADMIN_NAME?.trim();
const password = process.env.SEED_SUPER_ADMIN_PASSWORD;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!url || !serviceRoleKey) fail("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
if (!email || !fullName) fail("Set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_NAME.");

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserId(target: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Couldn't list users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === target);
    if (user) return user.id;
    if (data.users.length < 1000) return null;
  }
}

let userId = await findUserId(email);

if (password !== undefined && password.length < 8) {
  fail("SEED_SUPER_ADMIN_PASSWORD must be at least 8 characters.");
}

if (userId) {
  console.log(`• ${email} already exists; promoting to super admin.`);
  if (password) {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password });
    if (error) fail(`Couldn't set the password: ${error.message}`);
    console.log("• Password updated.");
  }
} else {
  if (!password) fail("Set SEED_SUPER_ADMIN_PASSWORD to create the user.");
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) fail(`Couldn't create the user: ${error.message}`);
  userId = data.user.id;
  console.log(`• Created ${email}.`);
}

const { error } = await supabase.from("profiles").upsert(
  { id: userId, role: "super_admin", full_name: fullName, email, is_active: true },
  { onConflict: "id" }
);
if (error) fail(`Couldn't save the profile: ${error.message}`);

console.log(`✓ ${email} is a super admin. Sign in at /login.`);
