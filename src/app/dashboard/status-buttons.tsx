"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const ACTIONS: {
  label: string;
  status: string;
  variant: "outline" | "secondary" | "destructive";
}[] = [
  { label: "Confirmar", status: "CONFIRMED", variant: "secondary" },
  { label: "Cancelar", status: "CANCELLED", variant: "outline" },
  { label: "Completar", status: "COMPLETED", variant: "secondary" },
  { label: "No-show", status: "NO_SHOW", variant: "destructive" },
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
        <Button key={a.status} onClick={() => patch(a.status)} variant={a.variant} size="sm">
          {a.label}
        </Button>
      ))}
      {msg && <span className="text-xs text-red-700">{msg}</span>}
    </div>
  );
}
