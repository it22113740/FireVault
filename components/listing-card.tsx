import Image from "next/image";
import Link from "next/link";
import { Gamepad2Icon, MapPinIcon } from "lucide-react";
import { ExchangeBadge } from "@/components/exchange-badge";
import { AvailabilityBadge } from "@/components/status-badge";
import { formatPrice } from "@/lib/format";
import type { PublicListing } from "@/lib/store";
import { cn } from "@/lib/utils";

// Same block sizes as SkeletonCard (image, 2 text lines, price, button) so
// streamed cards don't shift the layout
export function ListingCard({
  listing,
  currency,
  priority,
}: {
  listing: PublicListing;
  currency: string;
  priority?: boolean;
}) {
  const reserved = listing.availability === "reserved";

  return (
    <Link
      href={`/accounts/${listing.id}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition duration-200",
        "hover:border-primary/50 hover:shadow-[0_12px_32px_-16px_var(--brand-from)] md:hover:-translate-y-1",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      )}
    >
      {/* 3500 × 5200 portrait (LISTING_IMAGE_SIZE) */}
      <div className="relative aspect-[35/52] overflow-hidden bg-muted">
        {listing.imageUrl ? (
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 280px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={cn("object-contain", reserved && "opacity-60 grayscale")}
          />
        ) : (
          <Gamepad2Icon className="absolute inset-0 m-auto size-10 text-muted-foreground" />
        )}
        {listing.exchangeAvailable && (
          <ExchangeBadge className="absolute top-2 left-2 bg-background/85 backdrop-blur" />
        )}
        {reserved && (
          <span className="absolute top-3 -right-9 w-32 rotate-45 bg-warning py-1 text-center text-xs font-bold text-primary-foreground shadow">
            Reserved
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-heading text-base leading-5 font-semibold">{listing.title}</h3>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPinIcon className="size-3.5" aria-hidden /> {listing.region}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="font-heading text-xl leading-7 font-bold text-primary tabular-nums">
            {formatPrice(listing.price, currency)}
          </p>
          <AvailabilityBadge availability={listing.availability} />
        </div>
        <span className="mt-2 flex h-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors group-hover:border-primary/50 group-hover:bg-primary/10">
          View details
        </span>
      </div>
    </Link>
  );
}
