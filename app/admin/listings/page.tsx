import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon, ListIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LinkTabs } from "@/components/link-tabs";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { PublishStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatPrice } from "@/lib/format";
import {
  PUBLISH_STATUS_LABELS,
  canToggleAvailability,
  salesAdminCanEdit,
  type PublishStatus,
} from "@/lib/listings";
import { getSettings } from "@/lib/settings";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityToggle } from "./availability-toggle";
import { ListingFilters } from "./listing-filters";
import { ListingRowActions } from "./listing-row-actions";

export const metadata: Metadata = { title: "Listings" };

type Props = PageProps<"/admin/listings">;

const STATUS_TABS = Object.keys(PUBLISH_STATUS_LABELS) as PublishStatus[];

export default function ListingsPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Listings"
        actions={
          <Button size="lg" className="h-11" render={<Link href="/admin/listings/new" />} nativeButton={false}>
            <PlusIcon /> New listing
          </Button>
        }
      />
      <Suspense fallback={<SkeletonTableRows />}>
        <Listings searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function Listings({ searchParams }: { searchParams: Props["searchParams"] }) {
  const profile = await requireStaff();
  const isSuperAdmin = profile.role === "super_admin";
  const params = await searchParams;
  const status = STATUS_TABS.find((value) => value === first(params.status));
  const availability = (["available", "reserved"] as const).find(
    (value) => value === first(params.availability)
  );
  const region = first(params.region) || undefined;

  const supabase = await createClient();
  const settings = await getSettings();

  let query = supabase
    .from("listings")
    .select(
      "id, title, price, region, exchange_available, image_path, availability, publish_status, updated_at, owner:profiles!listings_created_by_fkey(full_name)"
    );
  // Sales admins: RLS already limits rows to their own; filter explicitly too
  if (!isSuperAdmin) query = query.eq("created_by", profile.id);
  if (status) query = query.eq("publish_status", status);
  if (availability) query = query.eq("availability", availability);
  if (region) query = query.eq("region", region);

  const countFor = (value: PublishStatus) => {
    const count = supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("publish_status", value);
    return isSuperAdmin ? count : count.eq("created_by", profile.id);
  };

  const [{ data }, ...counts] = await Promise.all([
    query.order("updated_at", { ascending: false }).limit(200),
    ...STATUS_TABS.map(countFor),
  ]);
  const listings = data ?? [];

  const tabHref = (value?: PublishStatus) => {
    const next = new URLSearchParams();
    if (value) next.set("status", value);
    if (availability) next.set("availability", availability);
    if (region) next.set("region", region);
    const query = next.toString();
    return query ? `/admin/listings?${query}` : "/admin/listings";
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <LinkTabs
          label="Listing status"
          tabs={[
            { href: tabHref(), label: "All", active: !status },
            ...STATUS_TABS.map((value, index) => ({
              href: tabHref(value),
              label: PUBLISH_STATUS_LABELS[value],
              count: counts[index].count,
              active: value === status,
            })),
          ]}
        />
        <ListingFilters regions={settings.regions} availability={availability} region={region} />
      </div>

      {listings.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title={
            status || availability || region
              ? "No listings match these filters."
              : "No listings yet. Create your first one."
          }
          action={
            <Button variant="outline" render={<Link href="/admin/listings/new" />} nativeButton={false}>
              New listing
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {listings.map((listing) => {
            const editable = isSuperAdmin || salesAdminCanEdit(listing.publish_status);
            return (
              <li
                key={listing.id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 p-4 md:grid-cols-[3.5rem_minmax(0,1fr)_8rem_9rem_auto] md:items-center"
              >
                <div className="relative size-14 overflow-hidden rounded-lg bg-muted">
                  {listing.image_path ? (
                    <Image
                      src={publicImageUrl(listing.image_path)}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {editable ? (
                      <Link href={`/admin/listings/${listing.id}/edit`} className="hover:text-primary">
                        {listing.title}
                      </Link>
                    ) : (
                      listing.title
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[
                      listing.price > 0 ? formatPrice(listing.price, settings.currency) : "No price",
                      listing.region || "No region",
                      listing.exchange_available ? "Exchange possible" : null,
                      isSuperAdmin ? listing.owner?.full_name : null,
                      `Updated ${formatDate(listing.updated_at)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="col-start-2 md:col-start-auto">
                  <PublishStatusBadge status={listing.publish_status} />
                </div>
                <div className="col-start-2 md:col-start-auto">
                  {canToggleAvailability(listing.publish_status, isSuperAdmin) &&
                  listing.publish_status !== "archived" ? (
                    <AvailabilityToggle id={listing.id} availability={listing.availability} />
                  ) : null}
                </div>
                <div className="col-start-2 md:col-start-auto md:justify-self-end">
                  <ListingRowActions
                    id={listing.id}
                    title={listing.title}
                    status={listing.publish_status}
                    editable={editable}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
