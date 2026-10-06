import { NextResponse } from "next/server";
import { buildIcs } from "@/features/booking/ics";
import { getByToken } from "@/features/booking/cancel";
import { PublicBookingError } from "@/features/booking/service";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    const a = await getByToken(token);
    const ics = buildIcs({
      uid: a.id,
      summary: `${a.service.name} - ${a.business.name}`,
      description: `Reserva con ${a.staff.name}`,
      location: a.business.name,
      start: a.startAt,
      end: a.endAt,
    });
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="reserva-${a.service.name.replace(/\s+/g, "-").toLowerCase()}.ics"`,
      },
    });
  } catch (e) {
    if (e instanceof PublicBookingError)
      return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
