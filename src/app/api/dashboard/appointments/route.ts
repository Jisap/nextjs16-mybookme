import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess, getSessionUser } from "@/lib/auth";

const createManualAppointmentSchema = z.object({
  businessId: z.string().min(1),
  serviceId: z.string().min(1),
  staffId: z.string().min(1),
  startAt: z.string().datetime(), // ISO string
  customerName: z.string().min(2),
  customerPhone: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const json = await req.json();
  const parsed = createManualAppointmentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    businessId,
    serviceId,
    staffId,
    startAt,
    customerName,
    customerPhone,
    customerEmail,
    notes,
    status,
  } = parsed.data;

  try {
    await requireBusinessAccess(user.id, businessId);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Verificar que el servicio y profesional pertenezcan al negocio
  const [business, service, staff] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      include: { settings: true },
    }),
    prisma.service.findFirst({
      where: { id: serviceId, businessId, active: true },
    }),
    prisma.staff.findFirst({
      where: { id: staffId, businessId, active: true },
    }),
  ]);

  if (!business || !service || !staff) {
    return NextResponse.json(
      { error: "INVALID_SELECTION", message: "Servicio o profesional no encontrado" },
      { status: 400 }
    );
  }

  const startDate = new Date(startAt);
  const endAt = new Date(startDate.getTime() + service.durationMinutes * 60_000);
  const bufferMinutes = business.settings?.bufferMinutes ?? 0;
  const blockedUntil = new Date(endAt.getTime() + bufferMinutes * 60_000);

  // Crear o recuperar cliente
  const emailVal = customerEmail && customerEmail.trim() !== "" ? customerEmail.trim() : null;
  const phoneVal = customerPhone && customerPhone.trim() !== "" ? customerPhone.trim() : null;

  let customer = null;
  if (phoneVal) {
    customer = await prisma.customer.findFirst({
      where: { businessId, phone: phoneVal },
    });
  }
  if (!customer && emailVal) {
    customer = await prisma.customer.findFirst({
      where: { businessId, email: emailVal },
    });
  }
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        businessId,
        name: customerName.trim(),
        phone: phoneVal,
        email: emailVal,
      },
    });
  }

  // Insertar la cita
  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      serviceId,
      staffId,
      customerId: customer.id,
      startAt: startDate,
      endAt,
      blockedUntil,
      status,
      notes: notes?.trim() || null,
    },
    include: {
      service: true,
      staff: true,
      customer: true,
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
