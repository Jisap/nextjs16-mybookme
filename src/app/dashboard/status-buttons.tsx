"use client";

import { useState } from "react";

const ACTIONS: {
  label: string;
  status: string;
  className: string;
}[] = [
  { 
    label: "Confirmar", 
    status: "CONFIRMED", 
    className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200" 
  },
  { 
    label: "Completar", 
    status: "COMPLETED", 
    className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200" 
  },
  { 
    label: "Cancelar", 
    status: "CANCELLED", 
    className: "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200" 
  },
  { 
    label: "No vino", 
    status: "NO_SHOW", 
    className: "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200" 
  },
];

export function StatusButtons({ 
  id, 
  currentStatus,
  customerPhone,
  customerName,
  serviceName,
  startTime
}: { 
  id: string;
  currentStatus?: string;
  customerPhone?: string | null;
  customerName?: string;
  serviceName?: string;
  startTime?: string;
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function patch(status: string) {
    if (loading) return;
    setMsg("");
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }

  function openWhatsApp() {
    if (!customerPhone) return;
    // Remove characters that aren't numbers or +
    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    const msg = encodeURIComponent(`¡Hola ${customerName || ""}! Te contactamos de tu reserva para ${serviceName || "tu cita"}${startTime ? ` a las ${startTime}` : ""}.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {ACTIONS.filter(a => a.status !== currentStatus).map((a) => (
        <button
          key={a.status}
          onClick={() => patch(a.status)}
          disabled={loading}
          type="button"
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${a.className}`}
        >
          {a.label}
        </button>
      ))}

      {customerPhone && (
        <button
          type="button"
          onClick={openWhatsApp}
          title={`Contactar a ${customerName || "cliente"} por WhatsApp`}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors ml-auto cursor-pointer"
        >
          <span className="text-xs">💬</span>
          <span>WhatsApp</span>
        </button>
      )}

      {msg && <span className="text-xs text-rose-600 block w-full mt-1">{msg}</span>}
    </div>
  );
}
