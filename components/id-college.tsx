"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { ImagesIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { whatsappUrl } from "@/lib/whatsapp";

export function IdCollege({ whatsappNumber, samples, currency }: {
  whatsappNumber: string;
  samples: { slot: number; price: number; imageUrl: string }[];
  currency: string;
}) {
  const [uid, setUid] = useState("");
  const uidId = useId();

  return (
    <section className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card/60 to-background p-6 sm:p-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <ImagesIcon className="mb-2 size-8 text-primary" aria-hidden />
          <h2 className="text-2xl font-bold sm:text-3xl">Make ID Collage with us</h2>
          <p className="max-w-lg text-muted-foreground">
            Enter your Player UID and contact our admin on WhatsApp to request your ID Collage.
          </p>
        </div>
        {samples.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {samples.map((sample) => (
              <li key={sample.slot} className="overflow-hidden rounded-2xl border border-white/15 bg-background/40 p-3 backdrop-blur">
                <Image src={sample.imageUrl} alt={`ID Collage sample ${sample.slot}`} width={800} height={800}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="aspect-square w-full rounded-xl object-contain" />
                <div className="flex items-center justify-between gap-2 pt-3">
                  <span className="font-medium">Sample {sample.slot}</span>
                  <span className="font-semibold text-primary">{formatPrice(sample.price, currency)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Dialog onOpenChange={(open) => { if (!open) setUid(""); }}>
          <DialogTrigger render={<Button size="lg" className="h-11 w-fit shrink-0 bg-brand font-semibold text-primary-foreground" />}>
            <ImagesIcon /> Make ID Collage
          </DialogTrigger>
          <DialogContent
            overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-md"
            className="border border-white/15 bg-background/55 p-6 shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)] ring-white/10 backdrop-blur-2xl backdrop-saturate-150 sm:max-w-md"
          >
            <div className="flex flex-col gap-2 pr-6">
              <DialogTitle className="text-xl">Make ID Collage</DialogTitle>
              <DialogDescription>
                Enter your Player UID to send an ID Collage request to our admin on WhatsApp.
              </DialogDescription>
            </div>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!whatsappNumber || !/^[0-9]+$/.test(uid.trim())) return;
                window.location.assign(whatsappUrl(whatsappNumber, `Hi! I'd like to make an ID Collage.\nPlayer UID: ${uid.trim()}`));
              }}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor={uidId} className="font-medium">Player UID</label>
                <Input
                  id={uidId}
                  name="playerUid"
                  value={uid}
                  onChange={(event) => setUid(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]+"
                  title="Enter your Player UID using numbers only."
                  required
                  placeholder="Enter your Player UID"
                  className="h-11 border-white/20 bg-background/40"
                />
              </div>
              <Button type="submit" disabled={!whatsappNumber} className="h-11 bg-brand font-semibold text-primary-foreground">
                <MessageCircleIcon /> {whatsappNumber ? "Continue to WhatsApp" : "Contact unavailable"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
