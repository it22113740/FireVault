import { Suspense } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/src/lib/listings";
import { ORDER_STATUSES, shortOrderId, type Order, type OrderStatus } from "@/src/lib/orders";
import { paymentMethodLabel } from "@/src/lib/payment-methods";
import { createClient } from "@/src/lib/supabase/server";
import { OrderStatusBadge } from "./order-status-badge";

type Props = PageProps<"/admin/orders">;

export default function OrdersPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading orders…</p>}>
        <Orders searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function parseStatus(value: string | string[] | undefined): OrderStatus | undefined {
  return ORDER_STATUSES.find((status) => status === value);
}

async function Orders({ searchParams }: { searchParams: Props["searchParams"] }) {
  const status = parseStatus((await searchParams).status);

  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select("id, buyer_name, buyer_phone, amount, payment_method, status, created_at, listings(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;

  // Many-to-one embed returns an object; untyped client infers an array
  const orders = (data ?? []) as unknown as (Pick<
    Order,
    "id" | "buyer_name" | "buyer_phone" | "amount" | "payment_method" | "status" | "created_at"
  > & { listings: { title: string } | null })[];

  return (
    <>
      <nav className="flex gap-1 overflow-x-auto pb-1" aria-label="Filter by status">
        {[undefined, ...ORDER_STATUSES].map((option) => (
          <Link
            key={option ?? "all"}
            href={option ? `/admin/orders?status=${option}` : "/admin/orders"}
            aria-current={option === status ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm capitalize transition",
              option === status
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option ?? "All"}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="text-sm text-destructive">Couldn&apos;t load orders.</p>
      ) : orders.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {status ?? ""} orders.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Listing</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Placed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="relative">
                <TableCell className="font-mono text-xs">
                  {/* Stretched link makes the whole row clickable */}
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="after:absolute after:inset-0 hover:text-primary"
                  >
                    {shortOrderId(order.id)}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{order.buyer_name}</div>
                  <div className="text-xs text-muted-foreground">{order.buyer_phone}</div>
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {order.listings?.title ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(order.amount)}
                </TableCell>
                <TableCell>{paymentMethodLabel(order.payment_method)}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
