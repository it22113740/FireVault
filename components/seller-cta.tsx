import Link from "next/link";
import { ArrowRightIcon, CheckIcon, StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowPanel } from "@/components/glow-panel";

const BENEFITS = ["Your own shop page", "Direct WhatsApp sales", "Customer ratings & reviews"];

export function SellerCta() {
  return (
    <GlowPanel>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold tracking-[0.16em] text-primary uppercase">
            <StoreIcon className="size-4" aria-hidden="true" /> For sellers
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Have accounts to sell? <span className="text-primary">Start here.</span>
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Open your shop on Banzzz•23 FF E Store and connect with buyers directly.
            Apply to get started.
          </p>
          <ul className="mt-6 flex flex-col gap-x-5 gap-y-3 text-sm text-foreground/90 sm:flex-row sm:flex-wrap">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2 sm:items-start lg:items-center">
          <Button
            size="lg"
            className="h-14 w-full bg-brand px-8 text-base font-bold shadow-lg shadow-primary/20 hover:brightness-110 sm:w-auto"
            render={<Link href="/apply" />}
            nativeButton={false}
          >
            Become an Admin <ArrowRightIcon />
          </Button>
          <Link
            href="/sellers"
            className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Meet our sellers <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </GlowPanel>
  );
}
