import { Suspense } from "react";
import type { Metadata } from "next";
import { LinkTabs } from "@/components/link-tabs";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { requireSuperAdmin } from "@/lib/auth";
import type { Enums } from "@/lib/database.types";
import { APPLICATIONS_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { ApplicationList } from "./application-list";

export const metadata: Metadata = { title: "Applications" };

const STATUSES: { value: Enums<"application_status">; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
];

// PLAN.md: screenshots are only viewable through 60-second signed URLs
const SCREENSHOT_URL_TTL = 60;

type Props = PageProps<"/admin/applications">;

export default function ApplicationsPage({ searchParams }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Applications" description="People asking to become sales admins." />
      <Suspense fallback={<SkeletonTableRows rows={4} />}>
        <Applications searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Applications({ searchParams }: { searchParams: Props["searchParams"] }) {
  await requireSuperAdmin();
  const requested = (await searchParams).status;
  const status = STATUSES.find((option) => option.value === requested)?.value ?? "pending";

  const supabase = await createClient();
  const [{ data: applications }, ...counts] = await Promise.all([
    supabase
      .from("sales_admin_applications")
      .select("id, full_name, email, whatsapp_number, whatsapp_group_url, contact_number, screenshot_path, status, deny_reason, created_at, reviewed_at")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(100),
    ...STATUSES.map((option) =>
      supabase
        .from("sales_admin_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", option.value)
    ),
  ]);

  const rows = applications ?? [];
  const { data: signed } = rows.length
    ? await supabase.storage
        .from(APPLICATIONS_BUCKET)
        .createSignedUrls(rows.map((row) => row.screenshot_path), SCREENSHOT_URL_TTL)
    : { data: [] };
  const screenshotUrls = new Map(
    (signed ?? []).map((item) => [item.path, item.signedUrl] as const)
  );

  return (
    <>
      <LinkTabs
        label="Application status"
        tabs={STATUSES.map((option, index) => ({
          href: `/admin/applications?status=${option.value}`,
          label: option.label,
          count: counts[index].count,
          active: option.value === status,
        }))}
      />
      <ApplicationList
        status={status}
        applications={rows.map((row) => ({
          ...row,
          screenshotUrl: screenshotUrls.get(row.screenshot_path) ?? null,
        }))}
      />
    </>
  );
}
