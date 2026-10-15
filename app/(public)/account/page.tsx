import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOutIcon } from "lucide-react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { SubmitButton } from "@/components/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth";
import { NameForm } from "./name-form";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:py-10">
      <h1 className="text-3xl font-bold tracking-tight">My account</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const profile = await requireUser();
  // Staff manage their profile in the dashboard
  if (profile.role !== "customer") redirect("/admin/profile");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-heading text-lg font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
        <NameForm defaultName={profile.full_name} />
      </section>
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Change password</h2>
        <ChangePasswordForm />
      </section>
      <form action={logout}>
        <SubmitButton variant="outline" size="lg" className="h-11" pendingLabel="Logging out…">
          <LogOutIcon /> Log out
        </SubmitButton>
      </form>
    </div>
  );
}
