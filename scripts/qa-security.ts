import { randomUUID } from "crypto";
import { prisma } from "../src/lib/db";
import { requireBusinessAccess } from "../src/lib/auth";
import { createPublicAppointment, getPublicAvailability, PublicBookingError } from "../src/features/booking/service";
import { isValidTransition } from "../src/features/appointments/transitions";

const A = "qa-tenant-a";
const B = "qa-tenant-b";
let pass = 0;
function check(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  pass += 1;
  console.log(`ok: ${name}`);
}

async function cleanup() {
  for (const slug of [A, B]) {
    const b = await prisma.business.findUnique({ where: { slug } });
    if (!b) continue;
    await prisma.appointment.deleteMany({ where: { businessId: b.id } });
    await prisma.customer.deleteMany({ where: { businessId: b.id } });
    await prisma.scheduleException.deleteMany({ where: { businessId: b.id } });
    await prisma.workingHours.deleteMany({ where: { businessId: b.id } });
    await prisma.businessMember.deleteMany({ where: { businessId: b.id } });
    await prisma.staffService.deleteMany({ where: { staff: { businessId: b.id } } });
    await prisma.service.deleteMany({ where: { businessId: b.id } });
    await prisma.staff.deleteMany({ where: { businessId: b.id } });
    await prisma.businessSettings.deleteMany({ where: { businessId: b.id } });
    await prisma.user.deleteMany({ where: { memberships: { some: { businessId: b.id } } } }).catch(() => {});
    await prisma.business.delete({ where: { id: b.id } });
  }
}

async function mkTenant(slug: string) {
  const b = await prisma.business.create({ data: { name: slug, slug, timezone: "Europe/Madrid" } });
  await prisma.businessSettings.create({ data: { businessId: b.id } });
  const staff = await prisma.staff.create({ data: { businessId: b.id, name: "Staff" } });
  const service = await prisma.service.create({ data: { businessId: b.id, name: "Svc", durationMinutes: 30 } });
  await prisma.staffService.create({ data: { staffId: staff.id, serviceId: service.id } });
  await prisma.workingHours.create({ data: { businessId: b.id, dayOfWeek: 1, startTime: "09:00", endTime: "18:00" } });
  return { b, staff, service };
}

async function main() {
  await cleanup();
  const tA = await mkTenant(A);
  const tB = await mkTenant(B);

  // 1. servicio de B no usable vía slug A
  try {
    await getPublicAvailability(A, tB.service.id, "2026-10-12", "any");
    throw new Error("FAIL: cross-service debería fallar");
  } catch (e) {
    check("cross-tenant service → SERVICE_INVALID", e instanceof PublicBookingError && e.code === "SERVICE_INVALID");
  }

  // 2. staff de B no válido vía slug A
  try {
    await getPublicAvailability(A, tA.service.id, "2026-10-12", tB.staff.id);
    throw new Error("FAIL: cross-staff debería fallar");
  } catch (e) {
    check("cross-tenant staff → STAFF_INVALID", e instanceof PublicBookingError && e.code === "STAFF_INVALID");
  }

  // 3. Booking ignora businessId del cliente: el schema no lo acepta
  const avail = await getPublicAvailability(A, tA.service.id, "2026-10-12", tA.staff.id);
  check("availability propia funciona", avail.slots.length > 0);
  const appt = await createPublicAppointment(A, {
    serviceId: tA.service.id,
    staffId: tA.staff.id,
    startAt: avail.slots[0].start,
    name: "QA",
    phone: "+34600111222",
    idempotencyKey: randomUUID(),
  } as never);
  check("booking propio crea en tenant A", appt.appointment.businessId === tA.b.id);

  // 4. Miembro de A no puede tocar negocio B (403)
  const fakeUserId = randomUUID();
  await prisma.user.create({ data: { id: fakeUserId, email: `qa-${Date.now()}@test.local` } });
  await prisma.businessMember.create({ data: { businessId: tA.b.id, userId: fakeUserId, role: "OWNER" } });
  try {
    await requireBusinessAccess(fakeUserId, tB.b.id);
    throw new Error("FAIL: cross-member debería 403");
  } catch (e) {
    check("cross-tenant member → 403", (e as Error & { status?: number }).status === 403);
  }
  // 4b. STAFF no pasa chequeo OWNER
  try {
    const s = await prisma.staff.create({ data: { businessId: tB.b.id, name: "S2" } });
    void s;
    const u2 = randomUUID();
    await prisma.user.create({ data: { id: u2, email: `qa2-${Date.now()}@test.local` } });
    await prisma.businessMember.create({ data: { businessId: tB.b.id, userId: u2, role: "STAFF" } });
    await requireBusinessAccess(u2, tB.b.id, ["OWNER"]);
    throw new Error("FAIL: STAFF con rol OWNER debería 403");
  } catch (e) {
    check("rol insuficiente → 403", (e as Error).message === "FORBIDDEN_ROLE" || (e as Error & { status?: number }).status === 403);
  }

  // 5. Transiciones inválidas bloqueadas
  check("PENDING→COMPLETED inválida", isValidTransition("PENDING", "COMPLETED") === false);
  check("CONFIRMED→COMPLETED válida", isValidTransition("CONFIRMED", "COMPLETED") === true);

  // 6. Validación: sin phone ni email rechaza (Zod en ruta; aquí direct check del schema)
  const { createAppointmentBody } = await import("../src/features/booking/schema");
  const bad = createAppointmentBody.safeParse({ serviceId: "x", staffId: "any", startAt: new Date().toISOString(), name: "N" });
  check("sin contacto → validation error", bad.success === false);

  console.log(`QA OK (${pass} checks)`);
  await cleanup();
}

main()
  .catch((e) => {
    console.error("QA FAIL:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
