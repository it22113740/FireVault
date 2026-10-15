import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UsersIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { hasActiveAccess } from "@/lib/sales-admin-access";
import { createClient } from "@/lib/supabase/server";
import { whatsappUrl } from "@/lib/whatsapp";
import { ActiveSwitch } from "./active-switch";

export const metadata: Metadata = { title: "Sales admins" };

export default function SalesAdminsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sales admins"
        description="Each activation gives one month of access. After that, sellers are inactive until you switch them on again. Their live listings stay up."
      />
      <Suspense fallback={<SkeletonTableRows rows={5} />}>
        <SalesAdmins />
      </Suspense>
    </div>
  );
}

async function SalesAdmins() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, role, full_name, email, whatsapp_number, contact_number, is_active, active_until, created_at, listings!listings_created_by_fkey(count)"
    )
    .eq("role", "sales_admin")
    .order("created_at", { ascending: false });

  const sellers = data ?? [];
  if (sellers.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="No sales admins yet. Approve an application to add one."
        action={
          <Button variant="outline" render={<Link href="/admin/applications" />} nativeButton={false}>
            View applications
          </Button>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y rounded-xl border bg-card">
      {sellers.map((seller) => (
        <li
          key={seller.id}
          className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6"
        >
          <div className="min-w-0">
            <p className="truncate font-medium">{seller.full_name}</p>
            <p className="truncate text-sm text-muted-foreground">{seller.email}</p>
          </div>
          <div className="flex flex-col text-sm">
            {seller.whatsapp_number && (
              <a
                href={whatsappUrl(seller.whatsapp_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit hover:text-primary"
              >
                WhatsApp {seller.whatsapp_number}
              </a>
            )}
            {seller.contact_number && (
              <a href={`tel:${seller.contact_number}`} className="w-fit text-muted-foreground hover:text-primary">
                Call {seller.contact_number}
              </a>
            )}
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            <span className="font-medium tabular-nums text-foreground">
              {seller.listings[0]?.count ?? 0}
            </span>{" "}
            listings · since {formatDate(seller.created_at)}
          </div>
          <ActiveSwitch
            id={seller.id}
            name={seller.full_name}
            active={hasActiveAccess(seller)}
            status={accessStatus(seller)}
          />
        </li>
      ))}
    </ul>
  );
}

function accessStatus(seller: { is_active: boolean; active_until: string | null }) {
  if (!seller.is_active) return "Deactivated";
  if (!seller.active_until) return "No access period";
  const until = formatDate(seller.active_until);
  return new Date(seller.active_until) > new Date() ? `Until ${until}` : `Expired ${until}`;
}
