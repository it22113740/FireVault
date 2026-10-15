import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  CrownIcon,
  GemIcon,
  MessageCircleIcon,
  SparklesIcon,
  StoreIcon,
  type LucideIcon,
} from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { ListingCarousel } from "@/components/listing-carousel";
import { FadeIn } from "@/components/motion";
import { SkeletonCard } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { getSettings } from "@/lib/settings";
import { getLatestListings } from "@/lib/store";
import { HeroBackground } from "./hero-background";
import { TOPUP_CATEGORIES, type TopupCategory } from "@/lib/topups";

const CATEGORY_DETAILS: Record<TopupCategory, { text: string; icon: LucideIcon }> = {
  membership: { text: "Weekly and monthly passes", icon: CrownIcon },
  vip_bundle: { text: "Bundles with extra rewards", icon: SparklesIcon },
  diamonds: { text: "Diamond packs of every size", icon: GemIcon },
};

export default function HomePage() {
  return (
    <>
      {/* At least as tall as the banner (portrait 940 × 1672 on phones,
          landscape 1672 × 941 from md), so the whole image shows behind the
          text. Any extra height is filled by a blurred copy, not empty bars. */}
      <section className="relative isolate flex min-h-[177.87vw] items-center overflow-hidden border-b md:min-h-[56.28vw]">
        <HeroBackground />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-background via-background/40 to-transparent" />
        <FadeIn className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-16 sm:py-24">
          <div className="flex flex-col gap-2">
            <h1 className="bg-brand bg-clip-text text-5xl leading-none font-bold tracking-tight text-transparent sm:text-7xl">
              Banzzz•23
            </h1>
            <p className="font-heading text-2xl font-semibold sm:text-4xl">Free Fire Accounts Buy &amp; Sale</p>
            <p className="font-heading text-xl font-semibold text-muted-foreground sm:text-2xl">UID Top Up</p>
          </div>
          <p className="max-w-xl text-muted-foreground sm:text-lg">
            Browse ready-to-play accounts by region and price. Tap Buy on WhatsApp, pay the seller
            and get your login.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-11 bg-brand px-5 font-semibold text-primary-foreground"
              render={<Link href="/accounts" />}
              nativeButton={false}
            >
              Browse accounts <ArrowRightIcon />
            </Button>
            <Button size="lg" variant="outline" className="h-11 px-5" render={<Link href="/how-to-buy" />} nativeButton={false}>
              <MessageCircleIcon /> How buying works
            </Button>
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Latest accounts</h2>
          <Link href="/accounts" className="flex min-h-11 items-center gap-1 text-sm text-primary hover:underline">
            View all <ArrowRightIcon className="size-4" />
          </Link>
        </div>
        <Suspense fallback={<LatestSkeleton />}>
          <LatestAccounts />
        </Suspense>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-12">
        <h2 className="text-2xl font-bold sm:text-3xl">Top-ups</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {TOPUP_CATEGORIES.map(({ value, label }) => {
            const { text, icon: Icon } = CATEGORY_DETAILS[value];
            return (
              <li key={value}>
                <Link
                  href={`/top-ups?category=${value}`}
                  className="flex h-full items-center gap-4 rounded-xl border bg-card p-5 transition duration-200 hover:border-primary/50 md:hover:-translate-y-1"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                    <Icon className="size-6 text-primary" />
                  </span>
                  <span>
                    <span className="block font-heading text-lg font-semibold">{label}</span>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex flex-col items-start gap-4 rounded-2xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <StoreIcon className="mt-1 size-8 shrink-0 text-primary" />
            <div>
              <h2 className="text-xl font-bold sm:text-2xl">Have accounts to sell?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Apply to become a seller, list your accounts and chat with buyers on WhatsApp.
              </p>
            </div>
          </div>
          <Button size="lg" variant="outline" className="h-11" render={<Link href="/apply" />} nativeButton={false}>
            Become a seller
          </Button>
        </div>
      </section>
    </>
  );
}

async function LatestAccounts() {
  const [listings, settings] = await Promise.all([getLatestListings(8), getSettings()]);

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
