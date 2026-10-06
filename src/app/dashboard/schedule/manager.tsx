"use client";

import { useEffect, useState } from "react";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

interface WH {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  staffId: string | null;
}
interface Exc {
  id: string;
  date: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}
interface Staff {
  id: string;
  name: string;
}

export function ScheduleManager({ businessId }: { businessId: string }) {
  const [wh, setWh] = useState<WH[]>([]);
  const [exc, setExc] = useState<Exc[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [day, setDay] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("14:00");
  const [edate, setEdate] = useState(() => new Date().toISOString().slice(0, 10));
  const [etype, setEtype] = useState("CLOSED");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch(`/api/dashboard/schedule/working-hours?businessId=${businessId}`);
    if (r.ok) {
      const j = await r.json();
      setWh(j.workingHours);
      setExc(j.exceptions);
      setStaff(j.staff);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function addWH() {
    setMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/schedule/working-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, dayOfWeek: Number(day), startTime: start, endTime: end }),
      });
      if (!r.ok) {
        setMsg(r.status === 403 ? "Solo el Propietario puede cambiar horarios" : "Horario inválido (formato HH:mm, hora fin > inicio)");
        return;
      }
      load();
    } finally {
      setLoading(false);
    }
  }

  async function delWH(id: string) {
    await fetch(`/api/dashboard/schedule/working-hours/${id}`, { method: "DELETE" });
    load();
  }

  async function addExc() {
    setMsg("");
    const body: Record<string, unknown> = { businessId, date: edate, type: etype };
    if (etype !== "CLOSED") {
      body.startTime = start;
      body.endTime = end;
    }
    const r = await fetch("/api/dashboard/schedule/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      setMsg(r.status === 403 ? "Solo el Propietario puede añadir excepciones" : "Excepción inválida");
      return;
    }
    load();
  }

  async function delExc(id: string) {
    await fetch(`/api/dashboard/schedule/exceptions/${id}`, { method: "DELETE" });
    load();
  }

  // Ordenar días laborales de Lunes a Domingo para visualización natural
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6">
      {/* Weekly Schedule Section */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Horario Semanal General
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Define en qué tramos horarios abre el negocio habitualmente cada día de la semana.
        </p>

        {/* Form add working hours */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 mb-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Día</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-brand-500"
            >
              {orderedDays.map((d) => (
                <option key={d} value={d}>
                  {DAYS[d]}
                </option>
              ))}
            </select>
          </div>

          <div className="w-28">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Apertura</label>
            <input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="09:00"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="w-28">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Cierre</label>
            <input
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="14:00"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-brand-500"
            />
          </div>

          <button
            type="button"
            onClick={addWH}
            disabled={loading}
            style={{ background: "hsl(252 75% 57%)", color: "#fff" }}
            className="py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            + Añadir Tramo
          </button>
        </div>

        {/* Days List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {orderedDays.map((d) => {
            const slots = wh.filter((w) => w.dayOfWeek === d);
            const isOpen = slots.length > 0;
            return (
              <div
                key={d}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                  isOpen ? "bg-white border-neutral-200 shadow-2xs" : "bg-neutral-50/70 border-neutral-200/80"
                }`}
              >
                <div>
                  <div className="font-bold text-xs uppercase tracking-wider text-neutral-800">
                    {DAYS[d]}
                  </div>
                  {!isOpen && (
                    <span className="text-xs text-neutral-400 mt-1 inline-block">Cerrado</span>
                  )}
                  {slots.map((w) => (
                    <div key={w.id} className="flex items-center gap-2 mt-1 text-xs">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {w.startTime} – {w.endTime}
                      </span>
                      <button
                        type="button"
                        onClick={() => delWH(w.id)}
                        className="text-neutral-400 hover:text-rose-600 font-bold px-1"
                        title="Eliminar este tramo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exceptions Section */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Excepciones y Vacaciones
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Añade días festivos en los que el local permanecerá cerrado o días de apertura especial fuera del horario habitual.
        </p>

        {/* Add exception form */}
        <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 mb-5 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Fecha</label>
            <input
              type="date"
              value={edate}
              onChange={(e) => setEdate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="w-44">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Tipo de excepción</label>
            <select
              value={etype}
              onChange={(e) => setEtype(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-none"
            >
              <option value="CLOSED">Cerrado todo el día</option>
              <option value="BLOCKED">Bloqueo de horas</option>
              <option value="OPEN">Apertura extraordinaria</option>
            </select>
          </div>

          <button
            type="button"
            onClick={addExc}
            style={{ background: "hsl(252 75% 57%)", color: "#fff" }}
            className="py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 transition-all cursor-pointer"
          >
            + Añadir Excepción
          </button>
        </div>

        {etype !== "CLOSED" && (
          <p className="text-xs text-neutral-500 mb-3 italic">
            * Los tramos para bloqueo u horario extra usarán los valores seleccionados arriba ({start} – {end}).
          </p>
        )}

        {/* Exceptions list */}
        {exc.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 text-xs">
            No hay vacaciones ni días especiales programados.
          </div>
        ) : (
          <ul className="space-y-2">
            {exc.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 bg-white text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-neutral-900">{e.date.slice(0, 10)}</span>
                  <span className="ml-2 font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                    {e.type === "CLOSED" ? "Cerrado" : e.type === "OPEN" ? "Apertura extra" : "Bloqueo"}
                  </span>
                  {e.startTime && (
                    <span className="text-neutral-500 ml-2 font-mono">
                      {e.startTime} – {e.endTime}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => delExc(e.id)}
                  className="text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded-lg hover:bg-rose-50"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {msg && (
        <p role="alert" className="text-xs text-rose-600 font-medium">
          ⚠️ {msg}
        </p>
      )}
    </div>
  );
}
