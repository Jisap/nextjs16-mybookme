import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { StatusButtons } from "../status-buttons";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; date?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const memberships = await prisma.businessMember.findMany({ where: { userId: data.user.id }, include: { business: true } });
  if (memberships.length === 0) redirect("/dashboard");
  const sp = await searchParams;
  const business = memberships.find((m) => m.businessId === sp.businessId)?.business ?? memberships[0].business;
  const dateStr = sp.date ?? new Date().toISOString().slice(0, 10);
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
      <form className="flex gap-2">
        <input type="hidden" name="businessId" value={business.id} />
        <input type="date" name="date" defaultValue={dateStr} className="rounded border p-2" />
        <button className="rounded border px-3">Ver</button>
      </form>
      <p className="text-sm text-gray-600">
        {dateStr} · {appts.length} citas
      </p>
      <ul className="space-y-2">
        {appts.map((a) => (
          <li key={a.id} className="rounded border p-3">
            <div className="font-medium">
              {new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: business.timezone }).format(a.startAt)} ·{" "}
              {a.service.name} · {a.staff.name}
            </div>
            <div className="text-sm text-gray-600">
              {a.customer.name} · {a.status}
            </div>
            <StatusButtons id={a.id} />
          </li>
        ))}
      </ul>
      {appts.length === 0 && <p className="text-sm text-gray-600">Día libre.</p>}
    </main>
  );
}
