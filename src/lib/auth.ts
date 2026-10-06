import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export async function getSessionUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

/** Aislamiento tenant (ADR-001): el businessId sale de la membresía, nunca del cliente. */
export async function requireBusinessAccess(userId: string, businessId: string, roles?: string[]) {
  const m = await prisma.businessMember.findUnique({
    where: { businessId_userId: { businessId, userId } },
    include: { business: true },
  });
  if (!m) {
    const e = new Error("FORBIDDEN") as Error & { status?: number };
    e.status = 403;
    throw e;
  }
  if (roles && !roles.includes(m.role)) {
    const e = new Error("FORBIDDEN_ROLE") as Error & { status?: number };
    e.status = 403;
    throw e;
  }
  return m;
}
