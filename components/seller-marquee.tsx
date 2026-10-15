import Link from "next/link";
import { PackageCheckIcon, ThumbsUpIcon } from "lucide-react";
import { SellerLogo } from "@/components/seller-card";
import { StarRating } from "@/components/star-rating";
import type { SellerSummary } from "@/lib/sellers";

// Seconds per seller; a longer list scrolls at the same speed, not faster
const SECONDS_PER_SELLER = 5;
// Fill at least this many slots per half so short lists still span wide screens
const MIN_ITEMS_PER_HALF = 8;

// Endless loop of seller cards. The track holds the list twice and slides
// by exactly half, so the loop is seamless. Pauses on hover/focus; with
// reduced motion it becomes a still, swipeable row.
export function SellerMarquee({ sellers }: { sellers: SellerSummary[] }) {
  const repeats = Math.max(1, Math.ceil(MIN_ITEMS_PER_HALF / sellers.length));
  const half = Array.from({ length: repeats }, () => sellers).flat();
  const duration = `${Math.max(20, half.length * SECONDS_PER_SELLER)}s`;

  return (
    <div className="group overflow-hidden mask-x-from-90% mask-x-to-100% motion-reduce:overflow-x-auto motion-reduce:mask-none">
      <ul
        className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ "--marquee-duration": duration } as React.CSSProperties}
      >
        {[...half, ...half].map((seller, index) => {
          // Only the first copy of each seller is real for assistive tech
          const duplicate = index >= sellers.length;
          return (
            <li key={`${seller.id}-${index}`} className="w-72 shrink-0 pr-4" aria-hidden={duplicate || undefined}>
              <SellerChip seller={seller} tabIndex={duplicate ? -1 : undefined} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SellerChip({ seller, tabIndex }: { seller: SellerSummary; tabIndex?: number }) {
  return (
    <Link
      href={`/sellers/${seller.slug}`}
      tabIndex={tabIndex}
      className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <SellerLogo url={seller.logoUrl} name={seller.name} className="size-14" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-heading font-semibold">{seller.name}</p>
        {seller.ratingAvg === null ? (
          <p className="text-xs text-muted-foreground">No ratings yet</p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs">
            <StarRating value={seller.ratingAvg} size="size-3.5" />
            <span className="font-semibold tabular-nums">{seller.ratingAvg.toFixed(1)}</span>
            <span className="text-muted-foreground">({seller.ratingCount})</span>
          </p>
        )}
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUpIcon className="size-3.5 text-success" /> {seller.likes}
          </span>
          <span className="flex items-center gap-1">
            <PackageCheckIcon className="size-3.5" /> {seller.totalSold.toLocaleString()} sold
          </span>
        </p>
      </div>
    </Link>
  );
}
