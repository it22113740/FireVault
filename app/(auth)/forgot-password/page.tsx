import { Suspense } from "react";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll email you a link to set a new password.
        </p>
      </div>
      {/* Reads ?expired from the URL */}
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
