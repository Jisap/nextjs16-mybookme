import Link from "next/link";
import { redirect } from "next/navigation";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "../nav";
import { StatusButtons } from "../status-buttons";
import { CreateAppointmentModal } from "../create-appointment-modal";
import { CalendarControls } from "./controls";

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toYMD(d);
}

function mondayOf(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const dow = d.getUTCDay();
  const delta = (dow + 6) % 7;
  return addDaysYMD(ymd, -delta);
}

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  PENDING:   { bg: "hsl(45 95% 93%)",  text: "hsl(35 80% 30%)",  border: "hsl(45 80% 75%)" },
  CONFIRMED: { bg: "hsl(142 70% 92%)", text: "hsl(142 60% 22%)", border: "hsl(142 60% 75%)" },
  COMPLETED: { bg: "hsl(220 20% 92%)", text: "hsl(220 15% 30%)", border: "hsl(220 15% 80%)" },
  CANCELLED: { bg: "hsl(0 80% 93%)",   text: "hsl(0 65% 32%)",   border: "hsl(0 65% 80%)" },
  NO_SHOW:   { bg: "hsl(280 60% 93%)", text: "hsl(280 50% 32%)", border: "hsl(280 50% 80%)" },
};

const ESTADO_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No vino",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; date?: string; view?: string; staffId?: string }>;
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
  const view = sp.view === "semana" ? "semana" : "timeline"; // Por defecto timeline por profesional
  const todayYMD = formatInTimeZone(new Date(), business.timezone, "yyyy-MM-dd");
  const dateStr = sp.date ?? todayYMD;
  const staffFilter = (sp.staffId ?? "").trim();

  // Cargar staff y servicios activos para el modal y selector
  const [staffList, servicesList] = await Promise.all([
    prisma.staff.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.service.findMany({
      where: { businessId: business.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMinutes: true, priceCents: true, currency: true },
    }),
  ]);

  const qs = (extra: Record<string, string | undefined>) => {
    const cur: Record<string, string> = {
      businessId: business.id,
      date: dateStr,
      view,
    };
    if (staffFilter) cur.staffId = staffFilter;
    for (const [k, v] of Object.entries(extra)) {
      if (!v) delete cur[k];
      else cur[k] = v;
    }
    return `/dashboard/calendar?${new URLSearchParams(cur).toString()}`;
  };

  const hourFmt = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: business.timezone,
  });

  const fullDateFmt = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: business.timezone,
  });

  // ==========================================
  // VISTA 1: SEMANAL (Resumen 7 días)
  // ==========================================
  if (view === "semana") {
    const monday = mondayOf(dateStr);
    const days = Array.from({ length: 7 }, (_, i) => addDaysYMD(monday, i));
    const start = fromZonedTime(`${monday} 00:00`, business.timezone);
    const end = fromZonedTime(`${addDaysYMD(monday, 7)} 00:00`, business.timezone);

    const staffWhere = staffFilter ? { staffId: staffFilter } : undefined;

    const appts = await prisma.appointment.findMany({
      where: { businessId: business.id, startAt: { gte: start, lt: end }, ...staffWhere },
      orderBy: { startAt: "asc" },
      include: { service: true, staff: true, customer: true },
    });

    const byDay = new Map<string, typeof appts>(days.map((d) => [d, []]));
    const tzDayFmt = (dateObj: Date) => formatInTimeZone(dateObj, business.timezone, "yyyy-MM-dd");

    for (const a of appts) {
      const k = tzDayFmt(a.startAt);
      if (byDay.has(k)) byDay.get(k)!.push(a);
    }

    return (
      <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <h1 className="font-extrabold text-2xl text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Agenda Semanal — {business.name}
            </h1>
            <p className="text-xs text-neutral-500 capitalize mt-0.5">
              Semana del {fullDateFmt.format(new Date(`${monday}T12:00:00Z`))} al {fullDateFmt.format(new Date(`${addDaysYMD(monday, 6)}T12:00:00Z`))}
            </p>
          </div>
          <CreateAppointmentModal businessId={business.id} services={servicesList} staffList={staffList} />
        </div>

        <DashboardNav businessId={business.id} slug={business.slug} current="calendario" />

        {/* Toolbar Controls */}
        <CalendarControls
          businessId={business.id}
          dateStr={dateStr}
          todayYMD={todayYMD}
          view="semana"
          staffFilter={staffFilter}
          staffList={staffList}
        />

        {/* 7 Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto">
          {days.map((d) => {
            const list = byDay.get(d) ?? [];
            const isToday = d === todayYMD;
            return (
              <div
                key={d}
                className={`bg-white rounded-2xl border p-3 min-w-[140px] flex flex-col justify-start transition-all shadow-xs ${
                  isToday ? "border-brand-500/80 ring-2 ring-brand-500/10" : "border-neutral-200"
                }`}
              >
                <div className="border-b pb-2 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                      {new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: business.timezone }).format(new Date(`${d}T12:00:00Z`))}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-brand-50 text-brand-600">
                        Hoy
                      </span>
                    )}
                  </div>
                  <Link
                    href={qs({ view: "timeline", date: d })}
                    className="text-sm font-bold text-neutral-900 hover:text-brand-600 transition-colors"
                  >
                    {new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: business.timezone }).format(new Date(`${d}T12:00:00Z`))}
                  </Link>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {list.length} cita{list.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  {list.map((a) => {
                    const sc = STATUS_COLOR[a.status] ?? STATUS_COLOR.CONFIRMED;
                    return (
                      <div
                        key={a.id}
                        className="p-2 rounded-xl border text-xs shadow-2xs"
                        style={{ background: sc.bg, borderColor: sc.border }}
                      >
                        <div className="font-bold text-neutral-900 flex items-center justify-between">
                          <span>{hourFmt.format(a.startAt)}</span>
                          <span className="text-[9px] font-semibold" style={{ color: sc.text }}>
                            {ESTADO_LABEL[a.status] || a.status}
                          </span>
                        </div>
                        <div className="font-semibold text-neutral-800 truncate mt-0.5" title={a.service.name}>
                          {a.service.name}
                        </div>
                        <div className="text-[11px] text-neutral-600 truncate mt-0.5" title={`${a.staff.name} · ${a.customer.name}`}>
                          👤 {a.staff.name} · {a.customer.name}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="text-[11px] text-neutral-300 text-center py-6 font-medium">
                      Sin citas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  // ==============================================================
  // VISTA 2: TIMELINE / AGENDA DIARIA POR PROFESIONAL (Predeterminada)
  // ==============================================================
  const dayStart = fromZonedTime(`${dateStr} 00:00`, business.timezone);
  const dayEnd = fromZonedTime(`${addDaysYMD(dateStr, 1)} 00:00`, business.timezone);

  const staffWhere = staffFilter ? { staffId: staffFilter } : undefined;

  const appts = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      startAt: { gte: dayStart, lt: dayEnd },
      ...staffWhere,
    },
    orderBy: { startAt: "asc" },
    include: { service: true, staff: true, customer: true },
  });

  // Agrupar citas por profesional (columnas en el timeline)
  const displayStaff = staffFilter
    ? staffList.filter((s) => s.id === staffFilter)
    : staffList;

  const apptsByStaff = new Map<string, typeof appts>();
  for (const st of displayStaff) {
    apptsByStaff.set(st.id, []);
  }
  for (const a of appts) {
    if (apptsByStaff.has(a.staffId)) {
      apptsByStaff.get(a.staffId)!.push(a);
    }
  }

  const isToday = dateStr === todayYMD;

  return (
    <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
        <div>
          <h1 className="font-extrabold text-2xl text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Agenda Diaria — {business.name}
          </h1>
          <p className="text-xs text-neutral-500 capitalize mt-0.5">
            {fullDateFmt.format(new Date(`${dateStr}T12:00:00Z`))}
            {isToday && " (Hoy)"}
          </p>
        </div>
        <CreateAppointmentModal businessId={business.id} services={servicesList} staffList={staffList} />
      </div>

      <DashboardNav businessId={business.id} slug={business.slug} current="calendario" />

      {/* Toolbar: Selectores de fecha, vista y filtro de empleado */}
      <CalendarControls
        businessId={business.id}
        dateStr={dateStr}
        todayYMD={todayYMD}
        view="timeline"
        staffFilter={staffFilter}
        staffList={staffList}
      />

      {/* Timeline Columns by Staff */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            {appts.length} citas agendadas para este día
          </div>
        </div>

        <div
          className={`grid gap-4 ${
            displayStaff.length === 1
              ? "grid-cols-1 max-w-xl mx-auto"
              : displayStaff.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-3"
          }`}
        >
          {displayStaff.map((staff) => {
            const list = apptsByStaff.get(staff.id) ?? [];
            return (
              <div
                key={staff.id}
                className="bg-white rounded-2xl border border-neutral-200 shadow-xs flex flex-col overflow-hidden"
              >
                {/* Column Staff Header */}
                <div className="p-3.5 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-neutral-900">{staff.name}</div>
                      <div className="text-[11px] text-neutral-400">
                        {list.length} cita{list.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column Appointment Cards */}
                <div className="p-3.5 space-y-3 flex-1 bg-neutral-50/20">
                  {list.map((a) => {
                    const sc = STATUS_COLOR[a.status] ?? STATUS_COLOR.CONFIRMED;
                    return (
                      <div
                        key={a.id}
                        className="bg-white rounded-xl border p-3 shadow-xs transition-all hover:shadow-md"
                        style={{ borderLeftColor: sc.border, borderLeftWidth: "4px" }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-extrabold text-sm text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {hourFmt.format(a.startAt)}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            {ESTADO_LABEL[a.status] || a.status}
                          </span>
                        </div>

                        <div className="font-semibold text-xs text-neutral-800 mb-0.5">
                          {a.service.name}
                          <span className="text-[11px] text-neutral-400 font-normal ml-1">
                            ({a.service.durationMinutes} min)
                          </span>
                        </div>

                        <div className="text-xs text-neutral-600 truncate mb-2">
                          👤 {a.customer.name}
                          {a.customer.phone && <span className="text-neutral-400"> · {a.customer.phone}</span>}
                        </div>

                        {a.notes && (
                          <div className="text-[11px] text-neutral-500 bg-neutral-50 p-1.5 rounded-lg mb-2 italic">
                            "{a.notes}"
                          </div>
                        )}

                        <StatusButtons
                          id={a.id}
                          currentStatus={a.status}
                          customerPhone={a.customer.phone}
                          customerName={a.customer.name}
                          serviceName={a.service.name}
                          startTime={hourFmt.format(a.startAt)}
                        />
                      </div>
                    );
                  })}

                  {list.length === 0 && (
                    <div className="text-center py-12 text-neutral-300">
                      <div className="text-2xl mb-1">☕</div>
                      <div className="text-xs font-medium">Sin citas para hoy</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
