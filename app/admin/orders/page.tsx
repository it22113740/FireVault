import { Suspense } from "react";
import type { Metadata } from "next";
import { LinkTabs } from "@/components/link-tabs";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { requireSuperAdmin } from "@/lib/auth";
import type { Enums } from "@/lib/database.types";
import { RECEIPTS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";
import { OrderList } from "./order-list";

export const metadata: Metadata = { title: "Top-up orders" };

const STATUSES: { value: Enums<"topup_order_status">; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

// Receipts are private; the page gets short-lived signed URLs
const RECEIPT_URL_TTL = 5 * 60;

type Props = PageProps<"/admin/orders">;

export default function OrdersPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Top-up orders"
        description="Check the proof of payment, top up the player UID, message the customer, then close the order."
      />
      <Suspense fallback={<SkeletonTableRows rows={4} />}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Orders({ searchParams }: { searchParams: Props["searchParams"] }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const supabase = await createClient();

  // ?order=<id> comes from the WhatsApp/email alert: open its tab, show it first
  const focusId = typeof params.order === "string" && uuidSchema.safeParse(params.order).success ? params.order : null;
  const { data: focused } = focusId
    ? await supabase.from("topup_orders").select("status").eq("id", focusId).maybeSingle()
    : { data: null };
  const status =
    STATUSES.find((option) => option.value === params.status)?.value ?? focused?.status ?? "open";

  const [{ data: orders }, ...counts] = await Promise.all([
    supabase
      .from("topup_orders")
      .select(
        "id, topup_name, quantity, unit_price, total, currency, player_uid, whatsapp_number, receipt_path, payment_method, status, created_at, closed_at, customer:profiles!topup_orders_customer_id_fkey(full_name, email)"
      )
      .eq("status", status)
      // Oldest open order first (first come, first served); newest closed first
      .order("created_at", { ascending: status === "open" })
      .limit(100),
    ...STATUSES.map((option) =>
      supabase.from("topup_orders").select("id", { count: "exact", head: true }).eq("status", option.value)
    ),
  ]);

  const rows = orders ?? [];
  const { data: signed } = rows.length
    ? await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrls(rows.map((row) => row.receipt_path), RECEIPT_URL_TTL)
    : { data: [] };
  const receiptUrls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl] as const));

  const sorted = focusId ? [...rows].sort((a, b) => Number(b.id === focusId) - Number(a.id === focusId)) : rows;

  return (
    <>
      <LinkTabs
        label="Order status"
        tabs={STATUSES.map((option, index) => ({
          href: `/admin/orders?status=${option.value}`,
          label: option.label,
          count: counts[index].count,
          active: option.value === status,
        }))}
      />
      <OrderList
        status={status}
        focusId={focusId}
        orders={sorted.map(({ customer, receipt_path, ...row }) => ({
          ...row,
          customerName: customer?.full_name ?? "Guest",
          customerEmail: customer?.email ?? null,
          receiptUrl: receiptUrls.get(receipt_path) ?? null,
        }))}
      />
    </>
  );
}
