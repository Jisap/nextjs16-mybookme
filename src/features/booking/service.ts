import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { getAvailability, getAvailabilityAny } from "@/domain/availability/engine";
import { trialStatus } from "@/features/billing/trial";
import type { CreateAppointmentInput } from "./schema";

export class PublicBookingError extends Error {
  status: number;
  code: string;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function dayBounds(dateStr: string, tz: string) {
  const start = fromZonedTime(`${dateStr} 00:00`, tz);
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const next = d.toISOString().slice(0, 10);
  const end = fromZonedTime(`${next} 00:00`, tz);
  return { start, end };
}

export async function getBusinessBySlug(slug: string) {
  const b = await prisma.business.findUnique({
    where: { slug },
    include: { settings: true },
  });
  if (!b) throw new PublicBookingError("NOT_FOUND", "Negocio no encontrado", 404);
  return b;
}

/** Bloqueo suave Fase 8: sin prueba ni suscripción no entran reservas (ver sí se puede). */
export function requireBookable(b: { trialEndsAt: Date | null; subscriptionStatus: string }) {
  if (trialStatus(b).state === "EXPIRED") {
    throw new PublicBookingError(
      "TRIAL_EXPIRED",
      "Este negocio no está aceptando reservas ahora mismo",
      402
    );
  }
}

export async function getPublicServices(slug: string) {
  const b = await getBusinessBySlug(slug);
  const services = await prisma.service.findMany({
    where: { businessId: b.id, active: true },
    orderBy: { name: "asc" },
    include: {
      staff: { include: { staff: true } },
    },
  });
  const staffList = await prisma.staff.findMany({
    where: { businessId: b.id, active: true },
    orderBy: { name: "asc" },
  });
  return {
    business: {
      name: b.name,
      slug: b.slug,
      timezone: b.timezone,
      description: b.description,
      phone: b.phone,
      address: b.address,
    },
    staff: staffList.map((st) => ({ id: st.id, name: st.name })),
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
      currency: s.currency,
      staffIds: s.staff.filter((x) => x.staff.active).map((x) => x.staff.id),
    })),
  };
}

async function loadDayContext(businessId: string, dateStr: string, tz: string) {
  const { start, end } = dayBounds(dateStr, tz);
  const [workingHours, exceptions, appointments, settings] = await Promise.all([
    prisma.workingHours.findMany({ where: { businessId } }),
    prisma.scheduleException.findMany({ where: { businessId, date: new Date(dateStr) } }),
    prisma.appointment.findMany({
      where: { businessId, startAt: { lt: end }, blockedUntil: { gt: start } },
    }),
    prisma.businessSettings.findUnique({ where: { businessId } }),
  ]);
  return {
    workingHours: workingHours.map((w) => ({
      dayOfWeek: w.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: w.startTime,
      endTime: w.endTime,
      staffId: w.staffId,
    })),
    exceptions: exceptions.map((e) => ({
      date: dateStr,
      startTime: e.startTime,
      endTime: e.endTime,
      type: e.type as "CLOSED" | "OPEN" | "BLOCKED",
      staffId: e.staffId,
    })),
    appointments: appointments.map((a) => ({
      staffId: a.staffId,
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
    })),
    settings: {
      slotIntervalMinutes: settings?.slotIntervalMinutes ?? 15,
      bufferMinutes: settings?.bufferMinutes ?? 0,
      minimumAdvanceMinutes: settings?.minimumAdvanceMinutes ?? 60,
      maximumAdvanceDays: settings?.maximumAdvanceDays ?? 30,
    },
  };
}

export async function getPublicAvailability(
  slug: string,
  serviceId: string,
  dateStr: string,
  staffId: string
) {
  const b = await getBusinessBySlug(slug);
  requireBookable(b);
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: b.id, active: true },
  });
  if (!service) throw new PublicBookingError("SERVICE_INVALID", "Servicio no válido", 400);

  const ctx = await loadDayContext(b.id, dateStr, b.timezone);
  const common = {
    dateStr,
    timezone: b.timezone,
    durationMinutes: service.durationMinutes,
    slotIntervalMinutes: ctx.settings.slotIntervalMinutes,
    bufferMinutes: ctx.settings.bufferMinutes,
    minimumAdvanceMinutes: ctx.settings.minimumAdvanceMinutes,
    maximumAdvanceDays: ctx.settings.maximumAdvanceDays,
    now: new Date(),
    workingHours: ctx.workingHours,
    exceptions: ctx.exceptions,
    appointments: ctx.appointments,
  };

  if (staffId !== "any") {
    const link = await prisma.staffService.findUnique({
      where: { staffId_serviceId: { staffId, serviceId } },
      include: { staff: true },
    });
    if (!link || !link.staff.active || link.staff.businessId !== b.id) {
      throw new PublicBookingError("STAFF_INVALID", "Profesional no válido", 400);
    }
    const slots = getAvailability({ ...common, staffId });
    return {
      slots: slots.map((s) => ({
        start: s.start.toISOString(),
        end: s.end.toISOString(),
        staffId,
      })),
    };
  }

  const eligible = await prisma.staffService.findMany({
    where: { serviceId, staff: { businessId: b.id, active: true } },
    include: { staff: true },
  });
  const staffIds = eligible.map((e) => e.staff.id);
  if (staffIds.length === 0) return { slots: [] };
  const slots = getAvailabilityAny({ ...common, staffIds });
  return {
    slots: slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      staffIds: s.staffIds,
    })),
  };
}

