import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { StatusButtons } from "./status-buttons";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) redirect("/login");

  // upsert User espejo (id = auth.users.id)
  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { email: data.user.email },
    create: { id: data.user.id, email: data.user.email, name: null },
  });

  const memberships = await prisma.businessMember.findMany({
    where: { userId: data.user.id },
    include: { business: true },
  });
  if (memberships.length === 0) {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold">Sin negocios</h1>
        <p className="mt-2 text-sm">Tu usuario ({data.user.email}) aún no tiene acceso a ningún negocio.</p>
        <p className="mt-2 text-sm text-gray-600">Pide al owner que te añada, o vincula el seed demo con: npm run link:owner -- email={data.user.email}</p>
      </main>
    );
  }

  const sp = await searchParams;
  const business = memberships.find((m) => m.businessId === sp.businessId)?.business ?? memberships[0].business;
  const todayStr = formatInTimeZone(new Date(), business.timezone, "yyyy-MM-dd");

  const appts = await prisma.appointment.findMany({
    where: { businessId: business.id, startAt: { gte: new Date(`${todayStr}T00:00:00Z`) } },
    orderBy: { startAt: "asc" },
    take: 50,
    include: { service: true, staff: true, customer: true },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{business.name} — hoy</h1>
        <a href="/book/maria-nails" className="text-sm underline">
          Ver página pública
        </a>
      </header>
      {memberships.length > 1 && (
        <nav className="flex gap-2 text-sm">
          {memberships.map((m) => (
            <a key={m.businessId} href={`/dashboard?businessId=${m.businessId}`} className="rounded border px-2 py-1">
              {m.business.name}
            </a>
          ))}
        </nav>
      )}
      {appts.length === 0 && <p className="text-sm text-gray-600">Sin citas próximas.</p>}
      <ul className="space-y-3">
        {appts.map((a) => (
          <li key={a.id} className="rounded border p-3">
            <div className="font-medium">
              {a.service.name} · {a.staff.name}
            </div>
            <div className="text-sm text-gray-600">
              {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: business.timezone }).format(a.startAt)}{" "}
              · {a.customer.name} {a.customer.phone ? `· ${a.customer.phone}` : ""} · {a.status}
            </div>
            <StatusButtons id={a.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
