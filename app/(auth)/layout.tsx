import { Logo } from "@/components/site-header";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 has-[[data-login-card]]:border-0 has-[[data-login-card]]:bg-transparent has-[[data-login-card]]:p-0 sm:p-8">{children}</div>
    </main>
  );
}
