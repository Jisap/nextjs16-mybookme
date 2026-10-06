"use client";

import { useEffect, useState } from "react";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

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
  }, [businessId]);

  async function addWH() {
    setMsg("");
    const r = await fetch("/api/dashboard/schedule/working-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, dayOfWeek: Number(day), startTime: start, endTime: end }),
    });
    if (!r.ok) {
      setMsg(r.status === 403 ? "Solo OWNER" : "Horario inválido (HH:mm, fin > inicio)");
      return;
    }
    load();
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
      setMsg(r.status === 403 ? "Solo OWNER" : "Excepción inválida");
      return;
    }
    load();
  }

  async function delExc(id: string) {
    await fetch(`/api/dashboard/schedule/exceptions/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-semibold">Horario semanal (general)</h2>
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <div key={d} className="rounded border p-2">
            <div className="text-sm font-medium">{DAYS[d]}</div>
            {wh.filter((w) => w.dayOfWeek === d).length === 0 && (
              <div className="text-xs text-gray-500">Cerrado</div>
            )}
            {wh
              .filter((w) => w.dayOfWeek === d)
              .map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm">
                  <span>
                    {w.startTime}–{w.endTime}
                  </span>
                  <button onClick={() => delWH(w.id)} className="text-xs underline">
                    Quitar
                  </button>
                </div>
              ))}
          </div>
        ))}
        <div className="flex gap-2">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded border p-2"
          >
            {DAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            placeholder="09:00"
            className="w-24 rounded border p-2"
          />
          <input
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            placeholder="14:00"
            className="w-24 rounded border p-2"
          />
          <button onClick={addWH} className="rounded bg-black px-3 text-white">
            Añadir
          </button>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Excepciones (vacaciones, festivos)</h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={edate}
            onChange={(e) => setEdate(e.target.value)}
            className="rounded border p-2"
          />
          <select
            value={etype}
            onChange={(e) => setEtype(e.target.value)}
            className="rounded border p-2"
          >
            <option value="CLOSED">Cerrado</option>
            <option value="BLOCKED">Bloqueo parcial</option>
            <option value="OPEN">Apertura extra</option>
          </select>
          <button onClick={addExc} className="rounded bg-black px-3 text-white">
            Añadir
          </button>
        </div>
        {etype !== "CLOSED" && (
          <p className="text-xs text-gray-600">
            Usa las horas de arriba como inicio/fin del rango.
          </p>
        )}
        <ul className="space-y-1">
          {exc.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded border p-2 text-sm">
              <span>
                {e.date.slice(0, 10)} · {e.type} {e.startTime ? `${e.startTime}–${e.endTime}` : ""}
              </span>
              <button onClick={() => delExc(e.id)} className="text-xs underline">
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </section>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      {staff.length === 0 && <p className="text-xs text-gray-500">Sin profesionales activos.</p>}
    </div>
  );
}
