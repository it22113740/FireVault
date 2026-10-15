import { SkeletonGrid } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_SIZE } from "@/lib/store";

export function AccountsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-11 rounded-xl md:h-60 xl:h-[86px]" />
      <SkeletonGrid count={PAGE_SIZE} />
    </div>
  );
}
