"use client";

import { useState } from "react";
import Link from "next/link";

export function BusinessForm({
  businessId,
  slug,
  initial,
}: {
  businessId: string;
  slug: string;
  initial: { name: string; description: string; phone: string; address: string };
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [phone, setPhone] = useState(initial.phone);
  const [address, setAddress] = useState(initial.address);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg(null);
    if (name.trim().length < 2) {
      setMsg({ ok: false, text: "El nombre necesita un mínimo de 2 caracteres." });
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: name.trim(),
          description: description.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });
      setMsg(
        r.ok
          ? { ok: true, text: "Datos actualizados correctamente. Ya son visibles en tu página pública." }
          : { ok: false, text: "No se pudieron guardar los cambios." }
      );
    } catch {
      setMsg({ ok: false, text: "Error de red al guardar, inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs max-w-2xl">
      <div className="border-b border-neutral-100 pb-4 mb-5">
        <h2 className="text-lg font-bold text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Perfil Público y Contacto
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Información visible para los clientes que visiten tu página de reservas en{" "}
          <Link href={`/book/${slug}`} target="_blank" className="font-semibold text-brand-600 hover:underline">
            /book/{slug}
          </Link>
          .
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="biz-name" className="block text-xs font-semibold text-neutral-700 mb-1">
            Nombre Comercial *
          </label>
          <input
            id="biz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label htmlFor="biz-desc" className="block text-xs font-semibold text-neutral-700 mb-1">
            Descripción o Presentación
          </label>
          <textarea
            id="biz-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Peluquería y barbería de autor: cortes, tintes y cuidado personal."
            rows={3}
            maxLength={500}
            className="w-full px-3.5 py-2 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="biz-phone" className="block text-xs font-semibold text-neutral-700 mb-1">
              Teléfono de Contacto
            </label>
            <input
              id="biz-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 600 000 000"
              inputMode="tel"
              autoComplete="tel"
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label htmlFor="biz-address" className="block text-xs font-semibold text-neutral-700 mb-1">
              Dirección Física
            </label>
            <input
              id="biz-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle Mayor 12, Madrid"
              autoComplete="street-address"
              className="w-full px-3.5 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:bg-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {msg && (
          <div
            role={msg.ok ? "status" : "alert"}
            className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
              msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <span>{msg.ok ? "✓" : "⚠️"}</span>
            <span>{msg.text}</span>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            style={{ background: "hsl(252 75% 57%)", color: "#fff" }}
            className="py-2.5 px-6 rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
