"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function previewSlug(name: string) {
  const s = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return s || "tu-negocio";
}

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const effective = useMemo(() => slug.trim() || previewSlug(name), [slug, name]);

  async function submit() {
    setMsg("");
    if (name.trim().length < 2) {
      setMsg("Ponle un nombre a tu negocio (mínimo 2 caracteres).");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(
          j.error === "SLUG_TAKEN"
            ? "Ese enlace ya está ocupado, prueba con otro."
            : "No se pudo crear el negocio, inténtalo de nuevo."
        );
        return;
      }
      router.push(`/dashboard?businessId=${j.business.id}`);
    } catch {
      setMsg("Error de red, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos básicos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="ob-name">Nombre del negocio</Label>
          <Input
            id="ob-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Peluquería Ana"
            autoComplete="organization"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-slug">Enlace (opcional)</Label>
          <Input
            id="ob-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="mi-negocio"
            inputMode="url"
          />
          <p className="text-xs text-neutral-500" aria-live="polite">
            Tu página será: <code>/book/{effective}</code>
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ob-phone">Teléfono (opcional)</Label>
          <Input
            id="ob-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+34 600 000 000"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? "Creando…" : "Crear mi negocio"}
        </Button>
        {msg && (
          <p role="alert" className="text-sm text-red-700">
            {msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
