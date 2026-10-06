"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export function ServicesManager({ businessId }: { businessId: string }) {
  const [list, setList] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [price, setPrice] = useState("25");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch(`/api/dashboard/services?businessId=${businessId}`);
    if (r.ok) setList((await r.json()).services);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function create() {
    if (!name.trim()) return;
    setMsg("");
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: name.trim(),
          durationMinutes: Number(duration),
          priceCents: Math.round(Number(price) * 100),
        }),
      });
      if (!r.ok) {
        setMsg(r.status === 403 ? "Solo el Propietario puede crear servicios" : "No se pudo crear el servicio");
        return;
      }
      setName("");
      load();
    } finally {
      setLoading(false);
    }
  }

  async function toggle(s: Service) {
    await fetch(`/api/dashboard/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !s.active }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Create Service Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Añadir Nuevo Servicio
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Define el nombre, duración aproximada y precio de los tratamientos o servicios que ofreces.
        </p>

        <form
          className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className="sm:col-span-6">
            <label htmlFor="svc-name" className="block text-xs font-semibold text-neutral-700 mb-1">
              Nombre del Servicio
            </label>
            <input
              id="svc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Corte de pelo + Lavado"
              required
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="svc-duration" className="block text-xs font-semibold text-neutral-700 mb-1">
              Duración (min)
            </label>
            <input
              id="svc-duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              inputMode="numeric"
              type="number"
              min={5}
              max={480}
              required
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="svc-price" className="block text-xs font-semibold text-neutral-700 mb-1">
              Precio (€)
            </label>
            <input
              id="svc-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              type="number"
              min={0}
              step="0.5"
              required
              className="w-full px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              style={{ background: "hsl(252 75% 57%)", color: "#fff" }}
              className="w-full py-2 px-4 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "…" : "+ Añadir"}
            </button>
          </div>
        </form>

        {msg && (
          <p role="alert" className="mt-3 text-xs text-rose-600 font-medium">
            ⚠️ {msg}
          </p>
        )}
      </div>

      {/* Services List */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Servicios Configurados ({list.length})
          </h2>
        </div>

        {list.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">
            No tienes servicios registrados aún. Añade el primero arriba.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {list.map((s) => (
              <li
                key={s.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  s.active ? "bg-white border-neutral-200 shadow-2xs" : "bg-neutral-50/60 border-neutral-200 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-neutral-900">{s.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        s.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {s.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-3">
                    <span>⏱️ {s.durationMinutes} minutos</span>
                    <span>💶 {(s.priceCents / 100).toFixed(2)} €</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggle(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    s.active
                      ? "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      : "border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100"
                  }`}
                >
                  {s.active ? "Desactivar" : "Reactivar"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
