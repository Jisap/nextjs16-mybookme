"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ServiceItem {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  currency: string;
}

interface StaffItem {
  id: string;
  name: string;
}

export function CreateAppointmentModal({
  businessId,
  services,
  staffList,
}: {
  businessId: string;
  services: ServiceItem[];
  staffList: StaffItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [staffId, setStaffId] = useState(staffList[0]?.id || "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"CONFIRMED" | "PENDING">("CONFIRMED");

  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNotes("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!customerName.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }
    if (!serviceId) {
      setError("Selecciona un servicio.");
      return;
    }
    if (!staffId) {
      setError("Selecciona un profesional.");
      return;
    }

    setLoading(true);
    try {
      const startAt = new Date(`${date}T${time}:00`).toISOString();

      const res = await fetch("/api/dashboard/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId,
          staffId,
          startAt,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          customerEmail: customerEmail.trim() || null,
          notes: notes.trim() || null,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || "Error al crear la cita.");
        return;
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch {
      setError("Error de red al intentar crear la cita.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "hsl(252 75% 57%)",
          color: "#ffffff",
          boxShadow: "0 2px 8px hsl(252 75% 57% / 0.35)",
        }}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
      >
        <span className="text-base leading-none font-bold text-white">+</span>
        <span className="text-white">Nueva Cita</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-neutral-200 p-6 sm:p-7 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Añadir Cita Manual
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Registra citas recibidas por teléfono, WhatsApp o en el local.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service & Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Servicio *
                  </label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Profesional *
                  </label>
                  <select
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Hora de inicio *
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Customer Info */}
              <div className="border-t border-neutral-100 pt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block mb-2.5">
                  Datos del Cliente
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ej. Ana García"
                      required
                      className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Teléfono / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="600123456"
                        className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Email (opcional)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* State & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-neutral-100 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Estado inicial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "CONFIRMED" | "PENDING")}
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="CONFIRMED">Confirmada (recomendado)</option>
                    <option value="PENDING">Pendiente de confirmación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Notas internas
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. Prefiere tijera / llamará antes"
                    className="w-full p-2.5 text-xs sm:text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: "hsl(252 75% 57%)",
                    color: "#ffffff",
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Guardando…" : "Agendar Cita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
