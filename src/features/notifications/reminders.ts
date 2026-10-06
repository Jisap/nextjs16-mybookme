import { prisma } from "@/lib/db";
import { bookingUrls, buildReminderEmail } from "./email";
import { sendEmail } from "./send";

export interface ReminderResult {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Citas que empiezan en ~24h (±1h), activas, con email y sin recordatorio previo. */
export async function findDueReminders(now = new Date()) {
  const from = new Date(now.getTime() + 23 * 3_600_000);
  const to = new Date(now.getTime() + 25 * 3_600_000);
  return prisma.appointment.findMany({
    where: {
      startAt: { gte: from, lt: to },
      status: { in: ["PENDING", "CONFIRMED"] },
      reminderSentAt: null,
      customer: { email: { not: null } },
    },
    include: { business: true, service: true, staff: true, customer: true },
    orderBy: { startAt: "asc" },
    take: 100,
  });
}

export async function sendDueReminders(now = new Date()): Promise<ReminderResult> {
  const due = await findDueReminders(now);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const a of due) {
    if (!a.customer.email) {
      skipped++;
      continue;
    }
    const { cancelUrl, icsUrl } = bookingUrls(a.cancelToken);
    const mail = buildReminderEmail({
      businessName: a.business.name,
      serviceName: a.service.name,
      staffName: a.staff.name,
      startAt: a.startAt,
      endAt: a.endAt,
      timezone: a.business.timezone,
      customerName: a.customer.name,
      cancelUrl,
      icsUrl,
    });
    const r = await sendEmail({ to: a.customer.email, ...mail });
    if (r.ok && !r.skipped) {
      sent++;
      await prisma.appointment.update({
        where: { id: a.id },
        data: { reminderSentAt: new Date() },
      });
    } else if (r.ok && r.skipped) {
      // modo dev (sin key): marca para no reintentar en bucle, cuenta como skipped
      skipped++;
      await prisma.appointment.update({
        where: { id: a.id },
        data: { reminderSentAt: new Date() },
      });
    } else {
      failed++;
    }
  }
  return { checked: due.length, sent, skipped, failed };
}
