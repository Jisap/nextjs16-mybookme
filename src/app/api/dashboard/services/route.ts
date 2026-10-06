import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const createBody = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0).max(10000000).default(0),
  currency: z.string().default("EUR"),
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
  const services = await prisma.service.findMany({ where: { businessId }, orderBy: { name: "asc" } });
  return NextResponse.json({ services });
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
  const s = await prisma.service.create({ data: { ...parsed.data } });
  return NextResponse.json({ service: s }, { status: 201 });
}
