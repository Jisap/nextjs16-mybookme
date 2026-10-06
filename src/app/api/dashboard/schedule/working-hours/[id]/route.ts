import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;
  const wh = await prisma.workingHours.findUnique({ where: { id } });
  if (!wh) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  try {
    await requireBusinessAccess(user.id, wh.businessId, ["OWNER"]);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  await prisma.workingHours.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
