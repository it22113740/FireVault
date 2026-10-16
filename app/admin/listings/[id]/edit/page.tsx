import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SkeletonForm } from "@/components/skeletons";
import { PublishStatusBadge } from "@/components/status-badge";
import { requireStaff } from "@/lib/auth";
import { publishesDirectly, salesAdminCanEdit } from "@/lib/listings";
import { getSellerOptions } from "@/lib/seller-options";
import { getSettings } from "@/lib/settings";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";
import { ListingForm } from "../../listing-form";

export const metadata: Metadata = { title: "Edit listing" };

type Props = PageProps<"/admin/listings/[id]/edit">;

export default function EditListingPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/listings"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Listings
      </Link>
      <PageHeader title="Edit listing" />
      <Suspense fallback={<SkeletonForm />}>
        <EditListing params={params} />
      </Suspense>
    </div>
  );
}

async function EditListing({ params }: { params: Props["params"] }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const [profile, settings, supabase] = await Promise.all([requireStaff(), getSettings(), createClient()]);
  // RLS: sales admins can only load their own listings
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, description, price, region, exchange_available, image_path, publish_status, rejection_reason, created_by")
    .eq("id", id)
    .maybeSingle();
  if (!listing) notFound();

  if (profile.role === "sales_admin" && !salesAdminCanEdit(listing.publish_status)) {
    return (
      <div className="flex max-w-xl flex-col gap-3 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-lg font-semibold">{listing.title}</h2>
          <PublishStatusBadge status={listing.publish_status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {listing.publish_status === "pending_review"
            ? "This listing is waiting for review. You can edit it again once it's approved or sent back."
            : "Archived listings can't be edited."}
        </p>
      </div>
    );
  }

  const sellers = profile.role === "super_admin" ? await getSellerOptions() : undefined;
  const { created_by: ownerId, ...fields } = listing;

  return (
    <ListingForm
      canPublish={publishesDirectly(profile)}
      regions={settings.regions}
      currency={settings.currency}
      sellers={sellers}
      listing={{
        ...fields,
        // Anything not owned by a seller shop shows as FireVault's own
        sellerId: sellers?.some((seller) => seller.id === ownerId) ? ownerId : "",
        imageUrl: publicImageUrl(listing.image_path),
      }}
    />
  );
}
