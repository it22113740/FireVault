"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { StoreFilters } from "@/src/lib/store";

type ListingFiltersProps = {
  filters: StoreFilters;
  ranks: string[];
  regions: string[];
};

export function ListingFilters({ filters, ranks, regions }: ListingFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = Object.values(filters).some((value) => value !== undefined);

  function navigate(params: URLSearchParams) {
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/?${query}#accounts` : "/#accounts", { scroll: false });
    });
  }

  // Build the URL ourselves so empty fields don't end up as ?min=&max=
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) params.set(key, value.trim());
    }
    navigate(params);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 gap-3 border bg-card p-4 lg:grid-cols-[1fr_1fr_1.2fr_1.2fr_auto] lg:items-end"
    >
      <FilterField label="Min price" htmlFor="min">
        <Input
          id="min"
          name="min"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          defaultValue={filters.minPrice}
        />
      </FilterField>
      <FilterField label="Max price" htmlFor="max">
        <Input
          id="max"
          name="max"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Any"
          defaultValue={filters.maxPrice}
        />
      </FilterField>
      <FilterField label="Rank" htmlFor="rank">
        <NativeSelect id="rank" name="rank" defaultValue={filters.rank ?? ""} className="w-full">
          <NativeSelectOption value="">All ranks</NativeSelectOption>
          {ranks.map((rank) => (
            <NativeSelectOption key={rank} value={rank}>
              {rank}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FilterField>
      <FilterField label="Region" htmlFor="region">
        <NativeSelect
          id="region"
          name="region"
          defaultValue={filters.region ?? ""}
          className="w-full"
        >
          <NativeSelectOption value="">All regions</NativeSelectOption>
          {regions.map((region) => (
            <NativeSelectOption key={region} value={region}>
              {region}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FilterField>
      <div className="col-span-2 flex gap-2 lg:col-span-1">
        <Button type="submit" className="flex-1 lg:flex-none" disabled={pending}>
          <SlidersHorizontalIcon />
          {pending ? "Filtering…" : "Apply"}
        </Button>
        {active && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => navigate(new URLSearchParams())}
          >
            Reset
          </Button>
        )}
      </div>
    </form>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
