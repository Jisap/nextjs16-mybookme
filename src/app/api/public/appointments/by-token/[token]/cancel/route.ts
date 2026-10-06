import { NextResponse } from "next/server";
import { cancelByToken } from "@/features/booking/cancel";
import { PublicBookingError } from "@/features/booking/service";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const rl = rateLimit(
      `cancel:${clientIp(req)}`,
      LIMITS.createAppointment.limit,
      LIMITS.createAppointment.windowMs
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
    const appt = await cancelByToken(token);
    return NextResponse.json({ appointment: { id: appt.id, status: appt.status } });
  } catch (e) {
    if (e instanceof PublicBookingError)
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
