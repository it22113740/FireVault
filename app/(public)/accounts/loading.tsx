import { Skeleton } from "@/components/ui/skeleton";
import { AccountsSkeleton } from "./accounts-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <AccountsSkeleton />
    </div>
  );
}
