"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  async function load() {
    const r = await fetch(`/api/dashboard/services?businessId=${businessId}`);
    if (r.ok) setList((await r.json()).services);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function create() {
    setMsg("");
    const r = await fetch("/api/dashboard/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        name,
        durationMinutes: Number(duration),
        priceCents: Math.round(Number(price) * 100),
      }),
    });
    if (!r.ok) {
      setMsg(r.status === 403 ? "Solo OWNER puede crear" : "No se pudo crear");
      return;
    }
    setName("");
    load();
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (ej. Manicura)"
          className="flex-1"
        />
        <Input
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Min"
          inputMode="numeric"
          className="w-20"
        />
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="€"
          inputMode="decimal"
          className="w-20"
        />
        <Button onClick={create}>Añadir</Button>
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <ul className="space-y-2">
        {list.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded border p-3">
            <span>
              {s.name} · {s.durationMinutes} min · {(s.priceCents / 100).toFixed(2)}€{" "}
              {s.active ? "" : "(inactivo)"}
            </span>
            <Button onClick={() => toggle(s)} variant="outline" size="sm">
              {s.active ? "Desactivar" : "Activar"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
