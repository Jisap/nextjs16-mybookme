import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm");
const createBody = z.object({
  businessId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: hhmm,
  endTime: hhmm,
  staffId: z.string().nullable().optional(),
}).refine((v) => v.startTime < v.endTime, { message: "endTime > startTime", path: ["endTime"] });

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const businessId = new URL(req.url).searchParams.get("businessId") ?? "";
  try {
    await requireBusinessAccess(user.id, businessId);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const [workingHours, exceptions, staff] = await Promise.all([
    prisma.workingHours.findMany({ where: { businessId }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
    prisma.scheduleException.findMany({ where: { businessId }, orderBy: { date: "desc" }, take: 60 }),
    prisma.staff.findMany({ where: { businessId, active: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ workingHours, exceptions, staff });
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
  if (parsed.data.staffId) {
    const st = await prisma.staff.findFirst({ where: { id: parsed.data.staffId, businessId: parsed.data.businessId } });
    if (!st) return NextResponse.json({ error: "STAFF_INVALID" }, { status: 400 });
  }
  const wh = await prisma.workingHours.create({ data: { ...parsed.data, staffId: parsed.data.staffId ?? null } });
  return NextResponse.json({ workingHours: wh }, { status: 201 });
}
