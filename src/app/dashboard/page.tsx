import { redirect } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trialStatus } from "@/features/billing/trial";
import { StatusButtons } from "./status-buttons";
import { DashboardNav } from "./nav";
import { BusinessBar } from "./business-bar";

const ESTADOS = ["TODAS", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
type EstadoFiltro = (typeof ESTADOS)[number];

const ESTADO_LABEL: Record<Exclude<EstadoFiltro, "TODAS">, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No vino",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; estado?: string; pagina?: string }>;
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
    orderBy: { business: { name: "asc" } },
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
  const estado: EstadoFiltro = (ESTADOS as readonly string[]).includes(sp.estado ?? "")
    ? (sp.estado as EstadoFiltro)
    : "TODAS";
  const estadoQ = (e: EstadoFiltro) =>
    `/dashboard?businessId=${business.id}${e === "TODAS" ? "" : `&estado=${e}`}`;
  const PAGE_SIZE = 20;
  const pagina = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);
  const pageQ = (p: number) =>
    `/dashboard?businessId=${business.id}${estado === "TODAS" ? "" : `&estado=${estado}`}${p <= 1 ? "" : `&pagina=${p}`}`;
  const todayStr = formatInTimeZone(new Date(), business.timezone, "yyyy-MM-dd");

  const statusWhere =
    estado === "TODAS" ? undefined : { status: estado as keyof typeof ESTADO_LABEL };
  const listWhere = {
    businessId: business.id,
    startAt: { gte: new Date(`${todayStr}T00:00:00Z`) },
    ...statusWhere,
  };
  const [total, serviceCount, staffCount, hoursCount, counts] = await Promise.all([
    prisma.appointment.count({ where: listWhere }),
    prisma.service.count({ where: { businessId: business.id, active: true } }),
    prisma.staff.count({ where: { businessId: business.id, active: true } }),
    prisma.workingHours.count({ where: { businessId: business.id } }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { businessId: business.id, startAt: { gte: new Date(`${todayStr}T00:00:00Z`) } },
      _count: true,
    }),
  ]);
  const setupDone = serviceCount > 0 && staffCount > 0 && hoursCount > 0;
  const trial = trialStatus(business);
  const billingQ = `/dashboard/billing?businessId=${business.id}`;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(pagina, totalPages);
  const appts = await prisma.appointment.findMany({
    where: listWhere,
    orderBy: { startAt: "asc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { service: true, staff: true, customer: true },
  });

  const dayKey = (d: Date) => formatInTimeZone(d, business.timezone, "yyyy-MM-dd");
  const groups = new Map<string, typeof appts>();
  for (const a of appts) {
    const k = dayKey(a.startAt);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }
  const tomorrowStr = formatInTimeZone(
    new Date(new Date().getTime() + 86400000),
    business.timezone,
    "yyyy-MM-dd"
  );
  const dayLabel = (k: string) => {
    if (k === todayStr) return "Hoy";
    if (k === tomorrowStr) return "Mañana";
    return new Intl.DateTimeFormat("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: business.timezone,
    }).format(new Date(`${k}T12:00:00Z`));
  };
  const hourFmt = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: business.timezone,
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{business.name} — próximas citas</h1>
      </header>
      <BusinessBar role={membership.role} userEmail={data.user.email} slug={business.slug} />
      <DashboardNav businessId={business.id} slug={business.slug} current="citas" />
      {trial.state === "EXPIRED" && (
        <Card>
          <CardHeader>
            <CardTitle>Tu prueba terminó</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Tus datos están a salvo, pero tu página ya no acepta reservas. Suscríbete para volver
              a recibirlas.
            </p>
            <Link href={billingQ} className="underline">
              Ir a Facturación →
            </Link>
          </CardContent>
        </Card>
      )}
      {trial.state === "TRIAL" && (
        <p className="text-sm text-neutral-600">
          Prueba gratuita: te quedan {trial.daysLeft} días.{" "}
          <Link href={billingQ} className="underline">
            Ver Facturación
          </Link>
        </p>
      )}
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
      {appts.length === 0 && (
        <p className="text-sm text-gray-600">
          {estado === "TODAS" ? (
            "Sin citas próximas."
          ) : (
            <>
              {`Sin citas ${ESTADO_LABEL[estado].toLowerCase()}s.`}{" "}
              <Link href={estadoQ("TODAS")} className="underline">
                Ver todas →
              </Link>
            </>
          )}
        </p>
      )}
      {appts.length > 0 && (
        <section aria-label="Próximas citas" className="space-y-4">
          <nav className="flex flex-wrap gap-1 text-xs" aria-label="Filtrar por estado">
            {ESTADOS.map((e) => (
              <Link
                key={e}
                href={estadoQ(e)}
                aria-current={e === estado ? "page" : undefined}
                className={`rounded-full border px-2 py-1 ${e === estado ? "border-black bg-neutral-900 font-medium text-white" : ""}`}
              >
                {e === "TODAS" ? "Todas" : ESTADO_LABEL[e]}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-neutral-600" aria-live="polite">
            {counts
              .map(
                (c) =>
                  `${c._count} ${ESTADO_LABEL[c.status as keyof typeof ESTADO_LABEL].toLowerCase()}s`
              )
              .join(" · ") || "Sin citas próximas."}
            {total > 0 && ` · mostrando ${appts.length} de ${total}`}
          </p>
          {[...groups].map(([day, list]) => (
            <section key={day} aria-label={dayLabel(day)} className="space-y-2">
              <h2 className="text-sm font-semibold capitalize text-neutral-700">
                {dayLabel(day)} · {list.length}
              </h2>
              <ul className="space-y-2">
                {list.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded border p-3">
                    <div className="min-w-12 text-center">
                      <div className="text-lg font-bold">{hourFmt.format(a.startAt)}</div>
                      <div className="text-[11px] text-neutral-500">
                        {a.service.durationMinutes} min
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {a.service.name} · {a.staff.name}
                      </div>
                      <div className="truncate text-sm text-gray-600">
                        {a.customer.name} {a.customer.phone ? `· ${a.customer.phone}` : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                          {ESTADO_LABEL[a.status as keyof typeof ESTADO_LABEL]}
                        </span>
                        <StatusButtons id={a.id} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between text-sm"
              aria-label="Páginas de citas"
            >
              {safePage > 1 ? (
                <Link href={pageQ(safePage - 1)} className="underline">
                  ← Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="text-neutral-600" aria-live="polite">
                Página {safePage} de {totalPages}
              </span>
              {safePage < totalPages ? (
                <Link href={pageQ(safePage + 1)} className="underline">
                  Siguiente →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
