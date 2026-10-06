"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      setMsg({ ok: false, text: "El nombre necesita mínimo 2 caracteres." });
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
          ? { ok: true, text: "Datos actualizados. Ya se ven en tu página de reservas." }
          : { ok: false, text: "No se pudo guardar." }
      );
    } catch {
      setMsg({ ok: false, text: "Error de red, inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos públicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-500">
          Esto es lo que ven tus clientes en <code>/book/{slug}</code> (el enlace no se puede
          cambiar).
        </p>
        <div className="space-y-1">
          <Label htmlFor="biz-name">Nombre</Label>
          <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="biz-desc">Descripción</Label>
          <textarea
            id="biz-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Peluquería de barrio: corte, color y peinados."
            rows={3}
            maxLength={500}
            className="flex min-h-20 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="biz-phone">Teléfono</Label>
          <Input
            id="biz-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="biz-address">Dirección</Label>
          <Input
            id="biz-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle, número, ciudad"
            autoComplete="street-address"
          />
        </div>
        <Button onClick={submit} disabled={loading}>
          {loading ? "Guardando…" : "Guardar"}
        </Button>
        {msg && (
          <p
            role={msg.ok ? "status" : "alert"}
            className={msg.ok ? "text-green-700" : "text-red-700"}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
