import type { Enums } from "@/lib/database.types";

export type TopupCategory = Enums<"topup_category">;

export const TOPUP_CATEGORIES: { value: TopupCategory; label: string }[] = [
  { value: "membership", label: "Membership" },
  { value: "vip_bundle", label: "VIP Bundle" },
  { value: "diamonds", label: "Diamonds" },
];

export function topupCategoryLabel(category: TopupCategory) {
  return TOPUP_CATEGORIES.find((option) => option.value === category)!.label;
}

export function parseTopupCategory(value: unknown): TopupCategory | undefined {
  return TOPUP_CATEGORIES.find((option) => option.value === value)?.value;
}
