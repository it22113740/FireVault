import { Suspense } from "react";
import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import { ContactDetailsForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" />
      <Suspense fallback={<Skeleton className="h-96 max-w-xl" />}>
        <Profile />
      </Suspense>
    </div>
  );
}

async function Profile() {
  const profile = await requireStaff();

  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <div>
          <h2 className="font-heading text-lg font-semibold">{profile.full_name}</h2>
          <p className="text-sm text-muted-foreground">
            {profile.email} · {ROLE_LABELS[profile.role]}
          </p>
        </div>
        {profile.role === "sales_admin" ? (
          <ContactDetailsForm
            defaults={{
              whatsappNumber: profile.whatsapp_number ?? "",
              contactNumber: profile.contact_number ?? "",
            }}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            The admin WhatsApp number buyers see is set in Settings.
          </p>
        )}
      </section>
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">Change password</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
