import { Suspense } from "react";
import type { Metadata } from "next";
import { StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StaggerItem } from "@/components/motion";
import { SellerCard } from "@/components/seller-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSellers } from "@/lib/sellers";

export const metadata: Metadata = {
  title: "Sellers",
  description: "Every seller on FireVault, with their ratings, reviews and accounts sold.",
};

export default function SellersPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sellers</h1>
        <p className="mt-2 text-muted-foreground">
          Check a seller&apos;s ratings and reviews before you buy. Top-rated sellers first.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-64 rounded-xl" />
            ))}
          </div>
        }
      >
        <Sellers />
      </Suspense>
    </div>
  );
}

async function Sellers() {
  const sellers = await getSellers();
  if (sellers.length === 0) {
    return <EmptyState icon={StoreIcon} title="No sellers yet. Check back soon." />;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sellers.map((seller, index) => (
        <StaggerItem key={seller.id} index={index} as="li">
          <SellerCard seller={seller} />
        </StaggerItem>
      ))}
    </ul>
  );
}
