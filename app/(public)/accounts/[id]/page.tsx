import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, Gamepad2Icon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { CopyIdButton } from "@/components/copy-id-button";
import { ExchangeBadge } from "@/components/exchange-badge";
import { SellerLogo } from "@/components/seller-card";
import { FadeIn } from "@/components/motion";
import { AvailabilityBadge } from "@/components/status-badge";
import { SellerWhatsAppPicker } from "@/components/seller-whatsapp-picker";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatPrice, shortId } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getPublishedListing } from "@/lib/store";
import { listingMessage } from "@/lib/whatsapp-messages";
import { AccountDetailSkeleton } from "./account-detail-skeleton";
import { ZoomableImage } from "@/components/zoomable-image";

type Props = PageProps<"/accounts/[id]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getPublishedListing((await params).id);
  if (!listing) return { title: "Account not found" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      images: listing.imageUrl ? [{ url: listing.imageUrl, alt: listing.title }] : [],
    },
  };
}

export default function AccountPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-28 md:pb-16">
      <Link
        href="/accounts"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> All accounts
      </Link>
      <Suspense fallback={<AccountDetailSkeleton />}>
        <AccountDetail params={params} />
      </Suspense>
    </div>
  );
}

async function AccountDetail({ params }: { params: Props["params"] }) {
  const { id } = await params;
  const [listing, settings] = await Promise.all([getPublishedListing(id), getSettings()]);
  if (!listing) notFound();

  const reserved = listing.availability === "reserved";
  const price = formatPrice(listing.price, settings.currency);
  const message = listingMessage(listing, settings.currency);
  // A shared listing is sold by several shops: the buyer picks one below
  const shared = listing.sellers.length > 1;
  const whatsapp = shared ? (
    <SellerWhatsAppPicker
      sellers={listing.sellers}
      message={message}
      description={`${listing.sellers.length} sellers offer this same account. Message the one you'd like to buy from.`}
      disabled={reserved}
      className="w-full"
    />
  ) : (
    <WhatsAppButton number={listing.whatsappNumber} message={message} disabled={reserved} className="w-full" />
  );

  return (
    <FadeIn className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10">
      {listing.imageUrl ? (
        // Whole image at its own aspect ratio, never cropped; tap to zoom
        <ZoomableImage src={listing.imageUrl} alt={listing.title} dimmed={reserved} />
      ) : (
        <div className="relative mx-auto aspect-[35/52] w-full max-w-[calc(80svh*35/52)] rounded-2xl border bg-muted">
          <Gamepad2Icon className="absolute inset-0 m-auto size-12 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-5 md:sticky md:top-24 md:self-start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <AvailabilityBadge availability={listing.availability} />
            {listing.exchangeAvailable && <ExchangeBadge label="Exchange possible" />}
          </div>
          <h1 className="text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
            {listing.title}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPinIcon className="size-4" /> Region {listing.region}
          </p>
          <p className="font-heading text-3xl font-bold text-primary tabular-nums">{price}</p>
          {listing.exchangeAvailable && (
            <p className="text-sm text-muted-foreground">
              The seller is open to an exchange. Mention the account you&apos;d offer when you message
              them on WhatsApp.
            </p>
          )}
        </div>

        <div className="hidden flex-col gap-3 md:flex">
          {whatsapp}
          {reserved && (
            <p className="text-sm text-muted-foreground">
              Someone is buying this account. Check back if the sale falls through.
            </p>
          )}
        </div>

        {shared ? (
          <section id="sellers" className="flex scroll-mt-24 flex-col gap-2">
            <h2 className="font-semibold">Sold by {listing.sellers.length} sellers</h2>
            <p className="text-sm text-muted-foreground">
              It&apos;s the same account. Tap Contact via WhatsApp and choose who to buy from.
            </p>
            <ul className="flex flex-col gap-2">
              {listing.sellers.map((seller) => (
                <li key={seller.id}>
                  <Link
                    href={`/sellers/${seller.slug}`}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
                  >
                    <SellerLogo url={seller.logoUrl} name={seller.name} className="size-11" />
                    <span className="min-w-0 flex-1 truncate font-medium">{seller.name}</span>
                    <span className="text-sm text-primary">Ratings &amp; reviews</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : listing.seller && (
          <Link
            href={`/sellers/${listing.seller.slug}`}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/50"
          >
            <SellerLogo url={listing.seller.logoUrl} name={listing.seller.name} className="size-11" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Sold by</span>
              <span className="block truncate font-medium">{listing.seller.name}</span>
            </span>
            <span className="text-sm text-primary">Ratings &amp; reviews</span>
          </Link>
        )}

        <CopyIdButton value={shortId(listing.id)} />

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">About this account</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {listing.description}
          </p>
        </section>

        <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          Payment and delivery happen in the WhatsApp chat. The login is shared after the
          seller confirms your payment.
        </p>
      </div>

      {/* Mobile: price + Buy on WhatsApp always within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <div className="flex items-center gap-4">
          <p className="font-heading text-xl font-bold text-primary tabular-nums">{price}</p>
          <div className="flex-1">{whatsapp}</div>
        </div>
      </div>
    </FadeIn>
  );
}
