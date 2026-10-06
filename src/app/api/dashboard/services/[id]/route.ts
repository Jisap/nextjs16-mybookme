import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const patchBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  priceCents: z.number().int().min(0).max(10000000).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = patchBody.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    await requireBusinessAccess(user.id, svc.businessId, ["OWNER"]);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const updated = await prisma.service.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ service: updated });
}
