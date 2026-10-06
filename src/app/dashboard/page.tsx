import { redirect } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusButtons } from "./status-buttons";
import { DashboardNav } from "./nav";
import { BusinessBar } from "./business-bar";

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
      <main className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-xl font-bold">Crea tu negocio</h1>
        <p className="mt-2 text-sm">Tu usuario ({data.user.email}) aún no tiene ningún negocio.</p>
        <Link href="/onboarding" className="text-sm underline">
          Crear mi negocio →
        </Link>
      </main>
    );
  }

  const sp = await searchParams;
  const membership = memberships.find((m) => m.businessId === sp.businessId) ?? memberships[0];
  const business = membership.business;
  const q = `?businessId=${business.id}`;
  const todayStr = formatInTimeZone(new Date(), business.timezone, "yyyy-MM-dd");

  const [appts, serviceCount, staffCount, hoursCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { businessId: business.id, startAt: { gte: new Date(`${todayStr}T00:00:00Z`) } },
      orderBy: { startAt: "asc" },
      take: 50,
      include: { service: true, staff: true, customer: true },
    }),
    prisma.service.count({ where: { businessId: business.id, active: true } }),
    prisma.staff.count({ where: { businessId: business.id, active: true } }),
    prisma.workingHours.count({ where: { businessId: business.id } }),
  ]);
  const setupDone = serviceCount > 0 && staffCount > 0 && hoursCount > 0;

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{business.name} — hoy</h1>
      </header>
      <BusinessBar role={membership.role} userEmail={data.user.email} slug={business.slug} />
      <DashboardNav businessId={business.id} slug={business.slug} current="citas" />
      {memberships.length > 1 && (
        <nav className="flex flex-wrap gap-2 text-sm" aria-label="Mis negocios">
          {memberships.map((m) => (
            <Link
              key={m.businessId}
              href={`/dashboard?businessId=${m.businessId}`}
              aria-current={m.businessId === business.id ? "page" : undefined}
              className={`rounded border px-2 py-1 ${m.businessId === business.id ? "border-black bg-gray-50 font-medium" : ""}`}
            >
              {m.business.name}
            </Link>
          ))}
        </nav>
      )}
      {!setupDone && (
        <Card>
          <CardHeader>
            <CardTitle>Configura tu negocio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-neutral-600">
              Tu página pública es <code>/book/{business.slug}</code>, pero aún no puede recibir
              reservas. Completa estos pasos:
            </p>
            <ul className="space-y-1">
              <li>
                {serviceCount > 0 ? "✓" : "○"} Crea al menos un servicio (
                <Link href={`/dashboard/services${q}`} className="underline">
                  ir a Servicios
                </Link>
                )
              </li>
              <li>
                {staffCount > 0 ? "✓" : "○"} Añade al menos un profesional (
                <Link href={`/dashboard/staff${q}`} className="underline">
                  ir a Profesionales
                </Link>
                )
              </li>
              <li>
                {hoursCount > 0 ? "✓" : "○"} Revisa tu horario (
                <Link href={`/dashboard/schedule${q}`} className="underline">
                  ir a Horarios
                </Link>
                )
              </li>
              <li>
                ○ Asocia profesionales a servicios (en Servicios, cada servicio elige quién lo hace)
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
      {appts.length === 0 && <p className="text-sm text-gray-600">Sin citas próximas.</p>}
      <ul className="space-y-3">
        {appts.map((a) => (
          <li key={a.id} className="rounded border p-3">
            <div className="font-medium">
              {a.service.name} · {a.staff.name}
            </div>
            <div className="text-sm text-gray-600">
              {new Intl.DateTimeFormat("es-ES", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: business.timezone,
              }).format(a.startAt)}{" "}
              · {a.customer.name} {a.customer.phone ? `· ${a.customer.phone}` : ""} · {a.status}
            </div>
            <StatusButtons id={a.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
