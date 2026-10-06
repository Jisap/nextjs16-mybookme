import { NextResponse } from "next/server";
import { sendDueReminders } from "@/features/notifications/reminders";

/**
 * GET /api/cron/reminders — recordatorios 24h.
 * Auth: Authorization: Bearer <CRON_SECRET>.
 * Para vercel.json / pg_cron / cron externo.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const url = new URL(req.url);
    const q = url.searchParams.get("secret") ?? "";
    if (auth !== `Bearer ${secret}` && q !== secret) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }
  const result = await sendDueReminders();
  return NextResponse.json({ ok: true, ...result });
}
