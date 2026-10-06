"use client";

import { use, useEffect, useMemo, useState } from "react";

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

function fmtTime(iso: string, tz: string) {
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}
function fmtDate(iso: string, tz: string) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date(iso));
}
function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [biz, setBiz] = useState<{ name: string; timezone: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("any");
  const [date, setDate] = useState(() => toYMD(new Date(Date.now() + 86400000)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<{ service: string; start: string; cancelToken: string } | null>(null);

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
        setSlots(j.slots ?? []);
        setSlot("");
      })
      .catch(() => setMsg({ ok: false, text: "No se pudo cargar disponibilidad" }))
      .finally(() => setLoading(false));
  }, [slug, serviceId, date, staffId]);

  async function submit() {
    setMsg(null);
    if (!slot || !name || !phone) {
      setMsg({ ok: false, text: "Elige hora e indica nombre y teléfono" });
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
          phone,
          idempotencyKey: crypto.randomUUID(),
          website: "", // honeypot: humano vacío, bot lo rellena y el backend finge éxito
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg({ ok: false, text: j.error === "SLOT_TAKEN" ? "Ese hueco se acaba de ocupar, elige otro" : "No se pudo reservar" });
        // refresca slots tras 409
        if (j.error === "SLOT_TAKEN") {
          const av = await fetch(`/api/public/${slug}/availability?serviceId=${serviceId}&date=${date}&staffId=${staffId}`).then((x) => x.json());
          setSlots(av.slots ?? []);
          setSlot("");
        }
        return;
      }
      const svc = services.find((s) => s.id === serviceId);
      setDone({ service: svc?.name ?? "", start: j.appointment?.startAt ?? slot, cancelToken: j.appointment?.cancelToken ?? "" });
    } finally {
      setLoading(false);
    }
  }

  if (done && biz) {
    return (
      <main className="mx-auto max-w-md space-y-2 p-6">
        <h1 className="text-2xl font-bold">¡Reserva confirmada!</h1>
        <p className="mt-4">{done.service}</p>
        <p className="capitalize">{fmtDate(done.start, biz.timezone)}</p>
        <p>{fmtTime(done.start, biz.timezone)}</p>
        <p className="mt-2 text-sm text-gray-600">{biz.name} · {name}</p>
        {done.cancelToken && (
          <div className="space-y-2 pt-2">
            <a
              href={`/api/public/appointments/by-token/${done.cancelToken}/ics`}
              className="block rounded bg-black p-3 text-center text-white"
            >
              Añadir al calendario
            </a>
            <a href={`/book/cancel/${done.cancelToken}`} className="block text-center text-sm underline">
              Cancelar reserva
            </a>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-5 p-4 pb-16">
      <header>
        <h1 className="text-xl font-bold">{biz?.name ?? "Reservar"}</h1>
        <p className="text-sm text-gray-600">Elige servicio, profesional, fecha y hora. Sin crear cuenta.</p>
      </header>

      <section>
        <h2 className="mb-1 text-sm font-semibold">1. Servicio</h2>
        <div className="grid gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`rounded border p-3 text-left ${serviceId === s.id ? "border-black bg-gray-50" : ""}`}
            >
              <div className="font-medium">{s.name} · {s.durationMinutes} min</div>
              <div className="text-sm text-gray-600">{(s.priceCents / 100).toFixed(2)} {s.currency}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">2. Profesional</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setStaffId("any")} className={`rounded border px-3 py-2 ${staffId === "any" ? "border-black bg-gray-50" : ""}`}>
            Cualquiera
          </button>
          {eligibleStaff.map((st) => (
            <button key={st.id} onClick={() => setStaffId(st.id)} className={`rounded border px-3 py-2 ${staffId === st.id ? "border-black bg-gray-50" : ""}`}>
              {st.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">3. Fecha</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded border p-2" />
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">4. Hora {loading && <span className="font-normal">(cargando…)</span>}</h2>
        {slots.length === 0 && !loading && <p className="text-sm text-gray-600">Sin huecos ese día, prueba otra fecha.</p>}
        <div className="grid grid-cols-3 gap-2">
          {slots.map((s) => (
            <button
              key={s.start + (s.staffId ?? "")}
              onClick={() => setSlot(s.start)}
              className={`rounded border p-2 ${slot === s.start ? "border-black bg-gray-900 text-white" : ""}`}
            >
              {biz && fmtTime(s.start, biz.timezone)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">5. Tus datos</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="w-full rounded border p-2" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" inputMode="tel" className="w-full rounded border p-2" />
        <button onClick={submit} disabled={loading || !slot} className="w-full rounded bg-black p-3 text-white disabled:opacity-40">
          Confirmar reserva
        </button>
        {msg && <p className={msg.ok ? "text-green-700" : "text-red-700"}>{msg.text}</p>}
      </section>
    </main>
  );
}
