import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatPrice, type Listing } from "@/src/lib/listings";
import { PAYMENT_SLIPS_BUCKET } from "@/src/lib/order-schema";
import { NEXT_ORDER_STATUSES, shortOrderId, type Order } from "@/src/lib/orders";
import { paymentMethodLabel } from "@/src/lib/payment-methods";
import { createClient } from "@/src/lib/supabase/server";
import { StatusBadge } from "../../posts/status-badge";
import { saveAdminNote } from "../actions";
import { OrderStatusBadge } from "../order-status-badge";
import { AdminNoteForm } from "./admin-note-form";
import { OrderActions } from "./order-actions";

type Props = PageProps<"/admin/orders/[id]">;

// Signed slip URLs expire, so a stale tab needs a reload to view the slip again
const SLIP_URL_TTL_SECONDS = 60 * 10;

export default function OrderPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/orders"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Orders
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading order…</p>}>
        <OrderDetails params={params} />
      </Suspense>
    </div>
  );
}

async function OrderDetails({ params }: { params: Props["params"] }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, listings(id, title, status)")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const order = data as Order & { listings: Pick<Listing, "id" | "title" | "status"> | null };

  let slipUrl: string | null = null;
  if (order.payment_slip_url) {
    const { data: signed } = await supabase.storage
      .from(PAYMENT_SLIPS_BUCKET)
      .createSignedUrl(order.payment_slip_url, SLIP_URL_TTL_SECONDS);
    slipUrl = signed?.signedUrl ?? null;
  }
  const slipIsPdf = order.payment_slip_url?.endsWith(".pdf");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Order {shortOrderId(order.id)}</h1>
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleString()}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderActions orderId={order.id} next={NEXT_ORDER_STATUSES[order.status]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyer</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <Detail label="Name">{order.buyer_name}</Detail>
              <Detail label="Phone">
                <a href={`tel:${order.buyer_phone}`} className="hover:text-primary">
                  {order.buyer_phone}
                </a>
              </Detail>
              <Detail label="Email">
                {order.buyer_email ? (
                  <a href={`mailto:${order.buyer_email}`} className="hover:text-primary">
                    {order.buyer_email}
                  </a>
                ) : (
                  "—"
                )}
              </Detail>
              <Detail label="Order ID">
                <span className="flex items-center gap-1 font-mono text-xs">
                  <span className="truncate">{order.id}</span>
                  <CopyButton value={order.id} label="Copy order ID" />
                </span>
              </Detail>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid gap-3 text-sm">
              <Detail label="Amount">
                <span className="font-semibold tabular-nums">{formatPrice(order.amount)}</span>
              </Detail>
              <Detail label="Method">{paymentMethodLabel(order.payment_method)}</Detail>
            </dl>
            {slipUrl ? (
              <div className="flex flex-col gap-2">
                {slipIsPdf ? (
                  <div className="flex items-center gap-2 rounded-lg border p-4 text-sm">
                    <FileTextIcon className="size-5 text-muted-foreground" /> PDF slip
                  </div>
                ) : (
                  // Plain <img>: signed URLs are short-lived and must not be cached by next/image
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slipUrl}
                    alt="Payment slip"
                    className="max-h-96 w-full rounded-lg border bg-muted object-contain"
                  />
                )}
                <a
                  href={slipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open slip <ExternalLinkIcon className="size-3.5" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {order.payment_slip_url ? "Couldn't load the slip." : "No slip uploaded."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {order.listings ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{order.listings.title}</span>
                  <StatusBadge status={order.listings.status} />
                </div>
                <div className="flex gap-4">
                  <Link
                    href={`/admin/posts/${order.listings.id}/edit`}
                    className="text-primary hover:underline"
                  >
                    Edit listing
                  </Link>
                  <Link
                    href={`/accounts/${order.listings.id}`}
                    className="text-primary hover:underline"
                  >
                    View in store
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Listing not found.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Admin note</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminNoteForm
              action={saveAdminNote.bind(null, order.id)}
              note={order.admin_note}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
