import Image from "next/image";
import Link from "next/link";
import { PackageCheckIcon, StoreIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { StarRating } from "@/components/star-rating";
import type { SellerSummary } from "@/lib/sellers";
import { cn } from "@/lib/utils";

export function SellerCard({ seller }: { seller: SellerSummary }) {
  return (
    <Link
      href={`/sellers/${seller.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition duration-200",
        "hover:border-primary/50 hover:shadow-[0_12px_32px_-16px_var(--brand-from)] md:hover:-translate-y-1",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      )}
    >
      <div className="relative aspect-[3/1] bg-muted">
        {seller.coverUrl && (
          <Image src={seller.coverUrl} alt="" fill sizes="(min-width: 1024px) 380px, 100vw" className="object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 pt-0">
        <div className="-mt-8 flex items-end gap-3">
          <SellerLogo url={seller.logoUrl} name={seller.name} className="size-16 border-4 border-card" />
          <h3 className="min-w-0 truncate pb-1 font-heading text-lg font-semibold">{seller.name}</h3>
        </div>
        <RatingSummary seller={seller} />
        <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ThumbsUpIcon className="size-4 text-success" /> {seller.likes}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsDownIcon className="size-4 text-destructive" /> {seller.dislikes}
          </span>
          <span className="flex items-center gap-1">
            <PackageCheckIcon className="size-4" /> {seller.totalSold.toLocaleString()} sold
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RatingSummary({ seller, className }: { seller: SellerSummary; className?: string }) {
  if (seller.ratingAvg === null) {
    return <p className={cn("text-sm text-muted-foreground", className)}>No ratings yet</p>;
  }
  return (
    <p className={cn("flex items-center gap-2 text-sm", className)}>
      <StarRating value={seller.ratingAvg} />
      <span className="font-semibold tabular-nums">{seller.ratingAvg.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({seller.ratingCount} {seller.ratingCount === 1 ? "rating" : "ratings"})
      </span>
    </p>
  );
}

export function SellerLogo({ url, name, className }: { url: string; name: string; className?: string }) {
  return (
    <span className={cn("relative shrink-0 overflow-hidden rounded-full bg-muted", className)}>
      {url ? (
        <Image src={url} alt={`${name} logo`} fill sizes="128px" className="object-cover" />
      ) : (
        <StoreIcon className="absolute inset-0 m-auto size-1/2 text-muted-foreground" />
      )}
    </span>
  );
}
