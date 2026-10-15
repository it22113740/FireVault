import Link from "next/link";
import { ArrowRightIcon, CheckIcon, StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFITS = ["Your own shop page", "Direct WhatsApp sales", "Customer ratings & reviews"];

export function SellerCta() {
  return (
    <div className="border-t border-border/70 pt-10 sm:pt-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-2xl">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            <StoreIcon className="size-4" aria-hidden="true" /> For sellers
          </p>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Have accounts to sell?
          </h2>
          <p className="mt-3 max-w-xl text-base text-muted-foreground sm:text-lg">
            Open your shop on Banzzz•23 FF E Store and connect with buyers directly.
            Apply to get started.
          </p>
          <ul className="mt-5 flex flex-col gap-x-5 gap-y-2 text-sm text-muted-foreground sm:flex-row sm:flex-wrap">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-center">
          <Button
            size="lg"
            className="h-12 w-full px-6 font-semibold sm:w-auto"
            render={<Link href="/apply" />}
            nativeButton={false}
          >
            Become an admin <ArrowRightIcon />
          </Button>
          <Link
            href="/sellers"
            className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Meet our sellers <ArrowRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
