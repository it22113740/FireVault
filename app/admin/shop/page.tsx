import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SkeletonForm } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { ReviewList, SellerListingGrid } from "@/components/seller-profile";
import { requireRole } from "@/lib/auth";
import { getSellerById, getSellerReviews } from "@/lib/sellers";
import { getSettings } from "@/lib/settings";
import { SITE_URL } from "@/lib/site";
import { publicImageUrl } from "@/lib/storage";
import { getSellerListings } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { ShopForm } from "./shop-form";

export const metadata: Metadata = { title: "My shop" };

export default function ShopPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<SkeletonForm />}>
        <Shop />
      </Suspense>
    </div>
  );
}

async function Shop() {
  const profile = await requireRole("sales_admin");
  const supabase = await createClient();
  const { data: shop } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("id", profile.id)
    .maybeSingle();
  if (!shop) redirect("/admin/onboarding");

  // Ratings, reviews and live listings for the Preview tab
  const [seller, reviews, listings, settings] = await Promise.all([
    getSellerById(profile.id),
    getSellerReviews(profile.id),
    getSellerListings(profile.id),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="My shop"
        description="Your public shop page, shown to customers with your ratings and reviews. Use Preview to check it before saving."
        actions={
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            render={<Link href={`/sellers/${shop.slug}`} target="_blank" />}
            nativeButton={false}
          >
            View shop <ExternalLinkIcon />
          </Button>
        }
      />
      <ShopForm
        siteUrl={SITE_URL}
        logoUrl={publicImageUrl(shop.logo_path)}
        coverUrl={publicImageUrl(shop.cover_path)}
        defaults={{
          displayName: shop.display_name,
          slug: shop.slug,
          description: shop.description,
          whatsappGroupUrl: shop.whatsapp_group_url ?? "",
          tiktokUrl: shop.tiktok_url ?? "",
          facebookUrl: shop.facebook_url ?? "",
          totalSold: String(shop.total_sold),
        }}
        preview={
          seller
            ? {
                seller,
                reviews: <ReviewList reviews={reviews.slice(0, 3)} emptyText="No feedback yet." />,
                listings: <SellerListingGrid listings={listings} currency={settings.currency} />,
              }
            : undefined
        }
      />
    </>
  );
}
