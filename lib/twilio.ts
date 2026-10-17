import "server-only";

// WhatsApp messages through Twilio's REST API (no SDK needed).
//
// Messages a business starts must use a template Meta has approved: pass its
// Content SID ("HX…") and variables as `template`. Without one, a plain body
// (plus `mediaUrl`, if any) is sent, which only works in the Twilio Sandbox or
// within 24 hours of the admin last messaging the business number. Returns
// false when Twilio isn't configured or sending fails; callers fall back to
// email.
export async function sendWhatsApp({
  to,
  body,
  mediaUrl,
  template,
}: {
  /** E.164, e.g. +94771234567 */
  to: string;
  body: string;
  /** Public JPEG/PNG URL attached to a plain message (WhatsApp shows WebP as a sticker) */
  mediaUrl?: string;
  /** Approved template; variables keyed "1", "2", … in template order */
  template?: { sid: string; variables: Record<string, string> };
}): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from || !to) return false;

  const params = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: `whatsapp:${to}`,
  });
  if (template) {
    params.set("ContentSid", template.sid);
    params.set("ContentVariables", JSON.stringify(template.variables));
  } else {
    params.set("Body", body);
    if (mediaUrl) params.set("MediaUrl", mediaUrl);
  }

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as { code?: number; message?: string } | null;
      console.error("Twilio WhatsApp failed:", response.status, error?.code, error?.message);
    }
    return response.ok;
  } catch (error) {
    console.error("Twilio WhatsApp failed:", error);
    return false;
  }
}
