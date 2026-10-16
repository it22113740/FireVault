import { Suspense } from "react";
import type { Metadata } from "next";
import { ListIcon, StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LinkTabs } from "@/components/link-tabs";
import { ListingCard } from "@/components/listing-card";
import { PageHeader } from "@/components/page-header";
import { StaggerItem } from "@/components/motion";
import { SellerCard } from "@/components/seller-card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getSellers } from "@/lib/sellers";
import { getSettings } from "@/lib/settings";
import { getAllLiveListings, type PublicListing } from "@/lib/store";

export const metadata: Metadata = { title: "Sellers" };

type Props = PageProps<"/admin/sellers">;

export default function AdminSellersPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sellers"
        description="Every shop on FireVault and all live accounts, with ratings. View only."
      />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        }
      >
        <Sellers searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Sellers({ searchParams }: { searchParams: Props["searchParams"] }) {
  const [profile, params] = await Promise.all([requireStaff(), searchParams]);
  const view = params.view === "listings" ? "listings" : "shops";
  const [sellers, listings, settings] = await Promise.all([getSellers(), getAllLiveListings(), getSettings()]);

  return (
    <>
      <LinkTabs
        label="Sellers view"
        tabs={[
          { href: "/admin/sellers", label: "Shops", count: sellers.length, active: view === "shops" },
          {
            href: "/admin/sellers?view=listings",
            label: "All live listings",
            count: listings.length,
            active: view === "listings",
          },
        ]}
      />
      {view === "shops" ? (
        sellers.length === 0 ? (
          <EmptyState icon={StoreIcon} title="No shops yet." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sellers.map((seller, index) => (
              <StaggerItem key={seller.id} index={index} as="li" className="relative">
                <SellerCard seller={seller} href={`/admin/sellers/${seller.slug}`} />
                {seller.id === profile.id && (
                  <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    Your shop
                  </span>
                )}
              </StaggerItem>
            ))}
          </ul>
        )
      ) : listings.length === 0 ? (
        <EmptyState icon={ListIcon} title="No live listings right now." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing, index) => (
            <StaggerItem key={listing.id} index={index} as="li" className="flex flex-col gap-2">
              <ListingCard listing={listing} currency={settings.currency} href={listingHref(listing)} />
              <p className="truncate px-1 text-xs text-muted-foreground">
                by {listing.sellers.length ? listing.sellers.map((seller) => seller.name).join(", ") : "FireVault"}
                {listing.sellers.some((seller) => seller.id === profile.id) && (
                  <span className="font-medium text-primary"> · yours</span>
                )}
              </p>
            </StaggerItem>
          ))}
        </ul>
      )}
    </>
  );
}

// Seller listings open in the read-only admin view; FireVault's own (no shop)
// open on the store
function listingHref(listing: PublicListing) {
  return listing.seller ? `/admin/sellers/${listing.seller.slug}/listings/${listing.id}` : `/accounts/${listing.id}`;
}
