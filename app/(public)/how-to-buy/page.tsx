import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheckIcon, MessageCircleIcon, MousePointerClickIcon } from "lucide-react";
import { Reveal } from "@/components/interactive";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How to buy",
  description: "Pick an account or top-up, chat on WhatsApp, pay manually and receive it.",
};

const STEPS = [
  {
    icon: MousePointerClickIcon,
    title: "Pick an account or top-up",
    text: "Browse accounts by region and price, or choose a membership, VIP bundle, diamond pack or level up pass.",
  },
  {
    icon: MessageCircleIcon,
    title: "Chat on WhatsApp",
    text: "Tap Buy on WhatsApp. The chat opens with the item, its ID and price already written for you.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Pay manually and receive it",
    text: "The seller tells you how to pay. Once the payment is confirmed, you get the account login or your top-up.",
  },
];

export default function HowToBuyPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How to buy</h1>
        <p className="mt-2 text-muted-foreground">
          No checkout or online payment. You chat with the seller on WhatsApp and pay them directly.
        </p>
      </div>
      <ol className="flex flex-col gap-4">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <Reveal
            as="li"
            key={title}
            delay={index * 0.12}
            className="group flex gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/50"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
              <Icon className="size-5 text-primary" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">
                <span className="text-primary">{index + 1}.</span> {title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Button
          size="lg"
          className="h-11 bg-brand font-semibold text-primary-foreground"
          render={<Link href="/accounts" />}
          nativeButton={false}
        >
          Browse accounts
        </Button>
        <Button size="lg" variant="outline" className="h-11" render={<Link href="/top-ups" />} nativeButton={false}>
          See top-ups
        </Button>
      </div>
    </div>
  );
}
