import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";
import { LoginBackground } from "./login-background";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <>
      <LoginBackground />
      <div data-login-card className="flex flex-col gap-6 rounded-2xl border border-white/20 bg-card/15 p-6 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8">
        <div>
          <h1 className="text-2xl font-bold">Log in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to browse accounts, top-ups and sellers.
          </p>
        </div>
        {/* Reads ?next, ?blocked and ?expired from the URL */}
        <Suspense fallback={<Skeleton className="h-72" />}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
