import { Suspense } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SkeletonTableRows } from "@/components/skeletons";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementManager } from "./announcement-manager";

export const metadata: Metadata = { title: "Announcements" };

export default function AnnouncementsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Announcements" description="Upload banners to show between top-ups and the seller invitation on the homepage." />
      <Suspense fallback={<SkeletonTableRows rows={3} />}>
        <Announcements />
      </Suspense>
    </div>
  );
}

async function Announcements() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").select("*")
    .order("created_at", { ascending: false }).order("id");
  if (error) throw new Error("Couldn't load announcements.");
  return <AnnouncementManager announcements={data ?? []} />;
}
