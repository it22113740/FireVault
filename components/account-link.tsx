import Link from "next/link";
import { connection } from "next/server";
import { LayoutDashboardIcon, LogInIcon, UserPlusIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { isStaff } from "@/lib/roles";

// Reads the session, so render it inside <Suspense>
export async function AccountLink({ variant = "button" }: { variant?: "button" | "menu" }) {
  // Auth dependencies may read the clock before accessing session cookies.
  await connection();
  const profile = await getCurrentProfile();
  if (!profile) {
    return (
      <div className={variant === "menu" ? "flex flex-col gap-2 pt-2" : "flex items-center gap-2"}>
        <Button size="lg" variant="outline" className="h-11" render={<Link href="/login" />} nativeButton={false}>
          <LogInIcon aria-hidden /> Log in
        </Button>
        <Button size="lg" className="h-11 bg-brand font-semibold text-primary-foreground" render={<Link href="/signup" />} nativeButton={false}>
          <UserPlusIcon aria-hidden /> Sign up
        </Button>
      </div>
    );
  }

  const staff = isStaff(profile.role);
  const href = staff ? "/admin" : "/account";
  const label = staff ? "Dashboard" : "My account";
  const Icon = staff ? LayoutDashboardIcon : UserRoundIcon;

  if (variant === "menu") {
    return (
      <Link href={href} className="flex min-h-11 items-center gap-2 border-b text-lg">
        <Icon className="size-4" /> {label}
      </Link>
    );
  }
  return (
    <Button size="lg" variant="outline" render={<Link href={href} />} nativeButton={false}>
      <Icon /> {label}
    </Button>
  );
}
