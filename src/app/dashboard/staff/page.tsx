import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "./manager";
import { DashboardNav } from "../nav";
import { BusinessBar } from "../business-bar";

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
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Profesionales — {business.name}</h1>
      <BusinessBar role={membership.role} userEmail={data.user.email!} slug={business.slug} />
      <DashboardNav businessId={business.id} slug={business.slug} current="staff" />
      <StaffManager businessId={business.id} />
    </main>
  );
}
