"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveIdCollegeSample, removeIdCollegeSample } from "@/lib/actions/id-college";
import { stageImage } from "@/lib/stage-image";
import { publicImageUrl } from "@/lib/storage";
import type { Tables } from "@/lib/database.types";

type Sample = Tables<"id_college_samples">;

export function IdCollegeManager({ samples, currency }: { samples: Sample[]; currency: string }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-6">
      <div>
        <h2 className="text-xl font-semibold">ID College samples</h2>
        <p className="text-sm text-muted-foreground">Upload up to four examples and set each price. Saved samples appear on the landing page.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((slot) => {
          const sample = samples.find((item) => item.slot === slot);
          return <SampleForm key={`${slot}-${sample?.image_path}-${sample?.price}`} slot={slot} sample={sample} currency={currency} />;
        })}
      </div>
    </section>
  );
}

function SampleForm({ slot, sample, currency }: { slot: number; sample?: Sample; currency: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <form className="flex flex-col gap-3 rounded-xl border bg-card p-4" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const file = fileRef.current?.files?.[0];
      form.delete("image");
      setError("");
      startTransition(async () => {
        try {
          if (file) form.set("stagedImage", await stageImage(file));
          const result = await saveIdCollegeSample(form);
          if (!result.ok) return setError(result.error);
          if (fileRef.current) fileRef.current.value = "";
          toast.success("Sample saved.");
        } catch {
          setError("Couldn't upload the sample. Please try again.");
        }
      });
    }}>
      <h3 className="font-semibold">Sample {slot}</h3>
      <input type="hidden" name="slot" value={slot} />
      {sample && <Image src={publicImageUrl(sample.image_path)} alt={`ID College sample ${slot}`} width={600} height={600} className="h-48 w-full rounded-lg bg-muted object-contain" />}
      <label htmlFor={`sample-image-${slot}`} className="text-sm font-medium">{sample ? "Replace image" : "Sample image"}</label>
      <Input ref={fileRef} id={`sample-image-${slot}`} name="image" type="file" accept="image/jpeg,image/png,image/webp" required={!sample} disabled={pending} className="h-11" />
      <label htmlFor={`sample-price-${slot}`} className="text-sm font-medium">Price ({currency})</label>
      <Input id={`sample-price-${slot}`} name="price" type="number" min="0.01" max="9999999999.99" step="0.01" defaultValue={sample?.price} required disabled={pending} className="h-11" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save sample"}</Button>
      {sample && <Button type="button" variant="outline" disabled={pending} onClick={() => {
        setError("");
        startTransition(async () => {
          try {
            const result = await removeIdCollegeSample(slot);
            if (!result.ok) return setError(result.error);
            toast.success("Sample removed.");
          } catch { setError("Couldn't remove the sample. Please try again."); }
        });
      }}>Remove sample</Button>}
    </form>
  );
}
