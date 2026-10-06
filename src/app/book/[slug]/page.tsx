"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { googleCalendarUrl, outlookCalendarUrl } from "@/features/booking/calendar-links";

interface Staff {
  id: string;
  name: string;
}
interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  currency: string;
  staffIds: string[];
}
interface Slot {
  start: string;
  end: string;
  staffId?: string;
  staffIds?: string[];
}
interface Biz {
  name: string;
  timezone: string;
  description: string | null;
  phone: string | null;
  address: string | null;
}

function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}
function fmtDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(new Date(iso));
}
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [biz, setBiz] = useState<Biz | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("any");
  const [date, setDate] = useState(() => toYMD(new Date(Date.now() + 86400000)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<{
    service: string;
    start: string;
    end: string;
    cancelToken: string;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/public/${slug}/services`)
      .then((r) => r.json())
      .then((j) => {
        setBiz(j.business);
        setServices(j.services ?? []);
        setStaff(j.staff ?? []);
        if (j.services?.[0]) setServiceId(j.services[0].id);
      })
      .catch(() => setMsg({ ok: false, text: "No se pudo cargar el negocio" }));
  }, [slug]);

  const eligibleStaff = useMemo(() => {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return staff;
    return staff.filter((st) => svc.staffIds.includes(st.id));
  }, [services, staff, serviceId]);

  useEffect(() => {
    if (!serviceId || !date) return;
    setLoading(true);
    fetch(`/api/public/${slug}/availability?serviceId=${serviceId}&date=${date}&staffId=${staffId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error === "TRIAL_EXPIRED") {
          setSlots([]);
          setSlot("");
          setMsg({
            ok: false,
            text: "Este negocio no está aceptando reservas ahora mismo. Contacta directamente con ellos.",
          });
          return;
        }
        setSlots(j.slots ?? []);
        setSlot("");
      })
      .catch(() => setMsg({ ok: false, text: "No se pudo cargar disponibilidad" }))
      .finally(() => setLoading(false));
  }, [slug, serviceId, date, staffId]);

  async function submit() {
    setMsg(null);
    if (!slot || !name || (!phone && !email)) {
      setMsg({ ok: false, text: "Elige hora e indica nombre y teléfono o email" });
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`/api/public/${slug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffId,
          startAt: slot,
          name,
          phone: phone || undefined,
          email: email || undefined,
          idempotencyKey: crypto.randomUUID(),
          website: "", // honeypot: humano vacío, bot lo rellena y el backend finge éxito
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({
          ok: false,
          text:
            j.error === "SLOT_TAKEN"
              ? "Ese hueco se acaba de ocupar, elige otro"
              : j.error === "TRIAL_EXPIRED"
                ? "Este negocio no está aceptando reservas ahora mismo. Contacta directamente con ellos."
                : "No se pudo reservar",
        });
        // refresca slots tras 409
        if (j.error === "SLOT_TAKEN") {
          const av = await fetch(
            `/api/public/${slug}/availability?serviceId=${serviceId}&date=${date}&staffId=${staffId}`
          ).then((x) => x.json());
          setSlots(av.slots ?? []);
          setSlot("");
        }
        return;
      }
      const svc = services.find((s) => s.id === serviceId);
      setDone({
        service: svc?.name ?? "",
        start: j.appointment?.startAt ?? slot,
        end: j.appointment?.endAt ?? slot,
        cancelToken: j.appointment?.cancelToken ?? "",
      });
    } finally {
      setLoading(false);
    }
  }

  if (done && biz) {
    const calEvent = {
      title: `${done.service} - ${biz.name}`,
      details: `Reserva en ${biz.name} con ${name}`,
      location: [biz.address, biz.phone].filter(Boolean).join(" · ") || biz.name,
      start: new Date(done.start),
      end: new Date(done.end),
    };
    const gUrl = googleCalendarUrl(calEvent);
    const oUrl = outlookCalendarUrl(calEvent);
    return (
      <div className="page-light min-h-screen py-8 px-4">
        <main className="mx-auto max-w-md space-y-4">
          <Card className="shadow-lg border-neutral-200">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                ✓
              </div>
              <CardTitle className="text-2xl font-bold">¡Reserva confirmada!</CardTitle>
            </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-medium" aria-live="polite">
              {done.service}
            </p>
            <p className="capitalize">{fmtDate(done.start, biz.timezone)}</p>
            <p>{fmtTime(done.start, biz.timezone)}</p>
            <p className="mt-2 text-sm text-neutral-600">
              {biz.name} · {name}
            </p>
            <p className="rounded bg-neutral-100 p-2 text-sm">
              Sin pagos online: pagarás en el local cuando vayas a tu cita.
            </p>
            {(biz.phone || biz.address) && (
              <p className="text-sm text-neutral-600">
                {[biz.address, biz.phone].filter(Boolean).join(" · ")}
              </p>
            )}
            {done.cancelToken && (
              <div className="space-y-2 pt-2">
                <Button asChild className="w-full">
                  <a href={gUrl} target="_blank" rel="noopener">
                    Añadir a Google Calendar
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={oUrl} target="_blank" rel="noopener">
                    Añadir a Outlook
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={`/api/public/appointments/by-token/${done.cancelToken}/ics`}>
                    Descargar archivo (.ics)
                  </a>
                </Button>
                <div className="text-center text-sm">
                  <Link href={`/book/cancel/${done.cancelToken}`} className="underline">
                    Cancelar reserva
                  </Link>
                </div>
              </div>
            )}
            <div className="space-y-2 pt-2">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setDone(null);
                  setSlot("");
                  setMsg(null);
                }}
              >
                Hacer otra reserva
              </Button>
              <div className="text-center text-sm">
                <Link href="/" className="underline text-brand-600 hover:text-brand-700">
                  Volver al inicio
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    );
  }

  return (
    <div className="page-light min-h-screen py-8 px-4 sm:px-6">
      <main className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2 text-center pb-2">
        <h1 className="text-2xl font-bold text-balance">{biz?.name ?? "Reservar"}</h1>
        {biz?.description && <p className="text-sm text-neutral-600">{biz.description}</p>}
        {(biz?.phone || biz?.address) && (
          <p className="text-sm text-neutral-500">
            {[biz.address, biz.phone].filter(Boolean).join(" · ")}
          </p>
        )}
        {biz?.address && (
          <div className="space-y-1">
            <iframe
              title={`Mapa: ${biz.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(biz.address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="aspect-video w-full rounded-md border"
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.address)}`}
              target="_blank"
              rel="noopener"
              className="text-sm underline"
            >
              Cómo llegar en Google Maps
            </a>
          </div>
        )}
        {!biz && (
          <p aria-live="polite" className="text-sm text-neutral-500">
            Cargando servicios…
          </p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-neutral-700">
          <p>1. Elige servicio, profesional, fecha y hora libre.</p>
          <p>2. Deja tu nombre y teléfono o email, y confirma.</p>
          <p>3. Recibirás la confirmación por email, con opción de cancelar si lo necesitas.</p>
          <p className="rounded bg-neutral-100 p-2">
            El pago se hace en el local, no aquí: reserva gratis y sin crear cuenta.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-1">
        <Label htmlFor="book-service" className="block text-base font-semibold">
          1. Servicio
        </Label>
        {services.length === 0 && biz ? (
          <p className="text-sm text-neutral-600">
            Este negocio aún no ha publicado servicios. Vuelve a intentarlo más tarde.
          </p>
        ) : (
          <select
            id="book-service"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMinutes} min · {(s.priceCents / 100).toFixed(2)} {s.currency}
              </option>
            ))}
          </select>
        )}
        {services.find((s) => s.id === serviceId)?.description && (
          <p className="text-sm text-neutral-600">
            {services.find((s) => s.id === serviceId)?.description}
          </p>
        )}
      </section>

      <section className="space-y-1">
        <Label htmlFor="book-staff" className="block text-base font-semibold">
          2. Profesional
        </Label>
        <select
          id="book-staff"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <option value="any">Cualquiera</option>
          {eligibleStaff.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-1">
        <Label htmlFor="book-date" className="block text-base font-semibold">
          3. Fecha
        </Label>
        <Input id="book-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </section>

      <section aria-labelledby="hora-h" aria-busy={loading} className="space-y-2">
        <h2 id="hora-h" className="text-base font-semibold">
          4. Hora{" "}
          {loading && (
            <span className="font-normal" role="status">
              (cargando…)
            </span>
          )}
        </h2>
        {slots.length === 0 && !loading && (
          <p className="text-sm text-neutral-600">Sin huecos ese día, prueba otra fecha.</p>
        )}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Horas disponibles">
          {slots.map((s) => (
            <button
              key={s.start + (s.staffId ?? "")}
              type="button"
              onClick={() => setSlot(s.start)}
              aria-pressed={slot === s.start}
              className={`rounded border p-2 ${slot === s.start ? "border-black bg-gray-900 text-white" : ""}`}
            >
              {biz && fmtTime(s.start, biz.timezone)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="datos-h">
        <h2 id="datos-h" className="text-base font-semibold">
          5. Tus datos
        </h2>
        <div className="space-y-1">
          <Label htmlFor="book-name">Nombre</Label>
          <Input
            id="book-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre"
            autoComplete="name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="book-phone">Teléfono</Label>
          <Input
            id="book-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="book-email">Email (para confirmación)</Label>
          <Input
            id="book-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (para confirmación)"
            type="email"
            autoComplete="email"
          />
        </div>
        <Button onClick={submit} disabled={loading || !slot} className="w-full">
          {loading ? "Reservando…" : "Confirmar reserva"}
        </Button>
        <p className="text-xs text-neutral-500">
          Al confirmar aceptas que el negocio guarde tus datos para gestionar tu cita. Sin pagos
          online.
        </p>
        {msg && (
          <p role="alert" className={msg.ok ? "text-green-700" : "text-red-700"}>
            {msg.text}
          </p>
        )}
      </section>
    </main>
  </div>
  );
}
