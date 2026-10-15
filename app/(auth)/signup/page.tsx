import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { SignupForm } from "./signup-form";
import { LoginBackground } from "../login/login-background";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignupPage() {
  return (
    <>
      <LoginBackground />
      <div data-login-card className="flex flex-col gap-6 rounded-2xl border border-white/20 bg-card/15 p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Free, and you can rate and review sellers.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-96" />}>
          <SignupForm />
        </Suspense>
      </div>
    </>
  );
}
