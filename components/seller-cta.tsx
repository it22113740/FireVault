"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  MessageCircleIcon,
  StarIcon,
  StoreIcon,
  TrendingUpIcon,
} from "lucide-react";
import { GlowPanel } from "@/components/glow-panel";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  {
    icon: StoreIcon,
    title: "Your own shop page",
    text: "Logo, cover photo and a shareable link customers can trust.",
  },
  {
    icon: TrendingUpIcon,
    title: "Reach more buyers",
    text: "Your accounts appear across the store and in Latest accounts.",
  },
  {
    icon: MessageCircleIcon,
    title: "Close deals on WhatsApp",
    text: "Buyers message you directly. You set the price and the terms.",
  },
  {
    icon: StarIcon,
    title: "Build your reputation",
    text: "Likes, star ratings, reviews and total sold, all on your profile.",
  },
];

const STEPS = ["Apply", "Get approved", "Start selling"];

// "Become a seller" banner on the home page. Frame and hover motion come
// from GlowPanel; the shop icon and Apply button jiggle while hovered.
export function SellerCta() {
  return (
    <GlowPanel>
      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col gap-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-lg shadow-primary/30 motion-safe:group-hover:animate-jiggle">
            <StoreIcon className="size-7" />
          </span>
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            For sellers
          </p>
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
            Turn your game accounts into{" "}
            <span className="bg-brand bg-clip-text text-transparent">real cash</span>
          </h2>
          <p className="max-w-xl text-lg font-medium text-muted-foreground sm:text-xl">
            Join Banzzz•23 FF E Store as a seller. Get your own shop page, list accounts in minutes
            and close deals with buyers directly on WhatsApp.
          </p>

          <ol className="flex flex-wrap items-center gap-2 font-semibold">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm">
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand text-xs text-primary-foreground">
                    {index + 1}
                  </span>
                  {step}
                </span>
                {index < STEPS.length - 1 && (
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                )}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-12 bg-brand px-6 text-base font-semibold text-primary-foreground hover:opacity-90 motion-safe:hover:animate-jiggle"
              render={<Link href="/apply" />}
              nativeButton={false}
            >
              Apply to sell <ArrowRightIcon />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              render={<Link href="/sellers" />}
              nativeButton={false}
            >
              <BadgeCheckIcon /> Meet our sellers
            </Button>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              className="flex flex-col gap-2 rounded-2xl border bg-background/60 p-4 backdrop-blur transition-colors duration-200 hover:border-primary/50"
            >
              <Icon className="size-6 text-primary" />
              <h3 className="font-heading font-semibold">{title}</h3>
              <p className="text-base font-medium text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </GlowPanel>
  );
}
