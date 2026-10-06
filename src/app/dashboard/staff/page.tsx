import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "./manager";

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
  const business =
    memberships.find((m) => m.businessId === sp.businessId)?.business ?? memberships[0].business;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Profesionales — {business.name}</h1>
      <nav className="flex gap-2 text-sm">
        <Link href="/dashboard" className="underline">
          Citas
        </Link>
        <Link href={`/dashboard/services?businessId=${business.id}`} className="underline">
          Servicios
        </Link>
      </nav>
      <StaffManager businessId={business.id} />
    </main>
  );
}