export async function createPublicAppointment(slug: string, input: CreateAppointmentInput) {
  const b = await getBusinessBySlug(slug);
  requireBookable(b);
  const service = await prisma.service.findFirst({
    where: { id: input.serviceId, businessId: b.id, active: true },
  });
  if (!service) throw new PublicBookingError("SERVICE_INVALID", "Servicio no válido", 400);

  const startDate = new Date(input.startAt);
  if (Number.isNaN(startDate.getTime()))
    throw new PublicBookingError("VALIDATION", "startAt inválido", 400);
  const dateStr = formatInTimeZone(startDate, b.timezone, "yyyy-MM-dd");

  // idempotencia: mismo key → devuelve existente sin duplicar
  if (input.idempotencyKey) {
    const existing = await prisma.appointment.findUnique({
      where: {
        businessId_idempotencyKey: { businessId: b.id, idempotencyKey: input.idempotencyKey },
      },
    });
    if (existing) return { appointment: existing, deduped: true as const };
  }

  let staffIds: string[];
  if (input.staffId === "any") {
    const eligible = await prisma.staffService.findMany({
      where: { serviceId: service.id, staff: { businessId: b.id, active: true } },
      include: { staff: true },
      orderBy: { staffId: "asc" },
    });
    staffIds = eligible.map((e) => e.staff.id);
    if (staffIds.length === 0)
      throw new PublicBookingError("STAFF_INVALID", "Sin profesionales disponibles", 400);
  } else {
    const link = await prisma.staffService.findUnique({
      where: { staffId_serviceId: { staffId: input.staffId, serviceId: service.id } },
      include: { staff: true },
    });
    if (!link || !link.staff.active || link.staff.businessId !== b.id) {
      throw new PublicBookingError("STAFF_INVALID", "Profesional no válido", 400);
    }
    staffIds = [input.staffId];
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      for (const staffId of staffIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${staffId}:${dateStr}`}))`;

        const ctx = await (async () => {
          const { start, end } = dayBounds(dateStr, b.timezone);
          const [wh, exc, appts, settings] = await Promise.all([
            tx.workingHours.findMany({ where: { businessId: b.id } }),
            tx.scheduleException.findMany({ where: { businessId: b.id, date: new Date(dateStr) } }),
            tx.appointment.findMany({
              where: { businessId: b.id, startAt: { lt: end }, blockedUntil: { gt: start } },
            }),
            tx.businessSettings.findUnique({ where: { businessId: b.id } }),
          ]);
          return {
            workingHours: wh.map((w) => ({
              dayOfWeek: w.dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
              startTime: w.startTime,
              endTime: w.endTime,
              staffId: w.staffId,
            })),
            exceptions: exc.map((e) => ({
              date: dateStr,
              startTime: e.startTime,
              endTime: e.endTime,
              type: e.type as "CLOSED" | "OPEN" | "BLOCKED",
              staffId: e.staffId,
            })),
            appointments: appts.map((a) => ({
              staffId: a.staffId,
              startAt: a.startAt,
              endAt: a.endAt,
              status: a.status,
            })),
            settings: {
              slotIntervalMinutes: settings?.slotIntervalMinutes ?? 15,
              bufferMinutes: settings?.bufferMinutes ?? 0,
              minimumAdvanceMinutes: settings?.minimumAdvanceMinutes ?? 60,
              maximumAdvanceDays: settings?.maximumAdvanceDays ?? 30,
            },
          };
        })();

        const slots = getAvailability({
          dateStr,
          timezone: b.timezone,
          durationMinutes: service.durationMinutes,
          slotIntervalMinutes: ctx.settings.slotIntervalMinutes,
          bufferMinutes: ctx.settings.bufferMinutes,
          minimumAdvanceMinutes: ctx.settings.minimumAdvanceMinutes,
          maximumAdvanceDays: ctx.settings.maximumAdvanceDays,
          now: new Date(),
          staffId,
          workingHours: ctx.workingHours,
          exceptions: ctx.exceptions,
          appointments: ctx.appointments,
        });
        const ok = slots.some((s) => s.start.getTime() === startDate.getTime());
        if (!ok) continue;

        const endAt = new Date(startDate.getTime() + service.durationMinutes * 60_000);
        const blockedUntil = new Date(endAt.getTime() + ctx.settings.bufferMinutes * 60_000);

        let customer = null;
        if (input.phone) {
          customer = await tx.customer.findFirst({
            where: { businessId: b.id, phone: input.phone },
          });
        }
        if (!customer && input.email) {
          customer = await tx.customer.findFirst({
            where: { businessId: b.id, email: input.email },
          });
        }
        if (!customer) {
          customer = await tx.customer.create({
            data: { businessId: b.id, name: input.name, phone: input.phone, email: input.email },
          });
        }

        const appt = await tx.appointment.create({
          data: {
            businessId: b.id,
            serviceId: service.id,
            staffId,
            customerId: customer.id,
            startAt: startDate,
            endAt,
            blockedUntil,
            status: "PENDING",
            notes: input.notes,
            idempotencyKey: input.idempotencyKey,
          },
        });
        return appt;
      }
      throw new PublicBookingError("SLOT_TAKEN", "Hueco no disponible", 409);
    });
    return { appointment: created, deduped: false as const };
  } catch (e) {
    if (e instanceof PublicBookingError) throw e;
    throw mapPrismaToBookingError(e);
  }
}

function mapPrismaToBookingError(e: unknown): PublicBookingError {
  const msg = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code ?? "";
  if (code === "P2002" || msg.includes("23P01") || msg.includes("no_overlap_per_staff")) {
    return new PublicBookingError("SLOT_TAKEN", "Hueco no disponible", 409);
  }
  return new PublicBookingError("INTERNAL", "Error creando reserva", 500);
}
