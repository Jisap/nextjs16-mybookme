import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSessionUser, requireBusinessAccess } from "@/lib/auth";

const body = z.object({
  businessId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = body.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "VALIDATION", issues: parsed.error.issues }, { status: 400 });
  try {
    await requireBusinessAccess(user.id, parsed.data.businessId, ["OWNER"]);
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { businessId, ...data } = parsed.data;
  const business = await prisma.business.update({
    where: { id: businessId },
    data: {
      name: data.name,
      description: data.description || null,
      phone: data.phone || null,
      address: data.address || null,
    },
  });
  return NextResponse.json({ business });
}
