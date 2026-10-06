import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireBusinessAccess, getSessionUser } from "@/lib/auth";
import { isValidTransition } from "@/features/appointments/transitions";

const body = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    await requireBusinessAccess(user.id, appt.businessId);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!isValidTransition(appt.status, parsed.data.status)) {
    return NextResponse.json({ error: "INVALID_TRANSITION" }, { status: 400 });
  }
  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json({ appointment: { id: updated.id, status: updated.status } });
}
