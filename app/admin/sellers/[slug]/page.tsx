import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeIcon } from "lucide-react";
import { ReviewList, SellerAbout, SellerHeader, SellerListingGrid } from "@/components/seller-profile";
import { SkeletonGrid } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getSellerBySlug, getSellerReviews, type SellerSummary } from "@/lib/sellers";
import { getSettings } from "@/lib/settings";
import { getSellerListings } from "@/lib/store";

type Props = PageProps<"/admin/sellers/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const seller = await getSellerBySlug((await params).slug);
  return { title: seller ? seller.name : "Seller not found" };
}

// Read-only view of any shop for staff: the same details customers see, with
// listings opening inside /admin. Nothing here can be edited.
export default function AdminSellerPage({ params }: Props) {
  return (
    <div className="-mx-4 -mt-4 flex flex-col sm:mx-0 sm:mt-0">
      <Suspense fallback={<Skeleton className="aspect-[3/1] max-h-80 w-full rounded-xl" />}>
        <Seller params={params} />
      </Suspense>
    </div>
  );
}

async function Seller({ params }: { params: Props["params"] }) {
  const [{ slug }] = await Promise.all([params, requireStaff()]);
  const seller = await getSellerBySlug(slug);
  if (!seller) notFound();

  return (
    <div className="overflow-hidden bg-background sm:rounded-xl sm:border">
      <SellerHeader seller={seller} backLink={{ href: "/admin/sellers", label: "All sellers" }} />
      <div className="flex flex-col gap-10 px-4 pt-6 pb-8">
        <p className="flex w-fit items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          <EyeIcon className="size-4" /> View only. You can&apos;t change another seller&apos;s shop or listings.
        </p>
        <SellerAbout description={seller.description} />
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Accounts for sale</h2>
          <Suspense fallback={<SkeletonGrid count={4} />}>
            <Listings seller={seller} />
          </Suspense>
        </section>
        <section id="reviews" className="flex scroll-mt-20 flex-col gap-4">
          <h2 className="text-xl font-bold">Ratings &amp; reviews</h2>
          <Suspense fallback={<Skeleton className="h-48 rounded-xl" />}>
            <Reviews seller={seller} />
          </Suspense>
        </section>
        <Link href={`/sellers/${seller.slug}`} target="_blank" className="w-fit text-sm text-primary hover:underline">
          Open the public shop page
        </Link>
      </div>
    </div>
  );
}

async function Listings({ seller }: { seller: SellerSummary }) {
  const [listings, settings] = await Promise.all([getSellerListings(seller.id), getSettings()]);
  return (
    <SellerListingGrid
      listings={listings}
      currency={settings.currency}
      hrefFor={(listing) => `/admin/sellers/${seller.slug}/listings/${listing.id}`}
    />
  );
}

async function Reviews({ seller }: { seller: SellerSummary }) {
  const reviews = await getSellerReviews(seller.id);
  return <ReviewList reviews={reviews} emptyText={`No feedback for ${seller.name} yet.`} />;
}
