import "server-only";

// Cloudflare Turnstile server-side check. Without a secret key it passes in
// development (so the form is testable) and fails closed in production.
// Failures are logged with Cloudflare's reason so they show up in Vercel logs.
export async function verifyTurnstile(token: unknown, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    console.error("Turnstile: TURNSTILE_SECRET_KEY is not set; rejecting /apply submissions.");
    return false;
  }
  if (typeof token !== "string" || !token) {
    console.error(
      "Turnstile: no token sent. Is NEXT_PUBLIC_TURNSTILE_SITE_KEY set at build time and the widget loading?"
    );
    return false;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (result.success !== true) {
      console.error("Turnstile: verification failed:", result["error-codes"]?.join(", ") || "unknown");
    }
    return result.success === true;
  } catch (error) {
    console.error("Turnstile: couldn't reach Cloudflare:", error);
    return false;
  }
}
