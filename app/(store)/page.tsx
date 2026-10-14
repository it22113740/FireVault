import { Suspense } from "react";
import Image from "next/image";
import {
  distinctValues,
  filterListings,
  getStoreListings,
  parseStoreFilters,
} from "@/src/lib/store";
import { FeaturedListing, ListingCard } from "./listing-card";
import { ListingFilters } from "./listing-filters";

const services = [
  {
    title: "Ready accounts",
    text: "Level, rank, region, and what is included are on the listing before you pay.",
  },
  {
    title: "Payment check",
    text: "Pay by bank transfer or eZ Cash. We match the slip to the order before anything is sent.",
  },
  {
    title: "Login delivery",
    text: "The login is sent to the phone number from checkout. It is never printed on the listing.",
  },
] as const;

const reviews = [
  {
    name: "Nimal",
    quote: "The rank and level matched the listing. The login arrived the same evening I paid.",
  },
  {
    name: "Ayesha",
    quote: "I uploaded the slip and heard back once the payment had been checked.",
  },
  {
    name: "Kasun",
    quote: "I asked about an item before paying and got a direct answer.",
  },
] as const;

const steps = [
  {
    title: "Choose an account",
    text: "Compare level, rank, region, and what is included.",
  },
  {
    title: "Pay and upload the slip",
    text: "Send the listed amount and attach proof of payment.",
  },
  {
    title: "Receive the login",
    text: "We confirm the payment and send the account details to you.",
  },
] as const;

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section aria-label="Banner">
        <div className="relative aspect-video w-full bg-black">
          <Image
            src="/hero.jpg"
            alt="BANZZZ banner. A player stands in front of a gold sign while a character raises a championship belt."
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      </section>
      <section id="accounts" className="scroll-mt-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:py-16">
          <div className="max-w-[42ch]">
            <h1 className="font-display text-5xl leading-none font-bold font-stretch-[75%] tracking-tight sm:text-6xl">
              Accounts
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Accounts that are already played in. Pay, send the slip, and get the login
              after we confirm it.
            </p>
          </div>
          <Suspense fallback={<StorefrontSkeleton />}>
            <Storefront searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <Band
        id="services"
        title="Services"
        intro="A checked listing, a confirmed payment, and a login sent to you."
      >
        <dl>
          {services.map((service) => (
            <div key={service.title} className="grid gap-2 border-t py-5 sm:grid-cols-[14rem_1fr]">
              <dt className="font-medium">{service.title}</dt>
              <dd className="max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                {service.text}
              </dd>
            </div>
          ))}
        </dl>
      </Band>
      <Band id="reviews" title="Reviews" intro="Notes from buyers after the login was delivered.">
        <div>
          {reviews.map((review) => (
            <blockquote key={review.name} className="border-t py-6">
              <p className="max-w-[58ch] text-lg leading-relaxed">{review.quote}</p>
              <footer className="mt-3 text-sm text-muted-foreground">{review.name}</footer>
            </blockquote>
          ))}
        </div>
      </Band>
      <Band
        id="support"
        title="Support"
        intro="Help with payment, delivery, and a listing that does not match what arrived."
      >
        <div className="max-w-[58ch] border-t pt-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            If a slip is unclear, we ask before marking the order paid. The login goes to
            the phone number from checkout, so keep that number reachable.
          </p>
          <p className="mt-4">
            If someone else reserved the account after you paid, send the order ID from
            the confirmation screen and we will arrange the refund.
          </p>
        </div>
      </Band>
      <Band
        id="how-it-works"
        title="How it works"
        intro="From the listing to the login."
      >
        <ol>
          {steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t py-5">
              <span className="font-display text-3xl leading-none font-bold font-stretch-[75%] text-primary">
                {index + 1}
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Band>
    </>
  );
}

function Band({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h2 className="font-display text-5xl leading-none font-bold font-stretch-[75%] tracking-tight sm:text-6xl">
          {title}
        </h2>
        <p className="mt-4 max-w-[48ch] leading-relaxed text-muted-foreground">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

async function Storefront({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filters = parseStoreFilters(await searchParams);
  const listings = await getStoreListings();
  const results = filterListings(listings, filters);
  const [featured, ...rest] = results;

  return (
    <div className="flex flex-col gap-8">
      <ListingFilters
        key={JSON.stringify(filters)}
        filters={filters}
        ranks={distinctValues(listings, "rank")}
        regions={distinctValues(listings, "region")}
      />
      {featured ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "account" : "accounts"}
          </p>
          <FeaturedListing listing={featured} />
          {rest.length > 0 && (
            <ul>
              {rest.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="border border-dashed px-6 py-14">
          <p className="font-medium">
            {listings.length === 0 ? "Nothing listed yet" : "No matches"}
          </p>
          <p className="mt-1 max-w-[46ch] text-sm text-muted-foreground">
            {listings.length === 0
              ? "New accounts show up here when they are added."
              : "Widen the price range, or clear the rank and region."}
          </p>
        </div>
      )}
    </div>
  );
}

function StorefrontSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-24 animate-pulse bg-muted" />
      <div className="aspect-[4/3] animate-pulse bg-muted md:aspect-[2/1]" />
    </div>
  );
}
