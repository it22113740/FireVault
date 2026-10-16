import { Suspense } from "react";
import type { Metadata } from "next";
import { StoreIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StaggerItem } from "@/components/motion";
import { SellerCard } from "@/components/seller-card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth";
import { getSellers } from "@/lib/sellers";

export const metadata: Metadata = { title: "Sellers" };

export default function AdminSellersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sellers"
        description="Every shop on FireVault with its ratings and live accounts. View only."
      />
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
  const [profile, sellers] = await Promise.all([requireStaff(), getSellers()]);
  if (sellers.length === 0) return <EmptyState icon={StoreIcon} title="No shops yet." />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sellers.map((seller, index) => (
        <StaggerItem key={seller.id} index={index} as="li" className="relative">
          <SellerCard seller={seller} href={`/admin/sellers/${seller.slug}`} />
          {seller.id === profile.id && (
            <span className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              Your shop
            </span>
          )}
        </StaggerItem>
      ))}
    </ul>
  );
}
