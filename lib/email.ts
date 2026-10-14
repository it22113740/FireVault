import "server-only";

// Non-auth emails (e.g. application denied) via Resend's REST API. Auth emails
// (password reset) are sent by Supabase through its own SMTP settings.
// Returns false when email isn't configured or sending fails.
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
