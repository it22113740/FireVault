// "LKR 15,000" (PLAN.md open questions: currency shown as code + amount)
export function formatPrice(price: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(price)}`;
}

// Short public ID customers paste into WhatsApp, e.g. "A1B2C3"
export function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
