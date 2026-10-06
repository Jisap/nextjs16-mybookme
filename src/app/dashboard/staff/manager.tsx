"use client";

import { useEffect, useState } from "react";

interface Staff {
  id: string;
  name: string;
  active: boolean;
  services: { serviceId: string }[];
}

interface Service {
  id: string;
  name: string;
}

export function StaffManager({ businessId }: { businessId: string }) {
  const [list, setList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const r = await fetch(`/api/dashboard/staff?businessId=${businessId}`);
    if (r.ok) {
      const j = await r.json();
      setList(j.staff);
      setServices(j.services);
    }
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
      const r = await fetch("/api/dashboard/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, name: name.trim(), serviceIds: checked }),
      });
      if (!r.ok) {
        setMsg(r.status === 403 ? "Solo el Propietario puede añadir profesionales" : "No se pudo añadir");
        return;
      }
      setName("");
      setChecked([]);
      load();
    } finally {
      setLoading(false);
    }
  }

  async function toggleServices(st: Staff, serviceId: string) {
    const has = st.services.some((s) => s.serviceId === serviceId);
    const serviceIds = has
      ? st.services.filter((s) => s.serviceId !== serviceId).map((s) => s.serviceId)
      : [...st.services.map((s) => s.serviceId), serviceId];
    await fetch(`/api/dashboard/staff/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds }),
    });
    load();
  }

  async function toggleActive(st: Staff) {
    await fetch(`/api/dashboard/staff/${st.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !st.active }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Create Staff Form Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Añadir Profesional
        </h2>
        <p className="text-xs text-neutral-500 mb-4">
          Registra a los miembros de tu equipo y asigna qué servicios puede realizar cada uno.
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div>
            <label htmlFor="staff-name" className="block text-xs font-semibold text-neutral-700 mb-1">
              Nombre del Profesional
            </label>
            <input
              id="staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. María o Carlos"
              required
              className="w-full sm:max-w-md px-3 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              Servicios que realiza:
            </label>
            {services.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">
                Aún no tienes servicios creados. Ve a la pestaña Servicios para añadirlos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const isChecked = checked.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-brand-50 border-brand-300 text-brand-800"
                          : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setChecked(
                            isChecked ? checked.filter((x) => x !== s.id) : [...checked, s.id]
                          )
                        }
                        className="rounded text-brand-600"
                      />
                      <span>{s.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{ background: "hsl(252 75% 57%)", color: "#fff" }}
              className="py-2 px-5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "…" : "+ Guardar Profesional"}
            </button>
          </div>
        </form>

        {msg && (
          <p role="alert" className="mt-3 text-xs text-rose-600 font-medium">
            ⚠️ {msg}
          </p>
        )}
      </div>

      {/* Staff List Card */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-5 shadow-xs">
        <h2 className="text-base font-bold text-neutral-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Equipo de Trabajo ({list.length})
        </h2>

        {list.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">
            No tienes profesionales añadidos aún.
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((st) => (
              <li
                key={st.id}
                className={`p-4 rounded-xl border transition-all ${
                  st.active ? "bg-white border-neutral-200 shadow-2xs" : "bg-neutral-50/60 border-neutral-200 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                      {st.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-neutral-900">{st.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 ${
                          st.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {st.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleActive(st)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    {st.active ? "Desactivar" : "Activar"}
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-neutral-100">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Servicios vinculados:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((s) => {
                      const does = st.services.some((x) => x.serviceId === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleServices(st, s.id)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            does
                              ? "bg-brand-50 border-brand-200 text-brand-700 font-medium"
                              : "bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700 hover:border-neutral-300 line-through"
                          }`}
                          title={does ? "Clic para desvincular" : "Clic para vincular"}
                        >
                          {does ? `✓ ${s.name}` : `+ ${s.name}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
