import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireSuperAdmin } from "@/lib/auth";
import { UPDATE_IMAGE_SIZE } from "@/lib/game-updates";
import { publicImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { UpdateManager } from "./update-manager";

export const metadata: Metadata = { title: "Game updates" };

export default function AdminUpdatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Game updates"
        description="Post update images to the public Updates page. Newest first."
        actions={
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            render={<Link href="/updates" target="_blank" />}
            nativeButton={false}
          >
            View page <ExternalLinkIcon />
          </Button>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Updates />
      </Suspense>
    </div>
  );
}

async function Updates() {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_updates")
    .select("id, image_path, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Couldn't load updates.");
  return (
    <UpdateManager
      size={UPDATE_IMAGE_SIZE}
      updates={(data ?? []).map((row) => ({
        id: row.id,
        imageUrl: publicImageUrl(row.image_path),
        createdAt: row.created_at,
      }))}
    />
  );
}
