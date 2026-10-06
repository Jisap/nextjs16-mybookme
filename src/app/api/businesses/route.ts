import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const body = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,50}$/, "slug inválido (3-50, minúsculas, números y guiones)")
    .optional(),
  phone: z.string().trim().max(30).optional(),
});

function slugify(name: string) {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return s.length >= 3 ? s : "negocio";
}

const DEFAULT_INTERVALS = [
  { startTime: "09:00", endTime: "14:00" },
  { startTime: "16:00", endTime: "20:00" },
];
const DEFAULT_DAYS = [1, 2, 3, 4, 5];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.email) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = body.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 400 });

  const base = parsed.data.slug ?? slugify(parsed.data.name);
  let slug = base;
  for (let i = 2; i <= 10; i++) {
    const taken = await prisma.business.findUnique({ where: { slug } });
    if (!taken) break;
    if (parsed.data.slug) return NextResponse.json({ error: "SLUG_TAKEN" }, { status: 409 });
    slug = `${base}-${i}`;
  }
  if (await prisma.business.findUnique({ where: { slug } }))
    return NextResponse.json({ error: "SLUG_TAKEN" }, { status: 409 });

  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email },
    create: { id: user.id, email: user.email },
  });

  const business = await prisma.$transaction(async (tx) => {
    const b = await tx.business.create({
      data: {
        name: parsed.data.name,
        slug,
        phone: parsed.data.phone || null,
        timezone: "Europe/Madrid",
        trialEndsAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    await tx.businessSettings.create({ data: { businessId: b.id } });
    await tx.businessMember.create({
      data: { businessId: b.id, userId: user.id, role: "OWNER" },
    });
    await tx.workingHours.createMany({
      data: DEFAULT_DAYS.flatMap((dayOfWeek) =>
        DEFAULT_INTERVALS.map((iv) => ({ businessId: b.id, dayOfWeek, ...iv }))
      ),
    });
    return b;
  });

  return NextResponse.json(
    { business: { id: business.id, slug: business.slug, name: business.name } },
    { status: 201 }
  );
}
