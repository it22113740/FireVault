import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
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
  );
}
