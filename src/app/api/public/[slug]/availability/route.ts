import { NextResponse } from "next/server";
import { PublicBookingError, getPublicAvailability } from "@/features/booking/service";
import { availabilityQuery } from "@/features/booking/schema";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const rl = rateLimit(`av:${clientIp(req)}:${slug}`, LIMITS.availability.limit, LIMITS.availability.windowMs);
    if (!rl.ok) {
      return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }
    const url = new URL(req.url);
    const parsed = availabilityQuery.safeParse({
      serviceId: url.searchParams.get("serviceId"),
      date: url.searchParams.get("date"),
      staffId: url.searchParams.get("staffId") ?? "any",
    });
    if (!parsed.success) return NextResponse.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 400 });
    const data = await getPublicAvailability(slug, parsed.data.serviceId, parsed.data.date, parsed.data.staffId);
    return NextResponse.json(data);
  } catch (e) {
    if (e instanceof PublicBookingError) return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
