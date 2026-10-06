import { prisma } from "../src/lib/db";
import data from "./seed-data.json";

async function main() {
  const slug = data.business.slug;
  const existing = await prisma.business.findUnique({ where: { slug } });
  if (existing) {
    console.log(`seed: ${slug} ya existe (${existing.id}), skip`);
    return;
  }
  const b = await prisma.business.create({
    data: {
      name: data.business.name,
      slug,
      timezone: data.business.timezone,
      phone: data.business.phone,
      trialEndsAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  await prisma.businessSettings.create({
    data: { businessId: b.id, ...data.settings },
  });
  const staffIds: Record<string, string> = {};
  for (const s of data.staff) {
    const st = await prisma.staff.create({ data: { businessId: b.id, name: s.name } });
    staffIds[s.name] = st.id;
  }
  const serviceIds: Record<string, string> = {};
  for (const s of data.services) {
    const sv = await prisma.service.create({
      data: {
        businessId: b.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
      },
    });
    serviceIds[s.name] = sv.id;
  }
  for (const [staffName, svcNames] of Object.entries(data.staffServices)) {
    for (const svcName of svcNames as string[]) {
      await prisma.staffService.create({
        data: { staffId: staffIds[staffName], serviceId: serviceIds[svcName] },
      });
    }
  }
  await prisma.workingHours.createMany({
    data: data.workingHours.days.flatMap((dow) =>
      data.workingHours.intervals.map((iv) => ({
        businessId: b.id,
        dayOfWeek: dow,
        startTime: iv.startTime,
        endTime: iv.endTime,
      }))
    ),
  });
  console.log(`seed ok: ${b.name} /book/${slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
