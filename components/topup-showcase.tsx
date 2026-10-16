import Link from "next/link";
import {
  ArrowRightIcon,
  CrownIcon,
  GemIcon,
  SendIcon,
  SparklesIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { GlowPanel } from "@/components/glow-panel";
import { TiltCard } from "@/components/interactive";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatPrice } from "@/lib/format";
import type { TopupCategory } from "@/lib/topups";

export type TopupCategorySummary = {
  value: TopupCategory;
  label: string;
  count: number;
  minPrice: number | null;
};

const DETAILS: Record<TopupCategory, { text: string; icon: LucideIcon }> = {
  membership: { text: "Weekly and monthly passes with daily rewards.", icon: CrownIcon },
  vip_bundle: { text: "Bundles packed with extra items and rewards.", icon: SparklesIcon },
  diamonds: { text: "Diamond packs in every size, from small to huge.", icon: GemIcon },
  level_up_pass: { text: "Explore level up passes for your game ID.", icon: ZapIcon },
};

const STEPS = ["Pick a pack", "Send your UID on WhatsApp", "Get it delivered"];

// Home page top-up banner: what's on offer per category (live pack counts
// and starting prices), how ordering works, and a WhatsApp shortcut.
export function TopupShowcase({
  categories,
  currency,
  whatsappNumber,
}: {
  categories: TopupCategorySummary[];
  currency: string;
  whatsappNumber: string;
}) {
  return (
    <GlowPanel glowCorner="bottom-left">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div className="flex flex-col gap-5">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-lg shadow-primary/30 motion-safe:group-hover:animate-jiggle">
            <ZapIcon className="size-7" />
          </span>
          <p className="text-sm font-semibold tracking-[0.2em] text-primary uppercase">UID top up</p>
          <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl">
            Top up in <span className="bg-brand bg-clip-text text-transparent">minutes</span>
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Memberships, VIP bundles, diamonds and level up passes for your game ID. Choose a pack, send us your UID
            on WhatsApp and we&apos;ll deliver it once your payment is confirmed.
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
              render={<Link href="/top-ups" />}
              nativeButton={false}
            >
              See all top-ups <ArrowRightIcon />
            </Button>
            {whatsappNumber && (
              <WhatsAppButton
                number={whatsappNumber}
                message="Hi! I'd like to top up my game ID. What packs do you have?"
                label="Ask on WhatsApp"
                variant="secondary"
                className="h-12 px-6"
              />
            )}
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {categories.map(({ value, label, count, minPrice }) => {
            const { text, icon: Icon } = DETAILS[value];
            return (
              <li key={value}>
                <TiltCard maxTilt={4}>
                  <Link
                    href={`/top-ups?category=${value}`}
                    className="group/topup flex items-center gap-4 rounded-2xl border bg-background/60 p-4 backdrop-blur transition-colors duration-200 hover:border-primary/50 active:scale-[0.99] sm:p-5"
                  >
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 transition-transform duration-300 group-hover/topup:-rotate-6 group-hover/topup:scale-110">
                      <Icon className="size-7 text-primary" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-heading text-lg font-semibold">{label}</span>
                      <span className="text-sm text-muted-foreground">{text}</span>
                      <span className="text-sm font-semibold text-primary">
                        {count > 0 && minPrice !== null
                          ? `${count} ${count === 1 ? "pack" : "packs"} · from ${formatPrice(minPrice, currency)}`
                          : "Coming soon"}
                      </span>
                    </span>
                    <SendIcon className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-hover/topup:translate-x-1 group-hover/topup:text-primary" />
                  </Link>
                </TiltCard>
              </li>
            );
          })}
        </ul>
      </div>
    </GlowPanel>
  );
}
