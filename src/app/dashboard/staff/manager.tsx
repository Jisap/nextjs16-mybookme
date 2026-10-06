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
  }, [businessId]);

  async function create() {
    setMsg("");
    const r = await fetch("/api/dashboard/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, name, serviceIds: checked }),
    });
    if (!r.ok) {
      setMsg(r.status === 403 ? "Solo OWNER puede crear" : "No se pudo crear");
      return;
    }
    setName("");
    setChecked([]);
    load();
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
    <div className="space-y-4">
      <div className="space-y-2 rounded border p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. María)"
          className="w-full rounded border p-2"
        />
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={checked.includes(s.id)}
                onChange={() =>
                  setChecked(
                    checked.includes(s.id) ? checked.filter((x) => x !== s.id) : [...checked, s.id]
                  )
                }
              />
              {s.name}
            </label>
          ))}
        </div>
        <button onClick={create} className="rounded bg-black px-4 py-2 text-white">
          Añadir profesional
        </button>
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <ul className="space-y-2">
        {list.map((st) => (
          <li key={st.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {st.name} {st.active ? "" : "(inactivo)"}
              </span>
              <button onClick={() => toggleActive(st)} className="rounded border px-2 py-1 text-xs">
                {st.active ? "Desactivar" : "Activar"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={st.services.some((x) => x.serviceId === s.id)}
                    onChange={() => toggleServices(st, s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
