import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, EyeIcon, Gamepad2Icon, MapPinIcon } from "lucide-react";
import { CopyIdButton } from "@/components/copy-id-button";
import { ExchangeBadge } from "@/components/exchange-badge";
import { SellerLogo } from "@/components/seller-card";
import { AvailabilityBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomableImage } from "@/components/zoomable-image";
import { requireStaff } from "@/lib/auth";
import { formatDate, formatPrice, shortId } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getPublishedListing } from "@/lib/store";

type Props = PageProps<"/admin/sellers/[slug]/listings/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getPublishedListing((await params).id);
  return { title: listing ? listing.title : "Listing not found" };
}

export default function AdminSellerListingPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Skeleton className="aspect-[35/52] w-full rounded-2xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      }
    >
      <ListingDetail params={params} />
    </Suspense>
  );
}

// Read-only: only live listings are visible (drafts and reviews stay private
// to their seller), and there are no edit controls
async function ListingDetail({ params }: { params: Props["params"] }) {
  const [{ slug, id }] = await Promise.all([params, requireStaff()]);
  const [listing, settings] = await Promise.all([getPublishedListing(id), getSettings()]);
  // Shared listings open from any of their shops
  const seller = listing?.sellers.find((item) => item.slug === slug);
  if (!listing || !seller) notFound();
  const others = listing.sellers.filter((item) => item.id !== seller.id);

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/admin/sellers/${slug}`}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> {seller.name}
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10">
        {listing.imageUrl ? (
          <ZoomableImage src={listing.imageUrl} alt={listing.title} dimmed={listing.availability === "reserved"} />
        ) : (
          <div className="relative mx-auto aspect-[35/52] w-full max-w-[calc(80svh*35/52)] rounded-2xl border bg-muted">
            <Gamepad2Icon className="absolute inset-0 m-auto size-12 text-muted-foreground" />
          </div>
        )}

        <div className="flex flex-col gap-5 md:sticky md:top-24 md:self-start">
          <p className="flex w-fit items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            <EyeIcon className="size-4" /> View only
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <AvailabilityBadge availability={listing.availability} />
              {listing.exchangeAvailable && <ExchangeBadge label="Exchange possible" />}
            </div>
            <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance break-words sm:text-3xl">
              {listing.title}
            </h1>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon className="size-4" /> Region {listing.region}
            </p>
            {listing.publishedAt && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarIcon className="size-4" /> Live since {formatDate(listing.publishedAt)}
              </p>
            )}
            <p className="font-heading text-3xl font-bold text-primary tabular-nums">
              {formatPrice(listing.price, settings.currency)}
            </p>
          </div>

          <Link
            href={`/admin/sellers/${slug}`}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
          >
            <SellerLogo url={seller.logoUrl} name={seller.name} className="size-11" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Sold by</span>
              <span className="block truncate font-medium">{seller.name}</span>
            </span>
            <span className="text-sm text-primary">Seller details</span>
          </Link>
          {others.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Shared listing, also sold by{" "}
              {others.map((other, index) => (
                <span key={other.id}>
                  {index > 0 && ", "}
                  <Link href={`/admin/sellers/${other.slug}`} className="text-primary hover:underline">
                    {other.name}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}

          <CopyIdButton value={shortId(listing.id)} />

          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">About this account</h2>
            <p className="text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">
              {listing.description}
            </p>
          </section>

          <Link href={`/accounts/${listing.id}`} target="_blank" className="w-fit text-sm text-primary hover:underline">
            Open on the store
          </Link>
        </div>
      </div>
    </div>
  );
}
