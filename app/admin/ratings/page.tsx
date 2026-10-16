import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon, MessageSquareTextIcon, StarIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StarRating } from "@/components/star-rating";
import { ReviewList, SellerStat } from "@/components/seller-profile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireRole } from "@/lib/auth";
import { getSellerById, getSellerReviews } from "@/lib/sellers";

export const metadata: Metadata = { title: "Reviews & ratings" };

export default function RatingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-64" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        }
      >
        <Ratings />
      </Suspense>
    </div>
  );
}

// Read-only: customers write feedback on the public shop page; only a super
// admin can remove a review
async function Ratings() {
  const profile = await requireRole("sales_admin");
  const [seller, reviews] = await Promise.all([getSellerById(profile.id), getSellerReviews(profile.id)]);

  return (
    <>
      <PageHeader
        title="Reviews & ratings"
        description="What customers say about your shop. Feedback appears here as soon as it's posted."
        actions={
          seller && (
            <Button
              variant="outline"
              size="lg"
              className="h-11"
              render={<Link href={`/sellers/${seller.slug}#reviews`} target="_blank" />}
              nativeButton={false}
            >
              View on shop page <ExternalLinkIcon />
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-3">
          <StarIcon className="size-8 fill-warning text-warning" />
          <span className="font-heading text-4xl font-bold tabular-nums">
            {seller?.ratingAvg != null ? seller.ratingAvg.toFixed(1) : "–"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {seller?.ratingAvg != null && <StarRating value={seller.ratingAvg} size="size-5" />}
          <p className="text-sm text-muted-foreground">
            {seller?.ratingCount
              ? `Average of ${seller.ratingCount} ${seller.ratingCount === 1 ? "rating" : "ratings"}`
              : "No star ratings yet"}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SellerStat icon={<ThumbsUpIcon className="text-success" />} label="Likes" value={seller?.likes ?? 0} />
        <SellerStat icon={<ThumbsDownIcon className="text-destructive" />} label="Dislikes" value={seller?.dislikes ?? 0} />
        <SellerStat icon={<StarIcon className="text-warning" />} label="Star ratings" value={seller?.ratingCount ?? 0} />
        <SellerStat icon={<MessageSquareTextIcon className="text-primary" />} label="Written reviews" value={seller?.reviewCount ?? 0} />
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">All feedback</h2>
        <ReviewList
          reviews={reviews}
          emptyText="No feedback yet. Share your shop link with buyers so they can rate you."
        />
      </section>
    </>
  );
}
