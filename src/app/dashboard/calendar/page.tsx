import Link from "next/link";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { StatusButtons } from "../status-buttons";
import { DashboardNav } from "../nav";
import { BusinessBar } from "../business-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysYMD(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return toYMD(d);
}

/** Lunes de la semana que contiene ymd (Europa: lunes-domingo). */
function mondayOf(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0=Dom … 6=Sáb
  const delta = (dow + 6) % 7; // días desde el lunes
  return addDaysYMD(ymd, -delta);
}

function fmtDayHeader(ymd: string, tz: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    timeZone: tz,
  }).format(new Date(`${ymd}T12:00:00Z`));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; date?: string; view?: string }>;
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
  const view = sp.view === "semana" ? "semana" : "dia";
  const dateStr = sp.date ?? toYMD(new Date());

  const qs = (extra: Record<string, string>) =>
    `/dashboard/calendar?businessId=${business.id}&${new URLSearchParams({
      date: dateStr,
      view,
      ...extra,
    }).toString()}`;

  if (view === "semana") {
    const monday = mondayOf(dateStr);
    const days = Array.from({ length: 7 }, (_, i) => addDaysYMD(monday, i));
    const start = fromZonedTime(`${monday} 00:00`, business.timezone);
    const end = fromZonedTime(`${addDaysYMD(monday, 7)} 00:00`, business.timezone);
    const appts = await prisma.appointment.findMany({
      where: { businessId: business.id, startAt: { gte: start, lt: end } },
      orderBy: { startAt: "asc" },
      include: { service: true, staff: true, customer: true },
    });
    const byDay = new Map<string, typeof appts>(days.map((d) => [d, []]));
    const tzFmt = new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "numeric",
      timeZone: business.timezone,
    });
    for (const a of appts) {
      // Compara contra los 7 días (evita desfases TZ al reconstruir YYYY-MM-DD)
      const match = days.find(
        (day) => tzFmt.format(new Date(`${day}T12:00:00Z`)) === tzFmt.format(a.startAt)
      );
      if (match) byDay.get(match)?.push(a);
    }
    const total = appts.length;

    return (
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <h1 className="text-xl font-bold">Calendario — {business.name}</h1>
        <BusinessBar role={membership.role} userEmail={data.user.email!} slug={business.slug} />
        <DashboardNav businessId={business.id} slug={business.slug} current="calendario" />
        <nav
          className="flex flex-wrap items-center gap-2 text-sm"
          aria-label="Vistas del calendario"
        >
          <Button asChild variant="default" size="sm">
            <Link href={qs({ view: "dia" })}>Día</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href={qs({ view: "semana" })}>Semana</Link>
          </Button>
          <span className="mx-1 text-neutral-300">|</span>
          <Button asChild variant="outline" size="sm">
            <Link href={qs({ date: addDaysYMD(monday, -7) })}>← Anterior</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={qs({ date: toYMD(new Date()) })}>Hoy</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={qs({ date: addDaysYMD(monday, 7) })}>Siguiente →</Link>
          </Button>
        </nav>
        <p className="text-sm text-neutral-600">
          Semana {monday} → {addDaysYMD(monday, 6)} · {total} citas
        </p>
        <div className="grid gap-2 overflow-x-auto md:grid-cols-7">
          {days.map((d) => (
            <section key={d} aria-label={d} className="min-w-36 rounded border p-2">
              <h2 className="text-xs font-semibold capitalize">
                <Link href={qs({ date: d, view: "dia" })} className="underline">
                  {fmtDayHeader(d, business.timezone)}
                </Link>
              </h2>
              <ul className="mt-1 space-y-1">
                {(byDay.get(d) ?? []).map((a) => (
                  <li key={a.id} className="rounded bg-neutral-100 p-1 text-xs">
                    <div className="font-medium">
                      {new Intl.DateTimeFormat("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: business.timezone,
                      }).format(a.startAt)}{" "}
                      · {a.service.name}
                    </div>
                    <div className="text-neutral-600">
                      {a.staff.name} · {a.customer.name} · {a.status}
                    </div>
                  </li>
                ))}
                {(byDay.get(d) ?? []).length === 0 && (
                  <li className="text-xs text-neutral-400">—</li>
                )}
              </ul>
            </section>
          ))}
        </div>
      </main>
    );
  }

  // Vista día (existente, migrada a shadcn)
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const start = fromZonedTime(`${dateStr} 00:00`, business.timezone);
  const end = fromZonedTime(`${d.toISOString().slice(0, 10)} 00:00`, business.timezone);

  const appts = await prisma.appointment.findMany({
    where: { businessId: business.id, startAt: { gte: start, lt: end } },
    orderBy: { startAt: "asc" },
    include: { service: true, staff: true, customer: true },
  });

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Calendario — {business.name}</h1>
      <BusinessBar role={membership.role} userEmail={data.user.email!} slug={business.slug} />
      <DashboardNav businessId={business.id} slug={business.slug} current="calendario" />
      <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Vistas del calendario">
        <Button asChild variant="secondary" size="sm">
          <Link href={qs({ view: "dia" })}>Día</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={qs({ view: "semana" })}>Semana</Link>
        </Button>
      </nav>
      <form className="flex gap-2">
        <input type="hidden" name="businessId" value={business.id} />
        <input type="hidden" name="view" value="dia" />
        <Input type="date" name="date" defaultValue={dateStr} aria-label="Fecha" />
        <Button type="submit" variant="outline">
          Ver
        </Button>
      </form>
      <p className="text-sm text-neutral-600">
        {dateStr} · {appts.length} citas
      </p>
      <ul className="space-y-2">
        {appts.map((a) => (
          <li key={a.id} className="rounded border p-3">
            <div className="font-medium">
              {new Intl.DateTimeFormat("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: business.timezone,
              }).format(a.startAt)}{" "}
              · {a.service.name} · {a.staff.name}
            </div>
            <div className="text-sm text-neutral-600">
              {a.customer.name} · {a.status}
            </div>
            <StatusButtons id={a.id} />
          </li>
        ))}
      </ul>
      {appts.length === 0 && <p className="text-sm text-neutral-600">Día libre.</p>}
    </main>
  );
}
