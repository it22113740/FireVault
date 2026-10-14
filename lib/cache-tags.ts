// Tags for "use cache" public reads. Every mutation that changes this data
// must call updateTag() with the matching tag so the store updates at once.
export const CACHE_TAGS = {
  listings: "listings",
  topups: "topups",
  settings: "settings",
} as const;
