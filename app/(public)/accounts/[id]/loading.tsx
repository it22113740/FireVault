import { Skeleton } from "@/components/ui/skeleton";
import { AccountDetailSkeleton } from "./account-detail-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-28 md:pb-16">
      <Skeleton className="mb-4 h-11 w-32" />
      <AccountDetailSkeleton />
    </div>
  );
}
