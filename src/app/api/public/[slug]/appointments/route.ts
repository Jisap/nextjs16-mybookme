import { NextResponse } from "next/server";
import { PublicBookingError, createPublicAppointment } from "@/features/booking/service";
import { createAppointmentBody } from "@/features/booking/schema";
import { LIMITS, clientIp, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { bookingUrls, buildConfirmationEmail } from "@/features/notifications/email";
import { sendEmail } from "@/features/notifications/send";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const rl = rateLimit(
      `book:${clientIp(req)}:${slug}`,
      LIMITS.createAppointment.limit,
      LIMITS.createAppointment.windowMs
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
      );
    }
    const json = await req.json();
    // honeypot anti-bots: si viene relleno, finge éxito sin crear nada
    if (typeof json?.website === "string" && json.website.trim() !== "") {
      return NextResponse.json({ appointment: null, deduped: false }, { status: 201 });
    }
    const parsed = createAppointmentBody.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        { error: "VALIDATION", issues: parsed.error.issues },
        { status: 400 }
      );
    const { appointment, deduped } = await createPublicAppointment(slug, parsed.data);

    // Email confirmación (best-effort: nunca rompe la reserva)
    if (!deduped) {
      try {
        const full = await prisma.appointment.findUnique({
          where: { id: appointment.id },
          include: { business: true, service: true, staff: true, customer: true },
        });
        if (full?.customer.email) {
          const { cancelUrl, icsUrl } = bookingUrls(full.cancelToken);
          const mail = buildConfirmationEmail({
            businessName: full.business.name,
            serviceName: full.service.name,
            staffName: full.staff.name,
            startAt: full.startAt,
            endAt: full.endAt,
            timezone: full.business.timezone,
            customerName: full.customer.name,
            cancelUrl,
            icsUrl,
          });
          await sendEmail({ to: full.customer.email, ...mail });
        }
      } catch (e) {
        console.error("[booking:email] confirmación falló", e);
      }
    }

    return NextResponse.json(
      {
        appointment: {
          id: appointment.id,
          serviceId: appointment.serviceId,
          staffId: appointment.staffId,
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          status: appointment.status,
          cancelToken: appointment.cancelToken,
        },
        deduped,
      },
      { status: deduped ? 200 : 201 }
    );
  } catch (e) {
    if (e instanceof PublicBookingError)
      return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
