import { prisma } from "../src/lib/db";
import { createPublicAppointment, getPublicAvailability } from "../src/features/booking/service";

const SLUG = "maria-nails-proof";

async function cleanup() {
  const b = await prisma.business.findUnique({ where: { slug: SLUG } });
  if (!b) return;
  await prisma.appointment.deleteMany({ where: { businessId: b.id } });
  await prisma.customer.deleteMany({ where: { businessId: b.id } });
  await prisma.scheduleException.deleteMany({ where: { businessId: b.id } });
  await prisma.workingHours.deleteMany({ where: { businessId: b.id } });
  await prisma.staffService.deleteMany({ where: { staff: { businessId: b.id } } });
  await prisma.service.deleteMany({ where: { businessId: b.id } });
  await prisma.staff.deleteMany({ where: { businessId: b.id } });
  await prisma.businessSettings.deleteMany({ where: { businessId: b.id } });
  await prisma.business.delete({ where: { id: b.id } });
}

async function main() {
  await cleanup();
  const b = await prisma.business.create({
    data: { name: "Maria Nails Proof", slug: SLUG, timezone: "Europe/Madrid" },
  });
  await prisma.businessSettings.create({ data: { businessId: b.id } });
  const staff = await prisma.staff.create({ data: { businessId: b.id, name: "Maria" } });
  const service = await prisma.service.create({
    data: { businessId: b.id, name: "Manicura", durationMinutes: 45, priceCents: 2500 },
  });
  await prisma.staffService.create({ data: { staffId: staff.id, serviceId: service.id } });
  // próximo lunes
  const now = new Date();
  const nextMonday = new Date(now);
  const dow = now.getDay();
  const add = ((8 - dow) % 7) || 7;
  nextMonday.setDate(now.getDate() + add);
  const dateStr = nextMonday.toISOString().slice(0, 10);
  const dateDow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  await prisma.workingHours.createMany({
    data: [
      { businessId: b.id, dayOfWeek: dateDow, startTime: "09:00", endTime: "14:00" },
      { businessId: b.id, dayOfWeek: dateDow, startTime: "16:00", endTime: "20:00" },
    ],
  });

  const avail = await getPublicAvailability(SLUG, service.id, dateStr, staff.id);
  console.log(`slots:${avail.slots.length} date:${dateStr} first:${avail.slots[0]?.start ?? "none"}`);
  if (avail.slots.length === 0) throw new Error("sin slots, no se puede probar");

  const target = avail.slots[0].start;
  const payload = (i: number) => ({
    serviceId: service.id,
    staffId: staff.id,
    startAt: target,
    name: `Cliente ${i}`,
    phone: `+3460000000${i}`,
    idempotencyKey: crypto.randomUUID(),
  });

  const [a, c] = await Promise.allSettled([createPublicAppointment(SLUG, payload(1)), createPublicAppointment(SLUG, payload(2))]);
  const ok = [a, c].filter((r) => r.status === "fulfilled").length;
  const taken = [a, c].filter(
    (r) => r.status === "rejected" && String((r as PromiseRejectedResult).reason?.message ?? (r as PromiseRejectedResult).reason).includes("Hueco"),
  ).length;
  console.log(`concurrent: ok=${ok} slotTaken=${taken}`);
  for (const r of [a, c]) {
    if (r.status === "rejected") console.log("reject:", String(r.reason?.message ?? r.reason));
    else console.log("fulfilled:", r.value.appointment.id, "deduped:", r.value.deduped);
  }

  // idempotencia: mismo key dos veces → 1 sola cita (usa slot lejano, no solapa con el 1º)
  const key = crypto.randomUUID();
  const secondSlot = avail.slots[10].start;
  const idemPayload = { serviceId: service.id, staffId: staff.id, startAt: secondSlot, name: "Cliente idem", phone: "+34600999999", idempotencyKey: key };
  const first = await createPublicAppointment(SLUG, idemPayload);
  const second = await createPublicAppointment(SLUG, idemPayload);
  const count = await prisma.appointment.count({ where: { businessId: b.id, idempotencyKey: key } });
  console.log(`idempotency: first=${first.appointment.id} dedupedSecond=${second.deduped} count=${count}`);

  if (ok !== 1 || taken !== 1) throw new Error("FAIL doble reserva: se esperaba 1 ok + 1 SLOT_TAKEN");
  if (count !== 1 || second.deduped !== true) throw new Error("FAIL idempotencia");
  console.log("PROOF OK");
  await cleanup();
}

main()
  .catch((e) => {
    console.error("PROOF FAIL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
