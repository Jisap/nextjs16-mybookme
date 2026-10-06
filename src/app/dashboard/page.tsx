import { redirect } from "next/navigation";
import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { trialStatus } from "@/features/billing/trial";
import { StatusButtons } from "./status-buttons";
import { DashboardNav } from "./nav";
import { DashboardKpiCards } from "./kpi-cards";
import { QuickShareBar } from "./quick-share-bar";
import { AppointmentsFilterBar } from "./appointments-filter-bar";
import { CreateAppointmentModal } from "./create-appointment-modal";

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
  searchParams: Promise<{ businessId?: string; estado?: string; pagina?: string; q?: string; staffId?: string }>;
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
  const qStr = (sp.q ?? "").trim();
  const staffFilter = (sp.staffId ?? "").trim();

  const estado: EstadoFiltro = (ESTADOS as readonly string[]).includes(sp.estado ?? "")
    ? (sp.estado as EstadoFiltro)
    : "TODAS";

  const PAGE_SIZE = 20;
  const pagina = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);
  const todayStr = formatInTimeZone(new Date(), business.timezone, "yyyy-MM-dd");

  const buildQueryUrl = (newParams: Record<string, string | number | undefined>) => {
    const current: Record<string, string> = { businessId: business.id };
    if (estado !== "TODAS") current.estado = estado;
    if (qStr) current.q = qStr;
    if (staffFilter) current.staffId = staffFilter;
    if (pagina > 1) current.pagina = String(pagina);

    for (const [k, v] of Object.entries(newParams)) {
      if (v === undefined || v === "" || v === "TODAS") {
        delete current[k];
      } else {
        current[k] = String(v);
      }
    }
    const search = new URLSearchParams(current).toString();
    return `/dashboard${search ? `?${search}` : ""}`;
  };

  const estadoQ = (e: EstadoFiltro) => buildQueryUrl({ estado: e, pagina: 1 });
  const pageQ = (p: number) => buildQueryUrl({ pagina: p });

  const statusWhere =
    estado === "TODAS" ? undefined : { status: estado as keyof typeof ESTADO_LABEL };
  const staffWhere = staffFilter ? { staffId: staffFilter } : undefined;
  const searchWhere = qStr
    ? {
        OR: [
          { customer: { name: { contains: qStr, mode: "insensitive" as const } } },
          { customer: { phone: { contains: qStr, mode: "insensitive" as const } } },
          { customer: { email: { contains: qStr, mode: "insensitive" as const } } },
        ],
      }
    : undefined;

  const listWhere = {
    businessId: business.id,
    startAt: { gte: new Date(`${todayStr}T00:00:00Z`) },
    ...statusWhere,
    ...staffWhere,
    ...searchWhere,
  };
  const todayStart = new Date(`${todayStr}T00:00:00Z`);
  const todayEnd = new Date(new Date(`${todayStr}T00:00:00Z`).getTime() + 86400000);

  const [total, activeServices, activeStaff, hoursCount, counts, todayAppts] = await Promise.all([
    prisma.appointment.count({ where: listWhere }),
    prisma.service.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, priceCents: true, currency: true },
    }),
    prisma.staff.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.workingHours.count({ where: { businessId: business.id } }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { businessId: business.id, startAt: { gte: todayStart } },
      _count: true,
    }),
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        startAt: { gte: todayStart, lt: todayEnd },
      },
      include: { service: true },
    }),
  ]);

  const serviceCount = activeServices.length;
  const staffCount = activeStaff.length;

  // KPI Calculations
  const todayTotal = todayAppts.length;
  const todayCompleted = todayAppts.filter((a) => a.status === "COMPLETED").length;
  const todayPending = todayAppts.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED").length;
  const todayRevenueCents = todayAppts
    .filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW")
    .reduce((acc, a) => acc + (a.service?.priceCents || 0), 0);
  const primaryCurrency = todayAppts[0]?.service?.currency || "EUR";

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

  /* ── helpers ── */
  const statusColor: Record<string, { bg: string; text: string }> = {
    PENDING:   { bg: "hsl(45 95% 93%)",  text: "hsl(35 80% 35%)"  },
    CONFIRMED: { bg: "hsl(142 70% 90%)", text: "hsl(142 60% 25%)" },
    COMPLETED: { bg: "hsl(220 20% 92%)", text: "hsl(220 15% 35%)" },
    CANCELLED: { bg: "hsl(0 80% 93%)",   text: "hsl(0 65% 35%)"   },
    NO_SHOW:   { bg: "hsl(280 60% 92%)", text: "hsl(280 50% 35%)" },
  };

  return (
    <main style={{ maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "hsl(220 15% 12%)" }}>
          {business.name}
          <span style={{ color: "hsl(220 10% 55%)", fontWeight: 400, fontSize: "1rem", marginLeft: "0.5rem" }}>— citas</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Modal para agendar cita manual */}
          <CreateAppointmentModal
            businessId={business.id}
            services={activeServices}
            staffList={activeStaff}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "hsl(220 10% 50%)" }}>
            <span
              style={{
                borderRadius: "9999px",
                padding: "0.2rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: membership.role === "OWNER" ? "hsl(220 15% 15%)" : "hsl(220 15% 92%)",
                color: membership.role === "OWNER" ? "#fff" : "hsl(220 15% 25%)",
              }}
            >
              {membership.role === "OWNER" ? "Propietario" : "Personal"}
            </span>
            <span className="hidden sm:inline">{data.user.email}</span>
          </div>
        </div>
      </div>

      <DashboardNav businessId={business.id} slug={business.slug} current="citas" />

      {/* Quick Share Link & WhatsApp bar */}
      <QuickShareBar slug={business.slug} businessName={business.name} />

      {/* KPI Stats Cards */}
      <DashboardKpiCards
        todayTotal={todayTotal}
        todayCompleted={todayCompleted}
        todayPending={todayPending}
        todayRevenueCents={todayRevenueCents}
        upcomingTotal={total}
        currency={primaryCurrency}
      />

      {/* Trial expired banner */}
      {trial.state === "EXPIRED" && (
        <div style={{
          background: "hsl(0 80% 97%)", border: "1px solid hsl(0 70% 88%)",
          borderRadius: "0.75rem", padding: "1rem 1.25rem", marginBottom: "1rem",
        }}>
          <p style={{ fontWeight: 600, color: "hsl(0 65% 35%)", marginBottom: "0.25rem" }}>Tu prueba terminó</p>
          <p style={{ fontSize: "0.875rem", color: "hsl(0 50% 45%)", marginBottom: "0.5rem" }}>
            Tus datos están a salvo, pero tu página ya no acepta reservas. Suscríbete para volver a recibirlas.
          </p>
          <Link href={billingQ} style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(252 70% 55%)", textDecoration: "none" }}>
            Ir a Facturación →
          </Link>
        </div>
      )}

      {/* Trial banner */}
      {trial.state === "TRIAL" && (
        <div style={{
          background: "hsl(252 85% 97%)", border: "1px solid hsl(252 75% 88%)",
          borderRadius: "0.75rem", padding: "0.75rem 1.25rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
        }}>
          <p style={{ fontSize: "0.875rem", color: "hsl(252 50% 40%)" }}>
            ✦ Prueba gratuita: te quedan <strong>{trial.daysLeft} días</strong>.
          </p>
          <Link href={billingQ} style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(252 70% 55%)", textDecoration: "none", whiteSpace: "nowrap" }}>
            Ver Facturación →
          </Link>
        </div>
      )}

      {/* Multi-business selector */}
      {memberships.length > 1 && (
        <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }} aria-label="Mis negocios">
          {memberships.map((m) => (
            <Link
              key={m.businessId}
              href={`/dashboard?businessId=${m.businessId}`}
              aria-current={m.businessId === business.id ? "page" : undefined}
              style={{
                padding: "0.3rem 0.85rem", fontSize: "0.8rem", fontWeight: 500,
                borderRadius: "9999px", textDecoration: "none",
                border: "1px solid",
                ...(m.businessId === business.id
                  ? { background: "hsl(252 75% 57%)", color: "#fff", borderColor: "transparent" }
                  : { background: "#fff", color: "hsl(220 15% 30%)", borderColor: "hsl(220 15% 88%)" }),
              }}
            >
              {m.business.name}
            </Link>
          ))}
        </nav>
      )}

      {/* Setup checklist */}
      {!setupDone && (
        <div style={{
          background: "#fff", border: "1px solid hsl(220 15% 88%)",
          borderRadius: "0.875rem", padding: "1.25rem",
          boxShadow: "0 1px 4px hsl(220 15% 15% / 0.06)",
          marginBottom: "1.25rem",
        }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>Configura tu negocio</p>
          <p style={{ fontSize: "0.875rem", color: "hsl(220 10% 50%)", marginBottom: "0.75rem" }}>
            Tu página pública es <code style={{ background: "hsl(220 20% 95%)", padding: "0.1rem 0.4rem", borderRadius: "0.3rem", fontSize: "0.8rem" }}>/book/{business.slug}</code>, pero aún no puede recibir reservas. Completa estos pasos:
          </p>
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", listStyle: "none", padding: 0 }}>
            {[
              { done: serviceCount > 0, label: "Crea al menos un servicio", href: `/dashboard/services?businessId=${business.id}`, link: "ir a Servicios" },
              { done: staffCount > 0,   label: "Añade al menos un profesional", href: `/dashboard/staff?businessId=${business.id}`, link: "ir a Profesionales" },
              { done: hoursCount > 0,   label: "Revisa tu horario", href: `/dashboard/schedule?businessId=${business.id}`, link: "ir a Horarios" },
            ].map((item) => (
              <li key={item.label} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.875rem" }}>
                <span style={{
                  width: "1.25rem", height: "1.25rem", borderRadius: "9999px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700,
                  ...(item.done
                    ? { background: "hsl(142 70% 90%)", color: "hsl(142 60% 25%)" }
                    : { background: "hsl(220 20% 93%)", color: "hsl(220 10% 50%)" }),
                }}>
                  {item.done ? "✓" : "○"}
                </span>
                <span style={{ color: item.done ? "hsl(220 10% 55%)" : "hsl(220 15% 20%)" }}>
                  {item.label}
                  {!item.done && <> · <Link href={item.href} style={{ color: "hsl(252 70% 55%)", textDecoration: "none", fontWeight: 500 }}>{item.link}</Link></>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search and Staff filter bar */}
      <AppointmentsFilterBar
        businessId={business.id}
        currentQuery={qStr}
        staffList={activeStaff}
        currentStaffId={staffFilter}
      />

      {/* No appointments */}
      {appts.length === 0 && (
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-8 text-center my-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3 text-xl">
            📅
          </div>
          <h3 className="font-bold text-neutral-800 text-base mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {qStr || staffFilter
              ? "No se encontraron citas con los filtros aplicados"
              : estado === "TODAS"
              ? "No hay citas programadas"
              : `Sin citas ${ESTADO_LABEL[estado as keyof typeof ESTADO_LABEL].toLowerCase()}s`}
          </h3>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-4">
            {qStr || staffFilter
              ? `Intenta cambiar o limpiar el término de búsqueda "${qStr || ""}" o el filtro de profesional.`
              : estado === "TODAS"
              ? "Comparte tu enlace de reservas en redes sociales o envíalo a tus clientes por WhatsApp para recibir reservas."
              : "No tienes citas con este estado actualmente."}
          </p>
          {(estado !== "TODAS" || qStr || staffFilter) && (
            <Link 
              href={`/dashboard?businessId=${business.id}`} 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              Restablecer todos los filtros →
            </Link>
          )}
        </div>
      )}

      {/* Appointment list */}
      {appts.length > 0 && (
        <section aria-label="Próximas citas" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Status filter pills */}
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }} aria-label="Filtrar por estado">
            {ESTADOS.map((e) => (
              <Link
                key={e}
                href={estadoQ(e)}
                aria-current={e === estado ? "page" : undefined}
                style={{
                  padding: "0.3rem 0.85rem", fontSize: "0.78rem", fontWeight: 500,
                  borderRadius: "9999px", textDecoration: "none", border: "1px solid",
                  ...(e === estado
                    ? { background: "hsl(220 15% 15%)", color: "#fff", borderColor: "transparent" }
                    : { background: "#fff", color: "hsl(220 15% 35%)", borderColor: "hsl(220 15% 85%)" }),
                }}
              >
                {e === "TODAS" ? "Todas" : ESTADO_LABEL[e]}
              </Link>
            ))}
          </nav>

          {/* Summary */}
          <p style={{ fontSize: "0.8rem", color: "hsl(220 10% 50%)" }} aria-live="polite">
            {counts.map((c) => `${c._count} ${ESTADO_LABEL[c.status as keyof typeof ESTADO_LABEL].toLowerCase()}s`).join(" · ") || "Sin citas próximas."}
            {total > 0 && ` · mostrando ${appts.length} de ${total}`}
          </p>

          {/* Groups by day */}
          {[...groups].map(([day, list]) => (
            <section key={day} aria-label={dayLabel(day)}>
              <h2 style={{
                fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.06em", color: "hsl(220 10% 50%)",
                padding: "0.25rem 0", marginBottom: "0.5rem",
                borderBottom: "1px solid hsl(220 15% 90%)",
              }}>
                {dayLabel(day)} · {list.length} cita{list.length !== 1 ? "s" : ""}
              </h2>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.625rem", listStyle: "none", padding: 0 }}>
                {list.map((a) => {
                  const sc = statusColor[a.status] ?? { bg: "hsl(220 20% 92%)", text: "hsl(220 15% 35%)" };
                  return (
                    <li key={a.id} style={{
                      display: "flex", alignItems: "flex-start", gap: "0.875rem",
                      background: "#fff", border: "1px solid hsl(220 15% 90%)",
                      borderRadius: "0.75rem", padding: "0.875rem 1rem",
                      boxShadow: "0 1px 3px hsl(220 15% 15% / 0.05)",
                      transition: "box-shadow 0.15s",
                    }}>
                      {/* Time column */}
                      <div style={{ minWidth: "3rem", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "1.05rem", color: "hsl(220 15% 12%)", lineHeight: 1 }}>
                          {hourFmt.format(a.startAt)}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "hsl(220 10% 55%)", marginTop: "0.2rem" }}>
                          {a.service.durationMinutes} min
                        </div>
                      </div>
                      {/* Info column */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "hsl(220 15% 12%)", marginBottom: "0.15rem" }}>
                          {a.service.name} · <span style={{ fontWeight: 400, color: "hsl(220 10% 45%)" }}>{a.staff.name}</span>
                        </div>
                        <div style={{ fontSize: "0.83rem", color: "hsl(220 10% 50%)", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.customer.name}{a.customer.phone ? ` · ${a.customer.phone}` : ""}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            padding: "0.15rem 0.6rem", fontSize: "0.72rem", fontWeight: 600,
                            borderRadius: "9999px", background: sc.bg, color: sc.text,
                          }}>
                            {ESTADO_LABEL[a.status as keyof typeof ESTADO_LABEL]}
                          </span>
                          <StatusButtons 
                            id={a.id} 
                            currentStatus={a.status}
                            customerPhone={a.customer.phone}
                            customerName={a.customer.name}
                            serviceName={a.service.name}
                            startTime={hourFmt.format(a.startAt)}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.875rem" }} aria-label="Páginas de citas">
              {safePage > 1
                ? <Link href={pageQ(safePage - 1)} style={{ color: "hsl(252 70% 55%)", textDecoration: "none" }}>← Anterior</Link>
                : <span />}
              <span style={{ color: "hsl(220 10% 50%)" }} aria-live="polite">Página {safePage} de {totalPages}</span>
              {safePage < totalPages
                ? <Link href={pageQ(safePage + 1)} style={{ color: "hsl(252 70% 55%)", textDecoration: "none" }}>Siguiente →</Link>
                : <span />}
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
