import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Listing } from "@/src/lib/listings";

function specs(listing: Listing) {
  return [
    listing.level !== null ? { label: "Level", value: String(listing.level) } : null,
    listing.rank ? { label: "Rank", value: listing.rank } : null,
    listing.region ? { label: "Region", value: listing.region } : null,
  ].filter((spec): spec is { label: string; value: string } => spec !== null);
}

function Cover({
  listing,
  sizes,
  priority,
}: {
  listing: Listing;
  sizes: string;
  priority?: boolean;
}) {
  if (!listing.images[0]) {
    return <div className="absolute inset-0 bg-[#2a211c]" />;
  }
  return (
    <Image
      src={listing.images[0]}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${listing.status === "reserved" ? "opacity-60 grayscale" : ""}`}
    />
  );
}

export function FeaturedListing({ listing }: { listing: Listing }) {
  const reserved = listing.status === "reserved";

  return (
    <Link
      href={`/accounts/${listing.id}`}
      className="grid border bg-card focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
    >
      <div className="relative aspect-[4/3] bg-muted md:aspect-auto md:min-h-80">
        <Cover listing={listing} sizes="(min-width: 768px) 50vw, 100vw" priority />
      </div>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">{reserved ? "Reserved" : "Available"}</p>
        <h3 className="font-display text-4xl leading-none font-bold font-stretch-[75%] tracking-tight">
          {listing.title}
        </h3>
        <SpecList listing={listing} />
        {listing.highlights[0] && (
          <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
            {listing.highlights[0]}
          </p>
        )}
        <p className="mt-auto font-display text-4xl leading-none font-bold font-stretch-[75%] text-primary tabular-nums">
          {formatPrice(listing.price)}
        </p>
      </div>
    </Link>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const reserved = listing.status === "reserved";

  return (
    <li>
      <Link
        href={`/accounts/${listing.id}`}
        className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 border-b py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
      >
        <div className="relative aspect-square bg-muted">
          <Cover listing={listing} sizes="112px" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display text-2xl leading-none font-bold font-stretch-[75%]">
            {listing.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{reserved ? "Reserved" : "Available"}</p>
          <div className="mt-2 sm:hidden">
            <p className="font-display text-2xl leading-none font-bold font-stretch-[75%] text-primary tabular-nums">
              {formatPrice(listing.price)}
            </p>
          </div>
        </div>
        <p className="hidden font-display text-3xl leading-none font-bold font-stretch-[75%] text-primary tabular-nums sm:block">
          {formatPrice(listing.price)}
        </p>
      </Link>
    </li>
  );
}

function SpecList({ listing }: { listing: Listing }) {
  const rows = specs(listing);
  if (rows.length === 0) return null;
  return (
    <dl className="grid grid-cols-3 gap-3 border-y py-3">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className="mt-1 truncate font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
