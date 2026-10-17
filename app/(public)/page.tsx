import { AnnouncementBanners } from "@/components/announcement-banners";
import { IdCollege } from "@/components/id-college";
import { getIdCollegeSamples } from "@/lib/id-college";
import { publicImageUrl } from "@/lib/storage";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon, NewspaperIcon } from "lucide-react";
import { Magnetic, Reveal } from "@/components/interactive";
import { ListingCard } from "@/components/listing-card";
import { ListingCarousel } from "@/components/listing-carousel";
import { SellerCta } from "@/components/seller-cta";
import { SellerMarquee } from "@/components/seller-marquee";
import { SkeletonCard } from "@/components/skeletons";
import { TopupShowcase } from "@/components/topup-showcase";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SellerWhatsAppPicker } from "@/components/seller-whatsapp-picker";
import { getSellers } from "@/lib/sellers";
import { getSettings } from "@/lib/settings";
import { getLatestListingPerSeller, getPublishedTopups } from "@/lib/store";
import { TOPUP_CATEGORIES } from "@/lib/topups";
import { HeroBackground } from "./hero-background";

export default function HomePage() {
  return (
    <>
      {/* At least as tall as the banner (portrait 940 × 1672 on phones,
          landscape 1672 × 941 from md), so the whole image shows behind the
          text. Any extra height is filled by a blurred copy, not empty bars. */}
      <section className="relative isolate flex min-h-[177.87vw] items-center overflow-hidden border-b md:min-h-[56.28vw]">
        <HeroBackground />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/40 to-transparent" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-16 sm:py-24">
          {/* Lines appear one after another */}
          <Reveal className="flex flex-col gap-2">
            <h1 className="flex flex-col gap-1">
              <span className="bg-brand bg-clip-text text-5xl leading-none font-bold tracking-tight text-transparent sm:text-7xl">
                Banzzz•23
              </span>
              <span className="font-heading text-2xl font-bold tracking-[0.2em] uppercase sm:text-4xl">
                FF E-Store
              </span>
            </h1>
            <p className="font-heading text-2xl font-semibold sm:text-4xl">Free Fire Accounts Buy &amp; Sale</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-xl font-semibold text-muted-foreground sm:text-2xl">
              <span>UID Top Up</span>
              <span aria-hidden="true">·</span>
              <span>ID College making</span>
              <span aria-hidden="true">·</span>
              <span>Free Fire Updates</span>
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="max-w-xl text-lg font-medium text-muted-foreground sm:text-xl">
              Browse ready-to-play accounts by region and price. Tap Buy on WhatsApp, pay the seller
              and get your login.
            </p>
          </Reveal>
          <Reveal delay={0.24} className="flex flex-wrap gap-3">
            <Magnetic>
              <Button
                size="lg"
                className="h-11 bg-brand px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25"
                render={<Link href="/accounts" />}
                nativeButton={false}
              >
                Browse accounts <ArrowRightIcon className="transition-transform group-hover/button:translate-x-1" />
              </Button>
            </Magnetic>
            <Suspense fallback={<Skeleton className="h-11 w-52" />}>
              <HeroWhatsApp />
            </Suspense>
            <div className="flex w-full flex-wrap gap-3">
              <Button size="lg" className="h-11 bg-brand px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/25" render={<Link href="/updates" />} nativeButton={false}>
                <NewspaperIcon /> FF-Updates
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-5" render={<Link href="/how-to-buy" />} nativeButton={false}>
                <BookOpenIcon /> How buying works
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <Suspense fallback={<TopSellersSkeleton />}>
        <TopSellers />
      </Suspense>

      <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12">
        <Reveal className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">Latest accounts</h2>
            <p className="mt-1 text-base font-medium text-muted-foreground">The newest account from each seller.</p>
          </div>
          <Link href="/accounts" className="flex min-h-11 items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRightIcon className="size-4" />
          </Link>
        </Reveal>
        <Suspense fallback={<LatestSkeleton />}>
          <Reveal delay={0.1}>
            <LatestAccounts />
          </Reveal>
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Suspense fallback={<Skeleton className="h-[34rem] rounded-3xl lg:h-[28rem]" />}>
          <Reveal>
            <TopupsSection />
          </Reveal>
        </Suspense>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-12">
        <Suspense fallback={<Skeleton className="h-52 rounded-3xl" />}>
          <IdCollegeSection />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <AnnouncementBanners />
      </Suspense>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <Reveal>
          <SellerCta />
        </Reveal>
      </section>
    </>
  );
}

