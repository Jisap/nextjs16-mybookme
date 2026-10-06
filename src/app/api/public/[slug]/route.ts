import { NextResponse } from "next/server";
import { getBusinessBySlug, PublicBookingError } from "@/features/booking/service";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const b = await getBusinessBySlug(slug);
    return NextResponse.json({
      business: {
        name: b.name,
        slug: b.slug,
        timezone: b.timezone,
        description: b.description,
        phone: b.phone,
        address: b.address,
      },
    });
  } catch (e) {
    if (e instanceof PublicBookingError)
      return NextResponse.json({ error: e.code }, { status: e.status });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
