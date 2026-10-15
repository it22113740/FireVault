import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ListingCard / TopupCard exactly (image, 2 text lines, price, button)
// so nothing shifts when real content streams in.
// "portrait" matches listing images (3500 × 5200), "landscape" top-up cards
export function SkeletonCard({ image = "portrait" }: { image?: "portrait" | "landscape" }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <Skeleton
        className={image === "portrait" ? "aspect-[35/52] rounded-none" : "aspect-[4/3] rounded-none"}
      />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-2 h-7 w-1/3" />
        <Skeleton className="mt-2 h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 12,
  image,
}: {
  count?: number;
  image?: "portrait" | "landscape";
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} image={image} />
      ))}
    </div>
  );
}

export function SkeletonTableRows({
  rows = 8,
  columns = ["w-12", "w-2/5", "w-20", "w-16", "w-20"],
}: {
  rows?: number;
  columns?: string[];
}) {
  return (
    <div className="flex flex-col divide-y rounded-xl border bg-card">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-4 py-3">
          {columns.map((width, column) => (
            <Skeleton key={column} className={`h-4 ${width}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

// Form with a side image column (listing and top-up editors)
export function SkeletonForm() {
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