async function LatestAccounts() {
  const [listings, settings] = await Promise.all([getLatestListingPerSeller(), getSettings()]);

  if (listings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        New accounts are on their way. Check back soon.
      </p>
    );
  }
  return (
    <ListingCarousel>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} currency={settings.currency} />
      ))}
    </ListingCarousel>
  );
}

function LatestSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="w-[82%] shrink-0 sm:w-1/2 lg:w-1/3 xl:w-1/4">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

// Only the sellers the super admin picked in Settings, in that order; hidden
// when none are picked
async function HeroWhatsApp() {
  const [allSellers, settings] = await Promise.all([getSellers(), getSettings()]);
  const sellers = settings.sell_contact_seller_ids.flatMap((id) => allSellers.filter((seller) => seller.id === id));
  if (sellers.length === 0) return null;
  return (
    <SellerWhatsAppPicker
      sellers={sellers}
      message="Hi! I'd like to sell my Free Fire account. I found your shop on Banzzz•23 FF E-Store."
      label="Want to Sell Account ?"
      title="Choose a seller"
      description="Select a seller to discuss selling your account on WhatsApp."
      variant="secondary"
      className="border-white/30 bg-[#007BFF]/70 px-5 text-white shadow-[0_8px_32px_rgba(0,123,255,0.3),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl backdrop-saturate-150 hover:border-white/50 hover:bg-[#007BFF]/85 hover:text-white dark:border-white/30 dark:bg-[#007BFF]/70 dark:text-white dark:hover:border-white/50 dark:hover:bg-[#007BFF]/85 dark:hover:text-white"
    />
  );
}

async function IdCollegeSection() {
  const [settings, samples] = await Promise.all([getSettings(), getIdCollegeSamples()]);
  return <IdCollege whatsappNumber={settings.admin_whatsapp ?? ""} currency={settings.currency}
    samples={samples.map((sample) => ({ slot: sample.slot, price: sample.price, imageUrl: publicImageUrl(sample.image_path) }))} />;
}

// Top-up banner with each category's live pack count and starting price
async function TopupsSection() {
  const [topups, settings] = await Promise.all([getPublishedTopups(), getSettings()]);
  const categories = TOPUP_CATEGORIES.map(({ value, label }) => {
    const prices = topups.filter((topup) => topup.category === value).map((topup) => topup.price);
    return { value, label, count: prices.length, minPrice: prices.length ? Math.min(...prices) : null };
  });
  return (
    <TopupShowcase
      categories={categories}
      currency={settings.currency}
      whatsappNumber={settings.admin_whatsapp}
    />
  );
}

// Seller cards with their ratings, scrolling in an endless loop
async function TopSellers() {
  const sellers = await getSellers();
  if (sellers.length === 0) return null;

  return (
    <section className="flex flex-col gap-5 pb-12 pt-12">
      <Reveal className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Top sellers</h2>
          <p className="mt-1 text-base font-medium text-muted-foreground">Rated and reviewed by customers.</p>
        </div>
      </Reveal>
      {/* Best rated first; the strip shows the top 20 */}
      <SellerMarquee sellers={sellers.slice(0, 20)} />
    </section>
  );
}

function TopSellersSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl gap-4 overflow-hidden px-4 pb-12">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-[5.375rem] w-72 shrink-0 rounded-xl" />
      ))}
    </div>
  );
}
