import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ListIcon,
  MessageCircleIcon,
  PackageCheckIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { FacebookIcon, TikTokIcon } from "@/components/brand-icons";
import { CountUp } from "@/components/interactive";
import { ListingCard } from "@/components/listing-card";
import { StaggerItem } from "@/components/motion";
import { RatingSummary, SellerLogo } from "@/components/seller-card";
import { ShareButton } from "@/components/share-button";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatDate } from "@/lib/format";
import type { SellerReview, SellerSummary } from "@/lib/sellers";
import type { PublicListing } from "@/lib/store";
import { cn } from "@/lib/utils";
import { sellerMessage } from "@/lib/whatsapp-messages";

// The seller shop page pieces, shared by the public /sellers/[slug] page, the
// seller's own shop preview and the read-only seller directory in /admin.

export function SellerHeader({
  seller,
  backLink = { href: "/sellers", label: "All sellers" },
}: {
  seller: SellerSummary;
  /** null hides it (e.g. in the shop preview) */
  backLink?: { href: string; label: string } | null;
}) {
  const platforms = [
    { url: seller.whatsappGroupUrl, label: "WhatsApp group", icon: <MessageCircleIcon /> },
    { url: seller.tiktokUrl, label: "TikTok", icon: <TikTokIcon className="size-4" /> },
    { url: seller.facebookUrl, label: "Facebook", icon: <FacebookIcon className="size-4" /> },
  ].filter((platform): platform is typeof platform & { url: string } => !!platform.url);

  return (
    <header className="border-b">
      <div className="relative aspect-[3/1] max-h-80 w-full bg-muted sm:aspect-[4/1]">
        {seller.coverUrl && (
          <Image src={seller.coverUrl} alt="" fill priority sizes="100vw" className="object-cover" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent" />
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-6">
        {backLink ? (
          <Link
            href={backLink.href}
            className="mt-3 inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" /> {backLink.label}
          </Link>
        ) : (
          <div className="h-14" />
        )}
        <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
          <SellerLogo
            url={seller.logoUrl}
            name={seller.name}
            className="size-24 border-4 border-background sm:size-32"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance break-words sm:text-4xl">
              {seller.name}
            </h1>
            <a href="#reviews" className="w-fit">
              <RatingSummary seller={seller} />
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {seller.whatsappNumber && (
              <WhatsAppButton
                number={seller.whatsappNumber}
                message={sellerMessage(seller.name)}
                label="Contact via WhatsApp"
                className="flex-1 sm:flex-none"
              />
            )}
            <ShareButton title={seller.name} text={`${seller.name} on FireVault`} />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SellerStat icon={<ThumbsUpIcon className="text-success" />} label="Likes" value={seller.likes} />
          <SellerStat icon={<ThumbsDownIcon className="text-destructive" />} label="Dislikes" value={seller.dislikes} />
          <SellerStat icon={<PackageCheckIcon className="text-primary" />} label="Accounts sold" value={seller.totalSold} />
          <SellerStat icon={<ListIcon />} label="For sale now" value={seller.liveListings} />
        </dl>

        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <Button
                key={platform.label}
                variant="outline"
                size="lg"
                className="h-11"
                nativeButton={false}
                render={<a href={platform.url} target="_blank" rel="noopener noreferrer nofollow" />}
              >
                {platform.icon} {platform.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export function SellerStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 [&_svg]:size-5">
      {icon}
      <div>
        <dd className="font-heading text-xl font-bold tabular-nums">
          <CountUp value={value} />
        </dd>
        <dt className="text-xs text-muted-foreground">{label}</dt>
      </div>
    </div>
  );
}

export function SellerAbout({ description }: { description: string }) {
  if (!description) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-bold">About</h2>
      <p className="max-w-3xl leading-relaxed break-words whitespace-pre-line text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

export function SellerListingGrid({
  listings,
  currency,
  hrefFor,
}: {
  listings: PublicListing[];
  currency: string;
  /** Where each card links; defaults to the store page */
  hrefFor?: (listing: PublicListing) => string;
}) {
  if (listings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No accounts for sale right now.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing, index) => (
        <StaggerItem key={listing.id} index={index} as="li">
          <ListingCard listing={listing} currency={currency} href={hrefFor?.(listing)} />
        </StaggerItem>
      ))}
    </ul>
  );
}

export function ReviewList({
  reviews,
  emptyText,
  highlightId,
  renderActions,
}: {
  reviews: SellerReview[];
  emptyText: string;
  /** The viewer's own review, marked "(you)" */
  highlightId?: string;
  renderActions?: (review: SellerReview) => React.ReactNode;
}) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyText}</p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review) => (
        <li
          key={review.id}
          className={cn("flex gap-3 rounded-xl border bg-card p-4", review.id === highlightId && "border-primary/50")}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">
                {review.reviewerName}
                {review.id === highlightId && <span className="text-muted-foreground"> (you)</span>}
              </span>
              {review.rating && <StarRating value={review.rating} />}
              {review.reaction === "like" && <ThumbsUpIcon className="size-4 text-success" aria-label="Liked" />}
              {review.reaction === "dislike" && (
                <ThumbsDownIcon className="size-4 text-destructive" aria-label="Disliked" />
              )}
              <span className="text-xs text-muted-foreground">{formatDate(review.updatedAt)}</span>
            </div>
            {review.comment && (
              <p className="text-sm leading-relaxed break-words whitespace-pre-line text-muted-foreground">
                {review.comment}
              </p>
            )}
          </div>
          {renderActions?.(review)}
        </li>
      ))}
    </ul>
  );
}
