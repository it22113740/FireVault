import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { PAGE_SIZE, getPublishedListings, parseListingFilters } from "@/lib/store";
import { AccountFilters } from "./account-filters";
import { AccountsSkeleton } from "./accounts-skeleton";
import { FilterNavigationProvider, FilteredResults } from "./filter-navigation";
import { Pagination } from "./pagination";

export const metadata: Metadata = {
  title: "Accounts for sale",
  description: "Browse game accounts by region and price, then buy directly on WhatsApp.",
};

type Props = PageProps<"/accounts">;

export default function AccountsPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Accounts for sale</h1>
        <p className="mt-2 text-muted-foreground">
          Tap an account for details, then chat with the seller on WhatsApp.
        </p>
      </div>
      <Suspense fallback={<AccountsSkeleton />}>
        <Accounts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Accounts({ searchParams }: { searchParams: Props["searchParams"] }) {
  const filters = parseListingFilters(await searchParams);
  const [settings, { listings, total }] = await Promise.all([
    getSettings(),
    getPublishedListings(filters),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(filters.region || filters.availability || filters.min !== undefined || filters.max !== undefined);

  return (
    <FilterNavigationProvider>
      <div className="flex flex-col gap-6">
        <AccountFilters regions={settings.regions} filters={filters} />
        <FilteredResults>
          {listings.length === 0 ? (
            <EmptyState
              icon={SearchXIcon}
              title={
                filtered
                  ? filters.region
                    ? `No accounts in ${filters.region} match these filters yet.`
                    : "No accounts match these filters yet."
                  : "No accounts for sale right now. Check back soon."
              }
              action={
                filtered ? (
                  <Button variant="outline" render={<Link href="/accounts" />} nativeButton={false}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-8">
              <p className="text-sm text-muted-foreground">
                {total} {total === 1 ? "account" : "accounts"}
              </p>
              {/* Keyed by filters so new results fade + stagger in */}
              <ul
                key={JSON.stringify(filters)}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {listings.map((listing, index) => (
                  <StaggerItem key={listing.id} index={index} as="li">
                    <ListingCard listing={listing} currency={settings.currency} priority={index < 4} />
                  </StaggerItem>
                ))}
              </ul>
              <Pagination page={filters.page} totalPages={totalPages} />
            </div>
          )}
        </FilteredResults>
      </div>
    </FilterNavigationProvider>
  );
}
