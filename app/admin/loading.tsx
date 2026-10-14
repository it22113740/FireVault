import { SkeletonPageHeader, SkeletonTableRows } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <SkeletonPageHeader />
      <SkeletonTableRows />
    </div>
  );
}
