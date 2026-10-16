import { Suspense } from "react";
import type { Metadata } from "next";
import { NewspaperIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getGameUpdates } from "@/lib/game-updates";
import { UpdatesGallery } from "./updates-gallery";

export const metadata: Metadata = {
  title: "Game updates",
  description: "The latest in-game events, new items and patch news, posted by the FireVault team.",
};

export default function UpdatesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <span className="flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          <NewspaperIcon className="size-3.5" /> Game updates
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">What&apos;s new in the game</h1>
        <p className="max-w-2xl text-muted-foreground">
          New events, bundles and patch news as soon as they drop. Tap any update to see it full screen.
        </p>
      </header>
      <Suspense fallback={<UpdatesSkeleton />}>
        <Updates />
      </Suspense>
    </div>
  );
}

async function Updates() {
  const updates = await getGameUpdates();
  if (updates.length === 0) {
    return <EmptyState icon={NewspaperIcon} title="No updates yet. Check back soon." />;
  }
  return <UpdatesGallery updates={updates} />;
}

function UpdatesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="aspect-video rounded-xl" />
        ))}
      </div>
    </div>
  );
}
