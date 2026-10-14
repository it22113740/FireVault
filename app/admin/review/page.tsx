import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSuperAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue } from "./review-queue";

export const metadata: Metadata = { title: "Review queue" };

export default function ReviewPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Review queue"
        description="Listings sales admins submitted. Shortcuts: A approve · R reject · J/K next/previous."
      />
      <Suspense fallback={<ReviewSkeleton />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const [{ data }, settings] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id, title, description, price, region, image_path, submitted_at, seller:profiles!listings_created_by_fkey(full_name, whatsapp_number)"
      )
      .eq("publish_status", "pending_review")
      .order("submitted_at", { ascending: true })
      .limit(50),
    getSettings(),
  ]);

  return (
    <ReviewQueue
      currency={settings.currency}
      items={(data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        price: item.price,
        region: item.region,
        imageUrl: publicImageUrl(item.image_path),
        submittedAt: item.submitted_at,
        sellerName: item.seller?.full_name ?? "Unknown seller",
      }))}
    />
  );
}

function ReviewSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}
