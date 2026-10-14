// wa.me needs the number as digits only, without "+"
export function whatsappUrl(e164: string, message?: string) {
  const digits = e164.replace(/\D/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${query}`;
}
