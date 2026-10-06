import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "./manager";
import { DashboardNav } from "../nav";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const memberships = await prisma.businessMember.findMany({
    where: { userId: data.user.id },
    include: { business: true },
  });
  if (memberships.length === 0) redirect("/dashboard");
  const sp = await searchParams;
  const membership = memberships.find((m) => m.businessId === sp.businessId) ?? memberships[0];
  const business = membership.business;

  return (
    <main style={{ maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h1 className="text-2xl font-extrabold text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Profesionales — {business.name}
        </h1>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-neutral-900 text-white">
            {membership.role === "OWNER" ? "Propietario" : "Personal"}
          </span>
          <span className="hidden sm:inline">{data.user.email}</span>
        </div>
      </div>

      <DashboardNav businessId={business.id} slug={business.slug} current="staff" />

      <div className="mt-4">
        <StaffManager businessId={business.id} />
      </div>
    </main>
  );
}
