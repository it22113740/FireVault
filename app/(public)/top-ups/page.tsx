import { Suspense } from "react";
import type { Metadata } from "next";
import { GemIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LinkTabs } from "@/components/link-tabs";
import { StaggerItem } from "@/components/motion";
import { SkeletonGrid } from "@/components/skeletons";
import { TopupCard } from "@/components/topup-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/settings";
import { getPublishedTopups } from "@/lib/store";
import { TOPUP_CATEGORIES, parseTopupCategory, topupCategoryLabel } from "@/lib/topups";

export const metadata: Metadata = {
  title: "Top-ups",
  description: "Membership, VIP bundles and diamond packs. Order on WhatsApp.",
};

type Props = PageProps<"/top-ups">;

export default function TopupsPage({ searchParams }: Props) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Top-ups</h1>
        <p className="mt-2 text-muted-foreground">
          Pick a pack and order it on WhatsApp. We confirm the payment and deliver it manually.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-11 w-80 max-w-full" />
            <SkeletonGrid count={8} />
          </div>
        }
      >
        <Topups searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Topups({ searchParams }: { searchParams: Props["searchParams"] }) {
  const category = parseTopupCategory((await searchParams).category) ?? "membership";
  const [topups, settings] = await Promise.all([getPublishedTopups(), getSettings()]);
  const shown = topups.filter((topup) => topup.category === category);

  return (
    <div className="flex flex-col gap-6">
      <LinkTabs
        label="Top-up category"
        tabs={TOPUP_CATEGORIES.map((option) => ({
          href: `/top-ups?category=${option.value}`,
          label: option.label,
          active: option.value === category,
        }))}
      />
      {shown.length === 0 ? (
        <EmptyState icon={GemIcon} title={`No ${topupCategoryLabel(category)} packs right now.`} />
      ) : (
        <ul key={category} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((topup, index) => (
            <StaggerItem key={topup.id} index={index} as="li">
              <TopupCard topup={topup} currency={settings.currency} whatsappNumber={settings.admin_whatsapp} />
            </StaggerItem>
          ))}
        </ul>
      )}
    </div>
  );
}
