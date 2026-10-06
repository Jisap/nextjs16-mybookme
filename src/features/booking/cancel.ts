import { prisma } from "@/lib/db";
import { PublicBookingError } from "./service";

export function canCancel(
  status: string,
  startAt: Date,
  deadlineMinutes: number,
  now = new Date()
): boolean {
  if (status !== "PENDING" && status !== "CONFIRMED") return false;
  return startAt.getTime() - now.getTime() >= deadlineMinutes * 60_000;
}

export async function getByToken(token: string) {
  const appt = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: { service: true, staff: true, business: { include: { settings: true } } },
  });
  if (!appt) throw new PublicBookingError("NOT_FOUND", "Enlace no válido", 404);
  return appt;
}

export async function cancelByToken(token: string) {
  const appt = await getByToken(token);
  const deadline = appt.business.settings?.cancellationDeadlineMinutes ?? 120;
  if (!canCancel(appt.status, appt.startAt, deadline)) {
    throw new PublicBookingError("TOO_LATE", "Fuera de plazo o ya cerrada", 409);
  }
  return prisma.appointment.update({ where: { id: appt.id }, data: { status: "CANCELLED" } });
}
