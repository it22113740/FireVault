import Image from "next/image";
import { GemIcon } from "lucide-react";
import { TiltCard } from "@/components/interactive";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatPrice } from "@/lib/format";
import type { PublicTopup } from "@/lib/store";
import { topupMessage } from "@/lib/whatsapp-messages";

export function TopupCard({
  topup,
  currency,
  whatsappNumber,
}: {
  topup: PublicTopup;
  currency: string;
  whatsappNumber: string;
}) {
  return (
    <TiltCard>
      <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card transition duration-200 hover:border-primary/50 md:hover:-translate-y-1">
        <div className="relative aspect-[4/3] bg-muted">
          {topup.imageUrl ? (
            <Image
              src={topup.imageUrl}
              alt={topup.name}
              fill
              sizes="(min-width: 1280px) 280px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <GemIcon className="absolute inset-0 m-auto size-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-1 font-heading text-base leading-5 font-semibold">
            {topup.name}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{topup.description}</p>
          <p className="mt-auto pt-2 font-heading text-xl leading-7 font-bold text-primary tabular-nums">
            {formatPrice(topup.price, currency)}
          </p>
          <WhatsAppButton
            number={whatsappNumber}
            message={topupMessage(topup, currency)}
            variant="secondary"
            className="mt-2 w-full"
          />
        </div>
      </article>
    </TiltCard>
  );
}
