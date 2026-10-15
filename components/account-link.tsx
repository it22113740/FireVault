import Link from "next/link";
import { connection } from "next/server";
import { LayoutDashboardIcon, UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentProfile } from "@/lib/auth";
import { isStaff } from "@/lib/roles";

// Reads the session, so render it inside <Suspense>
export async function AccountLink({ variant = "button" }: { variant?: "button" | "menu" }) {
  // Auth dependencies may read the clock before accessing session cookies.
  await connection();
  const profile = await getCurrentProfile();
  if (!profile) return null;

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
