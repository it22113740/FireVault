import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { UserRoundIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { requireSuperAdmin } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { BlockSwitch } from "./block-switch";
import { CustomerSearch } from "./customer-search";

export const metadata: Metadata = { title: "Customers" };

type Props = PageProps<"/admin/customers">;

const PAGE_LIMIT = 200;

export default function CustomersPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customers"
        description="Everyone who signed up to browse the store. Block someone to stop them logging in and leaving feedback."
      />
      <Suspense fallback={<SkeletonTableRows rows={6} />}>
        <Customers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Customers({ searchParams }: { searchParams: Props["searchParams"] }) {
  await requireSuperAdmin();
  const raw = (await searchParams).q;
  // Keep the search safe inside PostgREST's or() filter syntax
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().replace(/[,()%*]/g, " ").slice(0, 60) ?? "";

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, is_active, created_at, seller_feedback!seller_feedback_customer_id_fkey(count)",
      { count: "exact" }
    )
    .eq("role", "customer");
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).limit(PAGE_LIMIT);
  const customers = data ?? [];
  const { data: totals, error: totalsError } = customers.length
    ? await supabase.from("customer_topup_totals").select("*").in("customer_id", customers.map((customer) => customer.id))
    : { data: [], error: null };
  if (totalsError) throw new Error("Couldn't load customer top-up totals");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CustomerSearch defaultValue={q} />
        <p className="text-sm text-muted-foreground tabular-nums">
          {count ?? 0} {count === 1 ? "customer" : "customers"}
          {q && ` matching "${q}"`}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">Top-up amounts include all submitted orders, including pending payments. Guest orders are not linked to customer accounts.</p>
      {customers.length === 0 ? (
        <EmptyState
          icon={UserRoundIcon}
          title={q ? "No customers match that search." : "No customers have signed up yet."}
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {customers.map((customer) => (
            <li
              key={customer.id}
              className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1.4fr)_auto_auto] sm:items-center sm:gap-6"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{customer.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">{customer.email}</p>
                <Link href={`/admin/customers/${customer.id}/top-ups`} className="mt-2 inline-flex min-h-11 flex-wrap items-center gap-2 text-sm font-medium text-primary hover:underline">
                  {(totals ?? []).filter((row) => row.customer_id === customer.id).reduce((sum, row) => sum + row.order_count, 0)} top-up orders
                  <span className="text-muted-foreground">· Total ordered: {(totals ?? []).filter((row) => row.customer_id === customer.id).map((row) => formatPrice(row.total_amount, row.currency)).join(" + ") || "No spending yet"}</span>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground sm:text-right">
                <span className="font-medium tabular-nums text-foreground">
                  {customer.seller_feedback[0]?.count ?? 0}
                </span>{" "}
                feedback · joined {formatDate(customer.created_at)}
              </p>
              <BlockSwitch id={customer.id} name={customer.full_name} active={customer.is_active} />
            </li>
          ))}
        </ul>
      )}
      {(count ?? 0) > PAGE_LIMIT && (
        <p className="text-sm text-muted-foreground">
          Showing the newest {PAGE_LIMIT}. Search to find someone specific.
        </p>
      )}
    </>
  );
}
