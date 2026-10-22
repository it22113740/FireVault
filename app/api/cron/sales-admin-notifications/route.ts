import { sendSalesAdminNotifications } from "@/lib/sales-admin-notifications";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendSalesAdminNotifications();
    return Response.json(result, { status: result.failed ? 503 : 200 });
  } catch (error) {
    console.error("Sales admin notification job failed", error);
    return Response.json({ error: "Notification job failed" }, { status: 500 });
  }
}
