import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>
    </div>
  );
}

type Stat = { label: string; href: string; table: "orders" | "listings"; status: string };

const ORDER_STATS: Stat[] = [
  { label: "Pending payment check", href: "/admin/orders?status=pending", table: "orders", status: "pending" },
  { label: "Paid, awaiting delivery", href: "/admin/orders?status=paid", table: "orders", status: "paid" },
  { label: "Delivered", href: "/admin/orders?status=delivered", table: "orders", status: "delivered" },
];

const LISTING_STATS: Stat[] = [
  { label: "Available", href: "/admin/posts", table: "listings", status: "available" },
  { label: "Reserved", href: "/admin/posts", table: "listings", status: "reserved" },
  { label: "Sold", href: "/admin/posts", table: "listings", status: "sold" },
];

async function Stats() {
  const supabase = await createClient();
  const counts = await Promise.all(
    [...ORDER_STATS, ...LISTING_STATS].map(async ({ table, status }) => {
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("status", status);
      return count;
    })
  );
  const orderCounts = counts.slice(0, ORDER_STATS.length);
  const listingCounts = counts.slice(ORDER_STATS.length);

  return (
    <>
      <StatGroup title="Orders" stats={ORDER_STATS} counts={orderCounts} highlightFirst />
      <StatGroup title="Listings" stats={LISTING_STATS} counts={listingCounts} />
    </>
  );
}

function StatGroup({
  title,
  stats,
  counts,
  highlightFirst,
}: {
  title: string;
  stats: Stat[];
  counts: (number | null)[];
  highlightFirst?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat, index) => {
          const needsAttention = highlightFirst && index === 0 && (counts[index] ?? 0) > 0;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`rounded-xl border bg-card p-4 transition hover:border-primary/60 ${needsAttention ? "border-primary/60" : ""}`}
            >
              <p className={`text-3xl font-bold tabular-nums ${needsAttention ? "text-primary" : ""}`}>
                {counts[index] ?? "—"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
