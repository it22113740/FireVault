import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SkeletonForm } from "@/components/skeletons";
import { requireSuperAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validations/common";
import { TopupForm } from "../../topup-form";

export const metadata: Metadata = { title: "Edit top-up" };

type Props = PageProps<"/admin/top-ups/[id]/edit">;

export default function EditTopupPage({ params }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/top-ups"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Top-ups
      </Link>
      <PageHeader title="Edit top-up" />
      <Suspense fallback={<SkeletonForm />}>
        <EditTopup params={params} />
      </Suspense>
    </div>
  );
}

async function EditTopup({ params }: { params: Props["params"] }) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  await requireSuperAdmin();
  const supabase = await createClient();
  const [{ data: topup }, settings] = await Promise.all([
    supabase
      .from("topups")
      .select("id, name, description, price, category, image_path, status")
      .eq("id", id)
      .maybeSingle(),
    getSettings(),
  ]);
  if (!topup) notFound();

  return (
    <TopupForm
      currency={settings.currency}
      defaultCategory={topup.category}
      topup={{
        id: topup.id,
        name: topup.name,
        description: topup.description,
        price: topup.price,
        category: topup.category,
        imageUrl: publicImageUrl(topup.image_path),
        published: topup.status === "published",
      }}
    />
  );
}
