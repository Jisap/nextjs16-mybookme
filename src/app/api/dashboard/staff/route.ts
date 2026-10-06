import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const createBody = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  serviceIds: z.array(z.string()).default([]),
});

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
  try {
    await requireBusinessAccess(user.id, businessId);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const staff = await prisma.staff.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: { services: true },
  });
  const services = await prisma.service.findMany({ where: { businessId, active: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ staff, services });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = createBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 400 });
  try {
    await requireBusinessAccess(user.id, parsed.data.businessId, ["OWNER"]);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  // valida que los servicios son del mismo negocio
  if (parsed.data.serviceIds.length > 0) {
    const count = await prisma.service.count({ where: { businessId: parsed.data.businessId, id: { in: parsed.data.serviceIds } } });
    if (count !== parsed.data.serviceIds.length) return NextResponse.json({ error: "SERVICE_INVALID" }, { status: 400 });
  }
  const st = await prisma.staff.create({
    data: {
      businessId: parsed.data.businessId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      services: { create: parsed.data.serviceIds.map((serviceId) => ({ serviceId })) },
    },
    include: { services: true },
  });
  return NextResponse.json({ staff: st }, { status: 201 });
}
