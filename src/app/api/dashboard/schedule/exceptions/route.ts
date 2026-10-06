import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "HH:mm");
const createBody = z.object({
  businessId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["CLOSED", "OPEN", "BLOCKED"]),
  startTime: hhmm.nullable().optional(),
  endTime: hhmm.nullable().optional(),
  staffId: z.string().nullable().optional(),
  reason: z.string().trim().max(300).optional(),
}).refine(
  (v) => (v.type === "CLOSED" && !v.startTime && !v.endTime) || ((v.type === "BLOCKED" || v.type === "OPEN") && !!v.startTime && !!v.endTime && v.startTime < v.endTime),
  { message: "CLOSED día entero sin horas; BLOCKED/OPEN con start<end", path: ["startTime"] },
);

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
  const { date, ...rest } = parsed.data;
  const exc = await prisma.scheduleException.create({
    data: { ...rest, businessId: parsed.data.businessId, staffId: parsed.data.staffId ?? null, date: new Date(date) },
  });
  return NextResponse.json({ exception: exc }, { status: 201 });
}
