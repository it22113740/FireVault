import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-52" />}>
        <ResetPasswordGate />
      </Suspense>
    </div>
  );
}

// The email link signs the user in via /auth/confirm; without that session
// the link was expired or already used
async function ResetPasswordGate() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims.sub) {
    return (
      <p className="text-sm text-muted-foreground">
        This reset link has expired or was already used.{" "}
        <Link href="/forgot-password" className="text-primary hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }
  return <ResetPasswordForm />;
}
