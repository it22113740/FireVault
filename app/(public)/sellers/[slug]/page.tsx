import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ListIcon,
  MessageCircleIcon,
  PackageCheckIcon,
  StarIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { FacebookIcon, TikTokIcon } from "@/components/brand-icons";
import { ListingCard } from "@/components/listing-card";
import { StaggerItem } from "@/components/motion";
import { RatingSummary, SellerLogo } from "@/components/seller-card";
import { ShareButton } from "@/components/share-button";
import { SkeletonGrid } from "@/components/skeletons";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getSellerBySlug, getSellerReviews, type SellerSummary } from "@/lib/sellers";
import { getSettings } from "@/lib/settings";
import { getSellerListings } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DeleteReviewButton } from "./delete-review-button";
import { FeedbackForm } from "./feedback-form";

type Props = PageProps<"/sellers/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await getSellerBySlug((await params).slug);
  if (!seller) return { title: "Seller not found" };
  const description = seller.description.slice(0, 160) || `${seller.name} on FireVault`;
  return {
    title: seller.name,
    description,
    openGraph: {
      title: seller.name,
      description,
      images: seller.coverUrl ? [{ url: seller.coverUrl, alt: seller.name }] : [],
    },
  };
}

export default function SellerPage({ params }: Props) {
  return (
    <div className="pb-16">
      <Suspense fallback={<SellerSkeleton />}>
        <Seller params={params} />
      </Suspense>
    </div>
  );
}

async function Seller({ params }: { params: Props["params"] }) {
  const seller = await getSellerBySlug((await params).slug);
  if (!seller) notFound();

  return (
    <>
      <SellerHeader seller={seller} />
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pt-8">
        {seller.description && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">About</h2>
            <p className="max-w-3xl leading-relaxed whitespace-pre-line text-muted-foreground">
              {seller.description}
            </p>
          </section>
        )}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Accounts for sale</h2>
          <Suspense fallback={<SkeletonGrid count={4} />}>
            <SellerListings sellerId={seller.id} />
          </Suspense>
        </section>
        <section id="reviews" className="flex scroll-mt-20 flex-col gap-4">
          <h2 className="text-xl font-bold">Ratings &amp; reviews</h2>
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <Reviews seller={seller} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

function SellerHeader({ seller }: { seller: SellerSummary }) {
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
        <Link
          href="/sellers"
          className="mt-3 inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> All sellers
        </Link>
        <div className="-mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
          <SellerLogo
            url={seller.logoUrl}
            name={seller.name}
            className="size-24 border-4 border-background sm:size-32"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{seller.name}</h1>
            <a href="#reviews" className="w-fit">
              <RatingSummary seller={seller} />
            </a>
          </div>
          <ShareButton title={seller.name} text={`${seller.name} on FireVault`} />
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={<ThumbsUpIcon className="text-success" />} label="Likes" value={seller.likes} />
          <Stat icon={<ThumbsDownIcon className="text-destructive" />} label="Dislikes" value={seller.dislikes} />
          <Stat icon={<PackageCheckIcon className="text-primary" />} label="Accounts sold" value={seller.totalSold} />
          <Stat icon={<ListIcon />} label="For sale now" value={seller.liveListings} />
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 [&_svg]:size-5">
      {icon}
      <div>
        <dd className="font-heading text-xl font-bold tabular-nums">{value.toLocaleString()}</dd>
        <dt className="text-xs text-muted-foreground">{label}</dt>
      </div>
    </div>
  );
}

async function SellerListings({ sellerId }: { sellerId: string }) {
  const [listings, settings] = await Promise.all([getSellerListings(sellerId), getSettings()]);
  if (listings.length === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No accounts for sale right now.</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((listing, index) => (
        <StaggerItem key={listing.id} index={index} as="li">
          <ListingCard listing={listing} currency={settings.currency} />
        </StaggerItem>
      ))}
    </ul>
  );
}

// Reads the session (who's viewing), so it streams inside Suspense
async function Reviews({ seller }: { seller: SellerSummary }) {
  const [reviews, viewer] = await Promise.all([getSellerReviews(seller.id), getCurrentProfile()]);
  const mine = viewer?.role === "customer" ? reviews.find((review) => review.customerId === viewer.id) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="flex flex-col gap-3">
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No feedback yet. Be the first to rate {seller.name}.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className={cn(
                  "flex gap-3 rounded-xl border bg-card p-4",
                  review.id === mine?.id && "border-primary/50"
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">
                      {review.reviewerName}
                      {review.id === mine?.id && <span className="text-muted-foreground"> (you)</span>}
                    </span>
                    {review.rating && <StarRating value={review.rating} />}
                    {review.reaction === "like" && <ThumbsUpIcon className="size-4 text-success" aria-label="Liked" />}
                    {review.reaction === "dislike" && (
                      <ThumbsDownIcon className="size-4 text-destructive" aria-label="Disliked" />
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(review.updatedAt)}</span>
                  </div>
                  {review.comment && (
                    <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                </div>
                {viewer?.role === "super_admin" && (
                  <DeleteReviewButton id={review.id} reviewer={review.reviewerName} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:sticky lg:top-24">
        {viewer?.role === "customer" ? (
          <FeedbackForm
            key={mine?.updatedAt ?? "new"}
            sellerId={seller.id}
            sellerName={seller.name}
            existing={mine ? { reaction: mine.reaction, rating: mine.rating, comment: mine.comment } : null}
          />
        ) : (
          <p className="flex items-start gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            <StarIcon className="mt-0.5 size-4 shrink-0 text-warning" />
            Customers can like, rate and review sellers from their customer account.
          </p>
        )}
      </div>
    </div>
  );
}

function SellerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="aspect-[3/1] max-h-80 w-full rounded-none sm:aspect-[4/1]" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4">
        <Skeleton className="-mt-20 size-28 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
