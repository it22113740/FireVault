import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GemIcon, ImageIcon, PlusIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LinkTabs } from "@/components/link-tabs";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { PublishStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { TOPUP_CATEGORIES, parseTopupCategory, topupCategoryLabel } from "@/lib/topups";
import { TopupRowActions } from "./topup-row-actions";

export const metadata: Metadata = { title: "Top-ups" };

type Props = PageProps<"/admin/top-ups">;

export default function TopupsPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Top-ups" description="Packs customers buy on WhatsApp from the main admin number." />
      <Suspense fallback={<SkeletonTableRows rows={5} />}>
        <Topups searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Topups({ searchParams }: { searchParams: Props["searchParams"] }) {
  await requireSuperAdmin();
  const category = parseTopupCategory((await searchParams).category) ?? "membership";

  const supabase = await createClient();
  const [{ data }, settings, ...counts] = await Promise.all([
    supabase
      .from("topups")
      .select("id, name, price, image_path, status, sort_order")
      .eq("category", category)
      .order("sort_order")
      .order("created_at"),
    getSettings(),
    ...TOPUP_CATEGORIES.map((option) =>
      supabase.from("topups").select("id", { count: "exact", head: true }).eq("category", option.value)
    ),
  ]);
  const topups = data ?? [];
  const newHref = `/admin/top-ups/new?category=${category}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          label="Top-up category"
          tabs={TOPUP_CATEGORIES.map((option, index) => ({
            href: `/admin/top-ups?category=${option.value}`,
            label: option.label,
            count: counts[index].count,
            active: option.value === category,
          }))}
        />
        <Button size="lg" className="h-11" render={<Link href={newHref} />} nativeButton={false}>
          <PlusIcon /> New {topupCategoryLabel(category)}
        </Button>
      </div>

      {topups.length === 0 ? (
        <EmptyState
          icon={GemIcon}
          title={`No ${topupCategoryLabel(category)} packs yet.`}
          action={
            <Button variant="outline" render={<Link href={newHref} />} nativeButton={false}>
              Add one
            </Button>
          }
        />
      ) : (
        <ol className="flex flex-col divide-y rounded-xl border bg-card">
          {topups.map((topup, index) => (
            <li
              key={topup.id}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_auto]"
            >
              <div className="relative size-14 overflow-hidden rounded-lg bg-muted">
                {topup.image_path ? (
                  <Image src={publicImageUrl(topup.image_path)} alt="" fill sizes="56px" className="object-cover" />
                ) : (
                  <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <Link href={`/admin/top-ups/${topup.id}/edit`} className="block truncate font-medium hover:text-primary">
                  {topup.name}
                </Link>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {topup.price > 0 ? formatPrice(topup.price, settings.currency) : "No price"}
                </p>
              </div>
              <div className="col-start-2 sm:col-start-auto">
                <PublishStatusBadge status={topup.status} />
              </div>
              <div className="col-start-2 sm:col-start-auto">
                <TopupRowActions
                  id={topup.id}
                  name={topup.name}
                  published={topup.status === "published"}
                  isFirst={index === 0}
                  isLast={index === topups.length - 1}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
