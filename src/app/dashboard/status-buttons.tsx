"use client";

import { useState } from "react";

const ACTIONS: { label: string; status: string }[] = [
  { label: "Confirmar", status: "CONFIRMED" },
  { label: "Cancelar", status: "CANCELLED" },
  { label: "Completar", status: "COMPLETED" },
  { label: "No-show", status: "NO_SHOW" },
];

export function StatusButtons({ id }: { id: string }) {
  const [msg, setMsg] = useState("");
  async function patch(status: string) {
    setMsg("");
    const r = await fetch(`/api/dashboard/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error === "FORBIDDEN" ? "Sin permiso" : "No se pudo actualizar");
      return;
    }
    window.location.reload();
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {ACTIONS.map((a) => (
        <button key={a.status} onClick={() => patch(a.status)} className="rounded border px-2 py-1 text-xs">
          {a.label}
        </button>
      ))}
      {msg && <span className="text-xs text-red-700">{msg}</span>}
    </div>
  );
}
