import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SkeletonForm } from "@/components/skeletons";
import { requireSuperAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { parseTopupCategory } from "@/lib/topups";
import { TopupForm } from "../topup-form";

export const metadata: Metadata = { title: "New top-up" };

type Props = PageProps<"/admin/top-ups/new">;

export default function NewTopupPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="New top-up" />
      <Suspense fallback={<SkeletonForm />}>
        <NewTopup searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewTopup({ searchParams }: { searchParams: Props["searchParams"] }) {
  const [, settings, params] = await Promise.all([requireSuperAdmin(), getSettings(), searchParams]);
  return (
    <TopupForm
      currency={settings.currency}
      defaultCategory={parseTopupCategory(params.category) ?? "membership"}
    />
  );
}
