import "server-only";

// WhatsApp messages through Twilio's REST API (no SDK needed).
//
// Messages a business starts must use a template Meta has approved. Set
// TWILIO_ORDER_TEMPLATE_SID to that template's Content SID ("HX…") and the
// variables are filled in. Without it, a plain-text body is sent, which only
// works in the Twilio Sandbox or within 24 hours of the admin last messaging
// the business number. Returns false when Twilio isn't configured or sending
// fails; the caller falls back to email.
export async function sendWhatsApp({
  to,
  body,
  templateVariables,
}: {
  /** E.164, e.g. +94771234567 */
  to: string;
  body: string;
  /** Template variables, keyed "1", "2", … in template order */
  templateVariables?: Record<string, string>;
}): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const templateSid = process.env.TWILIO_ORDER_TEMPLATE_SID;
  if (!accountSid || !authToken || !from || !to) return false;

  const params = new URLSearchParams({
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    To: `whatsapp:${to}`,
  });
  if (templateSid && templateVariables) {
    params.set("ContentSid", templateSid);
    params.set("ContentVariables", JSON.stringify(templateVariables));
  } else {
    params.set("Body", body);
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
