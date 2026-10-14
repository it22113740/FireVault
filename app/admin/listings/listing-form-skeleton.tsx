import { Skeleton } from "@/components/ui/skeleton";

export function ListingFormSkeleton() {
  return (
    <div className="grid max-w-3xl gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-16" />
        <Skeleton className="h-48" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
      <Skeleton className="aspect-[4/3]" />
    </div>
  );
}
