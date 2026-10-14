import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, Gamepad2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/src/lib/listings";
import { getStoreListing } from "@/src/lib/store";
import { CheckoutForm } from "./checkout-form";

type Props = PageProps<"/checkout/[id]">;

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-4 pb-16">
      <h1 className="mb-6 font-display text-5xl leading-none font-bold font-stretch-[75%] tracking-tight">
        Checkout
      </h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <Checkout params={params} />
      </Suspense>
    </div>
  );
}

async function Checkout({ params }: { params: Props["params"] }) {
  const { id } = await params;
  const listing = await getStoreListing(id);
  if (!listing) notFound();

  return (
    <div className="flex flex-col gap-8">
      <Link
        href={`/accounts/${listing.id}`}
        className="flex items-center gap-3 border bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {listing.images[0] ? (
            <Image src={listing.images[0]} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <Gamepad2Icon className="absolute inset-0 m-auto size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{listing.title}</p>
          <p className="text-lg font-bold text-primary tabular-nums">
            {formatPrice(listing.price)}
          </p>
        </div>
      </Link>

      {listing.status === "available" ? (
        <CheckoutForm listingId={listing.id} price={listing.price} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            This account has just been reserved by another buyer.
          </p>
          <Button render={<Link href="/#accounts" />} nativeButton={false} variant="outline">
            <ArrowLeftIcon /> Browse other accounts
          </Button>
        </div>
      )}
    </div>
  );
}
