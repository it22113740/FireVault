"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeftRightIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { ListingFilters } from "@/lib/store";
import { useFilterNavigation } from "./filter-navigation";

type AccountFiltersProps = { regions: string[]; filters: ListingFilters };

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

// Desktop: inline bar. Mobile: "Filters" opens a bottom sheet.
export function AccountFilters({ regions, filters }: AccountFiltersProps) {
  const [open, setOpen] = useState(false);
  const active = [filters.region, filters.min, filters.max, filters.availability].filter(
    (value) => value !== undefined
  ).length;

  return (
    <>
      <div className="hidden flex-col gap-3 md:flex">
        <FilterForm regions={regions} filters={filters} layout="inline" />
        <ExchangeToggle on={!!filters.exchange} />
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="lg" className="h-11 flex-1" />}>
            <SlidersHorizontalIcon /> Filters{active > 0 && ` (${active})`}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85svh] gap-0 rounded-t-2xl p-5">
            <SheetTitle className="mb-4 font-heading text-lg">Filter accounts</SheetTitle>
            <FilterForm regions={regions} filters={filters} layout="stacked" onApplied={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <SortSelect sort={filters.sort} className="flex-1" />
      </div>
      <div className="md:hidden">
        <ExchangeToggle on={!!filters.exchange} />
      </div>
    </>
  );
}

// Applies straight away, like the sort
function ExchangeToggle({ on }: { on: boolean }) {
  const { apply } = useFilterNavigation();
  return (
    <label className="flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm">
      <Switch
        checked={on}
        onCheckedChange={(checked) => apply({ exchange: checked ? "1" : undefined })}
        aria-label="Only show accounts open to exchange"
      />
      <span className="flex items-center gap-1.5">
        <ArrowLeftRightIcon className="size-4 text-primary" /> Exchange possible only
      </span>
    </label>
  );
}

function SortSelect({ sort, className }: { sort: string; className?: string }) {
  const { apply } = useFilterNavigation();
  return (
    <NativeSelect
      aria-label="Sort"
      value={sort}
      onChange={(event) => apply({ sort: event.target.value === "newest" ? undefined : event.target.value })}
      className={`[&_select]:h-11 ${className ?? ""}`}
    >
      {SORT_OPTIONS.map((option) => (
        <NativeSelectOption key={option.value} value={option.value}>
          {option.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

function FilterForm({
  regions,
  filters,
  layout,
  onApplied,
}: AccountFiltersProps & { layout: "inline" | "stacked"; onApplied?: () => void }) {
  const { apply } = useFilterNavigation();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim() || undefined;
    apply({
      region: value("region"),
      availability: value("availability"),
      min: value("min"),
      max: value("max"),
    });
    onApplied?.();
  }

  const inline = layout === "inline";

  return (
    <form
      // Remount when the URL changes so the fields show the applied filters
      key={JSON.stringify(filters)}
      onSubmit={submit}
      className={
        inline
          ? "grid grid-cols-[1fr_1fr_0.8fr_0.8fr_auto_1fr] items-end gap-3 rounded-xl border bg-card p-3"
          : "flex flex-col gap-4"
      }
    >
      <Field label="Region" htmlFor={`${layout}-region`}>
        <NativeSelect
          id={`${layout}-region`}
          name="region"
          defaultValue={filters.region ?? ""}
          className="w-full [&_select]:h-11"
          onChange={inline ? (event) => apply({ region: event.target.value || undefined }) : undefined}
        >
          <NativeSelectOption value="">All regions</NativeSelectOption>
          {regions.map((region) => (
            <NativeSelectOption key={region} value={region}>
              {region}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Availability" htmlFor={`${layout}-availability`}>
        <NativeSelect
          id={`${layout}-availability`}
          name="availability"
          defaultValue={filters.availability ?? ""}
          className="w-full [&_select]:h-11"
          onChange={
            inline ? (event) => apply({ availability: event.target.value || undefined }) : undefined
          }
        >
          <NativeSelectOption value="">Any</NativeSelectOption>
          <NativeSelectOption value="available">Available</NativeSelectOption>
          <NativeSelectOption value="reserved">Reserved</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field label="Min price" htmlFor={`${layout}-min`}>
        <Input
          id={`${layout}-min`}
          name="min"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="0"
          defaultValue={filters.min}
          className="h-11"
        />
      </Field>
      <Field label="Max price" htmlFor={`${layout}-max`}>
        <Input
          id={`${layout}-max`}
          name="max"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Any"
          defaultValue={filters.max}
          className="h-11"
        />
      </Field>
      <Button type="submit" size="lg" variant={inline ? "outline" : "default"} className="h-11">
        Apply
      </Button>
      {inline ? (
        <Field label="Sort" htmlFor="sort">
          <SortSelect sort={filters.sort} className="w-full" />
        </Field>
      ) : (
        <Button
          type="button"
          size="lg"
          variant="ghost"
          className="h-11"
          onClick={() => {
            apply({ region: undefined, availability: undefined, min: undefined, max: undefined, exchange: undefined });
            onApplied?.();
          }}
        >
          Clear filters
        </Button>
      )}
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
