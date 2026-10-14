"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Applies on change; the URL updates instantly and results stream in
export function ListingFilters({
  regions,
  availability,
  region,
}: {
  regions: string[];
  availability?: string;
  region?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label="Availability"
        defaultValue={availability ?? ""}
        onChange={(event) => update("availability", event.target.value)}
        className="[&_select]:h-11"
      >
        <NativeSelectOption value="">Any availability</NativeSelectOption>
        <NativeSelectOption value="available">Available</NativeSelectOption>
        <NativeSelectOption value="reserved">Reserved</NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        aria-label="Region"
        defaultValue={region ?? ""}
        onChange={(event) => update("region", event.target.value)}
        className="[&_select]:h-11"
      >
        <NativeSelectOption value="">All regions</NativeSelectOption>
        {regions.map((value) => (
          <NativeSelectOption key={value} value={value}>
            {value}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
    </div>
  );
}
