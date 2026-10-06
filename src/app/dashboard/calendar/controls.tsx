"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function CalendarControls({
  businessId,
  dateStr,
  todayYMD,
  view,
  staffFilter,
  staffList,
}: {
  businessId: string;
  dateStr: string;
  todayYMD: string;
  view: string;
  staffFilter: string;
  staffList: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function makeUrl(extra: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("businessId", businessId);
    params.set("date", dateStr);
    params.set("view", view);
    if (staffFilter) params.set("staffId", staffFilter);
    else params.delete("staffId");

    for (const [k, v] of Object.entries(extra)) {
      if (!v) params.delete(k);
      else params.set(k, v);
    }
    return `/dashboard/calendar?${params.toString()}`;
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const targetDate = e.target.value;
    if (targetDate) {
      router.push(makeUrl({ date: targetDate }));
    }
  }

  function handleStaffChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedStaff = e.target.value;
    router.push(makeUrl({ staffId: selectedStaff || undefined }));
  }

  function addDays(ymd: string, n: number): string {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  const isToday = dateStr === todayYMD;

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl p-3.5 my-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* View Switchers */}
      <div className="flex items-center gap-1.5">
        <Link
          href={makeUrl({ view: "timeline" })}
          style={view === "timeline" ? { background: "hsl(252 75% 57%)", color: "#fff" } : undefined}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            view === "timeline"
              ? "shadow-xs"
              : "border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          Vista Día / Timeline
        </Link>
        <Link
          href={makeUrl({ view: "semana" })}
          style={view === "semana" ? { background: "hsl(252 75% 57%)", color: "#fff" } : undefined}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
            view === "semana"
              ? "shadow-xs"
              : "border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          Semana completa
        </Link>
      </div>

      {/* Date Navigator */}
      <div className="flex items-center gap-2">
        <Link
          href={makeUrl({ date: addDays(dateStr, view === "semana" ? -7 : -1) })}
          className="p-1.5 px-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          ← Anterior
        </Link>

        {/* Date picker */}
        <input
          type="date"
          value={dateStr}
          onChange={handleDateChange}
          aria-label="Seleccionar fecha"
          className="py-1 px-2.5 text-xs font-semibold text-neutral-800 border border-neutral-200 rounded-xl bg-neutral-50 hover:bg-neutral-100 focus:bg-white focus:outline-none cursor-pointer"
        />

        <Link
          href={makeUrl({ date: todayYMD })}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
            isToday
              ? "bg-neutral-900 text-white border-transparent"
              : "border-neutral-200 text-neutral-800 hover:bg-neutral-50"
          }`}
        >
          Hoy
        </Link>

        <Link
          href={makeUrl({ date: addDays(dateStr, view === "semana" ? 7 : 1) })}
          className="p-1.5 px-3 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Siguiente →
        </Link>
      </div>

      {/* Staff Filter Dropdown */}
      {staffList.length > 1 && (
        <div className="md:w-52">
          <select
            value={staffFilter}
            onChange={handleStaffChange}
            aria-label="Filtrar por empleado en agenda"
            className="w-full py-1.5 px-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 focus:outline-none cursor-pointer"
          >
            <option value="">Todos los profesionales</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
