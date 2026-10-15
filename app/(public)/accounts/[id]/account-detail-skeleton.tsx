import { Skeleton } from "@/components/ui/skeleton";

export function AccountDetailSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10">
      <Skeleton className="mx-auto aspect-[35/52] w-full max-w-[calc(80svh*35/52)] rounded-2xl" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-8 w-4/5" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-2 hidden h-11 md:block" />
        <Skeleton className="h-11 w-36" />
        <Skeleton className="h-24" />
      </div>
    </div>
  );
}
