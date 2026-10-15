import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SkeletonForm } from "@/components/skeletons";
import { requireRole } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/validations/shop";
import { ShopForm } from "../shop/shop-form";

export const metadata: Metadata = { title: "Set up your shop" };

// proxy.ts sends sales admins here until their shop profile exists
export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Set up your shop"
        description="Customers see this on your shop page and next to your listings. You can change it any time under My shop."
      />
      <Suspense fallback={<SkeletonForm />}>
        <Onboarding />
      </Suspense>
    </div>
  );
}

async function Onboarding() {
  const profile = await requireRole("sales_admin");
  // Applications are private; read only this authenticated seller's approved link.
  const { data: application } = await createAdminClient()
    .from("sales_admin_applications")
    .select("whatsapp_group_url")
    .eq("user_id", profile.id)
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (
    <ShopForm
      onboarding
      siteUrl={SITE_URL}
      defaults={{
        displayName: profile.full_name,
        slug: slugify(profile.full_name),
        description: "",
        whatsappGroupUrl: application?.whatsapp_group_url ?? "",
        tiktokUrl: "",
        facebookUrl: "",
        totalSold: "0",
      }}
    />
  );
}
