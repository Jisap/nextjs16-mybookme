import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const patchBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(160).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = patchBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  const st = await prisma.staff.findUnique({ where: { id }, include: { services: true } });
  if (!st) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    await requireBusinessAccess(user.id, st.businessId, ["OWNER"]);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { serviceIds, ...rest } = parsed.data;
  if (serviceIds) {
    const count = await prisma.service.count({
      where: { businessId: st.businessId, id: { in: serviceIds } },
    });
    if (count !== serviceIds.length)
      return NextResponse.json({ error: "SERVICE_INVALID" }, { status: 400 });
    await prisma.$transaction([
      prisma.staffService.deleteMany({ where: { staffId: id } }),
      ...serviceIds.map((serviceId) =>
        prisma.staffService.create({ data: { staffId: id, serviceId } })
      ),
    ]);
  }
  const updated = await prisma.staff.update({
    where: { id },
    data: rest,
    include: { services: true },
  });
  return NextResponse.json({ staff: updated });
}
