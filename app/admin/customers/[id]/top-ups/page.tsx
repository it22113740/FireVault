import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";
import { formatPrice } from "@/lib/format";
import { RECEIPTS_BUCKET } from "@/lib/storage";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { OrderList } from "@/app/admin/orders/order-list";

export const metadata = { title: "Customer top-ups" };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string | string[] }> };
const PAGE_SIZE = 25;

export default function CustomerTopupsPage(props: Props) {
  return <Suspense fallback={<SkeletonTableRows rows={4} />}><History {...props} /></Suspense>;
}

async function History({ params, searchParams }: Props) {
  await requireSuperAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const db = await createClient();
  const [{ data: customer, error: customerError }, { data: totals, error: totalsError }] = await Promise.all([
    db.from("profiles").select("full_name, email").eq("id", id).eq("role", "customer").maybeSingle(),
    db.from("customer_topup_totals").select("*").eq("customer_id", id),
  ]);
  if (customerError || totalsError) throw new Error("Couldn't load customer history");
  if (!customer) notFound();
  const count = (totals ?? []).reduce((sum, row) => sum + row.order_count, 0);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const requested = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(requested) ? Math.max(1, Math.min(pages, requested)) : 1;
  const { data: orders, error } = await db.from("topup_orders")
    .select("id, topup_name, quantity, unit_price, total, currency, player_uid, whatsapp_number, receipt_path, status, created_at, closed_at")
    .eq("customer_id", id).order("created_at", { ascending: false }).order("id")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error("Couldn't load customer orders");
  const { data: signed } = orders?.length
    ? await db.storage.from(RECEIPTS_BUCKET).createSignedUrls(orders.map((order) => order.receipt_path), 300)
    : { data: [] };
  const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/customers" className="w-fit text-sm text-primary hover:underline">← Customers</Link>
      <PageHeader title={`${customer.full_name}'s top-ups`} description={customer.email} />
      <div className="rounded-xl border bg-card p-4">
        <p className="font-semibold">{count} top-up orders</p>
        <p className="mt-1 text-lg font-semibold text-primary">Total ordered: {(totals ?? []).map((row) => formatPrice(row.total_amount, row.currency)).join(" + ") || "No spending yet"}</p>
        <p className="mt-2 text-sm text-muted-foreground">Includes open and closed orders, including pending or unverified payments. Guest orders are not linked to this account.</p>
      </div>
      <OrderList status="all" focusId={null} orders={(orders ?? []).map(({ receipt_path, ...order }) => ({
        ...order, customerName: customer.full_name, customerEmail: customer.email, receiptUrl: urls.get(receipt_path) ?? null,
      }))} />
      {pages > 1 && <nav aria-label="Customer order pages" className="flex items-center justify-between gap-4 text-sm">
        {page > 1 ? <Link className="p-3 text-primary hover:underline" href={`?page=${page - 1}`}>Previous</Link> : <span />}
        <span>Page {page} of {pages}</span>
        {page < pages ? <Link className="p-3 text-primary hover:underline" href={`?page=${page + 1}`}>Next</Link> : <span />}
      </nav>}
    </div>
  );
}
