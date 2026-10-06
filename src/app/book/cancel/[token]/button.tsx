"use client";

import { useState } from "react";

export function CancelButton({ token }: { token: string }) {
  const [msg, setMsg] = useState("");
  const [gone, setGone] = useState(false);
  async function cancel() {
    setMsg("");
    const r = await fetch(`/api/public/appointments/by-token/${token}/cancel`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(
        j.error === "TOO_LATE"
          ? "Ya no se puede cancelar (fuera de plazo o cerrada)"
          : "No se pudo cancelar"
      );
      return;
    }
    setGone(true);
  }
  if (gone) return <p className="font-medium">Reserva cancelada.</p>;
  return (
    <div className="space-y-2">
      <button onClick={cancel} className="rounded border border-red-700 px-4 py-2 text-red-700">
        Cancelar esta reserva
      </button>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
    </div>
  );
}
