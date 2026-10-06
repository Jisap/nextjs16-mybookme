import { NextResponse } from "next/server";
import { PublicBookingError, getPublicServices } from "@/features/booking/service";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    return NextResponse.json(await getPublicServices(slug));
  } catch (e) {
    if (e instanceof PublicBookingError)
      return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
