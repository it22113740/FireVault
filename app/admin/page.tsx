import { Suspense } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff, type Profile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { accessDaysLeft } from "@/lib/sales-admin-access";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />
      <Suspense fallback={<StatsSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

type Stat = { label: string; href: string; count: number | null; attention?: boolean };

async function Dashboard() {
  const profile = await requireStaff();
  return profile.role === "super_admin" ? <SuperAdminStats /> : <SalesAdminStats profile={profile} />;
}

async function SuperAdminStats() {
  const supabase = await createClient();
  const head = { count: "exact", head: true } as const;
  const [review, applications, live, topups, settings] = await Promise.all([
    supabase.from("listings").select("id", head).eq("publish_status", "pending_review"),
    supabase.from("sales_admin_applications").select("id", head).eq("status", "pending"),
    supabase.from("listings").select("id", head).eq("publish_status", "published"),
    supabase.from("topups").select("id", head).eq("status", "published"),
    supabase.from("app_settings").select("admin_whatsapp").eq("id", 1).single(),
  ]);

  return (
    <>
      {!settings.data?.admin_whatsapp && (
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"
        >
          <TriangleAlertIcon className="size-5 shrink-0 text-warning" />
          Set the admin WhatsApp number in Settings. Until then, buyers can&apos;t contact you about
          top-ups or your own listings.
        </Link>
      )}
      <StatGrid
        stats={[
          { label: "Pending reviews", href: "/admin/review", count: review.count, attention: true },
          { label: "Pending applications", href: "/admin/applications", count: applications.count, attention: true },
          { label: "Live listings", href: "/admin/listings?status=published", count: live.count },
          { label: "Live top-ups", href: "/admin/top-ups", count: topups.count },
        ]}
      />
    </>
  );
}

async function SalesAdminStats({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const head = { count: "exact", head: true } as const;
  const own = (status: "draft" | "pending_review" | "published" | "rejected") =>
    supabase.from("listings").select("id", head).eq("created_by", profile.id).eq("publish_status", status);
  const [drafts, review, live, rejected] = await Promise.all([
    own("draft"),
    own("pending_review"),
    own("published"),
    own("rejected"),
  ]);

  return (
    <>
      {profile.active_until && <AccessNotice activeUntil={profile.active_until} />}
      {!profile.whatsapp_number && (
        <Link
          href="/admin/profile"
          className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm"
        >
          <TriangleAlertIcon className="size-5 shrink-0 text-warning" />
          Add your WhatsApp number in Profile so buyers can reach you.
        </Link>
      )}
      <StatGrid
        stats={[
          { label: "Drafts", href: "/admin/listings?status=draft", count: drafts.count },
          { label: "In review", href: "/admin/listings?status=pending_review", count: review.count },
          { label: "Live", href: "/admin/listings?status=published", count: live.count },
          { label: "Rejected", href: "/admin/listings?status=rejected", count: rejected.count, attention: true },
        ]}
      />
    </>
  );
}

// Sellers see when their month of access ends; highlighted in the last 5 days
function AccessNotice({ activeUntil }: { activeUntil: string }) {
  const daysLeft = accessDaysLeft(activeUntil);
  const soon = daysLeft <= 5;
  return (
    <p
      className={cn(
        "rounded-xl border p-4 text-sm",
        soon ? "border-warning/40 bg-warning/10" : "bg-card text-muted-foreground"
      )}
    >
      Your seller access is active until <span className="font-medium text-foreground">{formatDate(activeUntil)}</span>
      {soon && ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left). Contact the administrator to renew it.`}
    </p>
  );
}

function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const highlight = stat.attention && (stat.count ?? 0) > 0;
        return (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(
              "rounded-xl border bg-card p-4 transition duration-200 hover:border-primary/50 md:hover:-translate-y-1",
              highlight && "border-primary/50"
            )}
          >
            <p className={cn("font-heading text-3xl font-bold tabular-nums", highlight && "text-primary")}>
              {stat.count ?? "—"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </Link>
        );
      })}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
