// Public address of the site, used for password-reset links and metadata.
// No trailing slash: callers append paths like "/auth/confirm".
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.suban23.com").replace(/\/$/, "");
