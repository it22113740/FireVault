import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StarIcon } from "lucide-react";
import { Reveal } from "@/components/interactive";
import { ReviewList, SellerAbout, SellerHeader, SellerListingGrid } from "@/components/seller-profile";
import { SkeletonGrid } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentProfile } from "@/lib/auth";
import { getSellerBySlug, getSellerReviews, type SellerSummary } from "@/lib/sellers";
import { getSettings } from "@/lib/settings";
import { getSellerListings } from "@/lib/store";
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
        <section id="reviews" className="flex scroll-mt-20 flex-col gap-4">
          <Reveal>
            <h2 className="text-xl font-bold">Ratings &amp; reviews</h2>
          </Reveal>
          <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
            <Reveal delay={0.1}>
              <Reviews seller={seller} />
            </Reveal>
          </Suspense>
        </section>
        <SellerAbout description={seller.description} />
        <section className="flex flex-col gap-4">
          <Reveal>
            <h2 className="text-xl font-bold">Accounts for sale</h2>
          </Reveal>
          <Suspense fallback={<SkeletonGrid count={4} />}>
            <SellerListings sellerId={seller.id} />
          </Suspense>
        </section>
      </div>
    </>
  );
}

async function SellerListings({ sellerId }: { sellerId: string }) {
  const [listings, settings] = await Promise.all([getSellerListings(sellerId), getSettings()]);
  return <SellerListingGrid listings={listings} currency={settings.currency} />;
}

// Reads the session (who's viewing), so it streams inside Suspense
async function Reviews({ seller }: { seller: SellerSummary }) {
  const [reviews, viewer] = await Promise.all([getSellerReviews(seller.id), getCurrentProfile()]);
  const mine = viewer?.role === "customer" ? reviews.find((review) => review.customerId === viewer.id) : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <ReviewList
        reviews={reviews}
        emptyText={`No feedback yet. Be the first to rate ${seller.name}.`}
        highlightId={mine?.id}
        renderActions={
          viewer?.role === "super_admin"
            ? (review) => <DeleteReviewButton id={review.id} reviewer={review.reviewerName} />
            : undefined
        }
      />

      {/* First on phones so rating the seller doesn't mean scrolling past every review */}
      <div className="order-first lg:sticky lg:top-24 lg:order-none">
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
