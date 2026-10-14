import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, type Listing } from "@/src/lib/listings";
import { getStoreListing } from "@/src/lib/store";
import { ImageGallery } from "./image-gallery";

type Props = PageProps<"/accounts/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getStoreListing((await params).id);
  if (!listing) return {};
  return {
    title: listing.title,
    description: listing.description?.slice(0, 160),
    openGraph: { images: listing.images.slice(0, 1) },
  };
}

export default function AccountPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-28 lg:pb-16">
      <Link
        href="/#accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All accounts
      </Link>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountDetails params={params} />
      </Suspense>
    </div>
  );
}

async function AccountDetails({ params }: { params: Props["params"] }) {
  const listing = await getStoreListing((await params).id);
  if (!listing) notFound();

  const reserved = listing.status === "reserved";
  const stats = [
    { label: "Level", value: listing.level },
    { label: "Rank", value: listing.rank },
    { label: "Region", value: listing.region },
  ].filter((stat) => stat.value !== null && stat.value !== "");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
      <ImageGallery images={listing.images} title={listing.title} />

      <div className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
        <div className="flex flex-col gap-3">
          {reserved && (
            <Badge variant="secondary" className="w-fit">
              Reserved
            </Badge>
          )}
          <h1 className="font-display text-4xl leading-none font-bold font-stretch-[75%] tracking-tight sm:text-5xl">
            {listing.title}
          </h1>
          <p className="font-display text-4xl leading-none font-bold font-stretch-[75%] text-primary tabular-nums">
            {formatPrice(listing.price)}
          </p>
        </div>

        {stats.length > 0 && (
          <dl className="divide-y border-y">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="truncate font-medium">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <OrderButton listing={listing} className="hidden lg:flex" />

        {listing.highlights.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">Highlights</h2>
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
              {listing.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {highlight}
                </li>
              ))}
            </ul>
          </section>
        )}

        {listing.description && (
          <section className="flex flex-col gap-2">
            <h2 className="font-semibold">About this account</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {listing.description}
            </p>
          </section>
        )}

        <p className="max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
          The login is sent after your payment is confirmed.
        </p>
      </div>

      {/* Mobile: keep the price and Order Now always within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <p className="font-display text-3xl leading-none font-bold font-stretch-[75%] text-primary tabular-nums">
            {formatPrice(listing.price)}
          </p>
          <OrderButton listing={listing} className="flex-1" />
        </div>
      </div>
    </div>
  );
}

function OrderButton({ listing, className }: { listing: Listing; className?: string }) {
  if (listing.status !== "available") {
    return (
      <Button size="lg" disabled className={className}>
        Reserved
      </Button>
    );
  }
  return (
    <Button
      size="lg"
      className={className}
      render={<Link href={`/checkout/${listing.id}`} />}
      nativeButton={false}
    >
      Order now
    </Button>
  );
}

function AccountSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
      <div className="aspect-video animate-pulse bg-muted" />
      <div className="flex flex-col gap-3">
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-9 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
