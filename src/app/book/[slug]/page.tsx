"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

/* ── Step indicator ── */
function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontWeight: 700,
          transition: "all .25s",
          background: done
            ? "hsl(252 75% 57%)"
            : active
            ? "hsl(252 75% 57%)"
            : "hsl(220 15% 88%)",
          color: done || active ? "#fff" : "hsl(220 10% 50%)",
          boxShadow: active ? "0 0 0 4px hsl(252 85% 92%)" : "none",
        }}
      >
        {done ? "✓" : n}
      </div>
      <span style={{ fontSize: "11px", color: active ? "hsl(252 70% 48%)" : "hsl(220 10% 55%)", fontWeight: active ? 600 : 400, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
    </div>
  );
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
  const [slotsLoading, setSlotsLoading] = useState(false);
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
    setSlotsLoading(true);
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
        setMsg(null);
      })
      .catch(() => setMsg({ ok: false, text: "No se pudo cargar disponibilidad" }))
      .finally(() => setSlotsLoading(false));
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
          website: "", // honeypot
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

  const selectedService = services.find((s) => s.id === serviceId);
  const stepsDone = [
    !!serviceId,
    !!slot,
    !!(name && (phone || email)),
  ];

  /* ── Confirmation screen ── */
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
      <div className="book-page">
        <style>{bookPageStyles}</style>
        <div className="book-bg-orb orb1" />
        <div className="book-bg-orb orb2" />

        <main className="book-main" style={{ maxWidth: "460px" }}>
          {/* Success header */}
          <div className="confirm-card">
            <div className="confirm-icon">✓</div>
            <h1 className="confirm-title">¡Reserva confirmada!</h1>
            <p className="confirm-sub">Te esperamos</p>

            <div className="confirm-details">
              <div className="confirm-row">
                <span className="confirm-icon-sm">🗓</span>
                <div>
                  <p className="confirm-label">Servicio</p>
                  <p className="confirm-value">{done.service}</p>
                </div>
              </div>
              <div className="confirm-row">
                <span className="confirm-icon-sm">📅</span>
                <div>
                  <p className="confirm-label">Fecha</p>
                  <p className="confirm-value" style={{ textTransform: "capitalize" }}>
                    {fmtDate(done.start, biz.timezone)}
                  </p>
                </div>
              </div>
              <div className="confirm-row">
                <span className="confirm-icon-sm">🕐</span>
                <div>
                  <p className="confirm-label">Hora</p>
                  <p className="confirm-value">{fmtTime(done.start, biz.timezone)}</p>
                </div>
              </div>
              <div className="confirm-row">
                <span className="confirm-icon-sm">📍</span>
                <div>
                  <p className="confirm-label">Negocio</p>
                  <p className="confirm-value">{biz.name}</p>
                  {(biz.phone || biz.address) && (
                    <p className="confirm-label">{[biz.address, biz.phone].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="confirm-notice">
              💳 Sin pagos online — pagarás directamente en el local.
            </div>

            {done.cancelToken && (
              <div className="confirm-actions">
                <a href={gUrl} target="_blank" rel="noopener" className="btn-cal btn-google">
                  <span>📅</span> Añadir a Google Calendar
                </a>
                <a href={oUrl} target="_blank" rel="noopener" className="btn-cal btn-outlook">
                  <span>📧</span> Añadir a Outlook
                </a>
                <a href={`/api/public/appointments/by-token/${done.cancelToken}/ics`} className="btn-cal btn-ics">
                  <span>⬇</span> Descargar archivo .ics
                </a>
                <Link href={`/book/cancel/${done.cancelToken}`} className="cancel-link">
                  Cancelar esta reserva
                </Link>
              </div>
            )}

            <button
              className="btn-primary w-full"
              style={{ marginTop: "8px" }}
              onClick={() => { setDone(null); setSlot(""); setMsg(null); }}
            >
              Hacer otra reserva
            </button>
          </div>
        </main>
      </div>
    );
  }

  /* ── Booking form ── */
  return (
    <div className="book-page">
      <style>{bookPageStyles}</style>
      <div className="book-bg-orb orb1" />
      <div className="book-bg-orb orb2" />

      <main className="book-main">
        {/* Header */}
        <header className="book-header">
          <div className="book-logo">{biz?.name?.[0] ?? "B"}</div>
          <h1 className="book-title">{biz?.name ?? "Reservar cita"}</h1>
          {biz?.description && <p className="book-desc">{biz.description}</p>}
          {(biz?.phone || biz?.address) && (
            <p className="book-meta">
              {[biz.address, biz.phone].filter(Boolean).join("  ·  ")}
            </p>
          )}
          {!biz && <p className="book-loading">Cargando negocio…</p>}
        </header>

        {/* Step tracker */}
        <div className="steps-bar">
          <StepDot n={1} label="Servicio" active={!stepsDone[0]} done={stepsDone[0]} />
          <div className="steps-line" />
          <StepDot n={2} label="Fecha y hora" active={stepsDone[0] && !stepsDone[1]} done={stepsDone[1]} />
          <div className="steps-line" />
          <StepDot n={3} label="Confirmar" active={stepsDone[1] && !stepsDone[2]} done={stepsDone[2]} />
        </div>

        {/* ── Step 1: Service & Staff ── */}
        <section className="book-card">
          <h2 className="section-title">
            <span className="step-badge">1</span> Elige tu servicio
          </h2>

          {services.length === 0 && biz ? (
            <p className="empty-state">Este negocio aún no ha publicado servicios.</p>
          ) : (
            <div className="service-grid">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={`service-card ${serviceId === s.id ? "service-card--active" : ""}`}
                >
                  <p className="service-name">{s.name}</p>
                  <p className="service-meta">
                    {s.durationMinutes} min · {(s.priceCents / 100).toFixed(2)} {s.currency}
                  </p>
                  {s.description && <p className="service-desc">{s.description}</p>}
                </button>
              ))}
            </div>
          )}

          {eligibleStaff.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <label className="field-label" htmlFor="book-staff">Profesional</label>
              <select
                id="book-staff"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="field-select"
              >
                <option value="any">Cualquiera disponible</option>
                {eligibleStaff.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* ── Step 2: Date & Time ── */}
        <section className="book-card">
          <h2 className="section-title">
            <span className="step-badge">2</span> Elige fecha y hora
          </h2>

          <div>
            <label className="field-label" htmlFor="book-date">Fecha</label>
            <input
              id="book-date"
              type="date"
              value={date}
              min={toYMD(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="field-input"
            />
          </div>

          <div style={{ marginTop: "16px" }}>
            <p className="field-label">
              Horas disponibles{" "}
              {slotsLoading && <span className="loading-badge">cargando…</span>}
            </p>
            {slots.length === 0 && !slotsLoading ? (
              <div className="no-slots">
                <span style={{ fontSize: "28px" }}>😔</span>
                <p>Sin huecos para ese día</p>
                <p style={{ fontSize: "13px", opacity: 0.7 }}>Prueba con otra fecha o profesional</p>
              </div>
            ) : (
              <div className="slots-grid" role="group" aria-label="Horas disponibles">
                {slots.map((s) => (
                  <button
                    key={s.start + (s.staffId ?? "")}
                    type="button"
                    onClick={() => setSlot(s.start)}
                    aria-pressed={slot === s.start}
                    className={`slot-pill ${slot === s.start ? "slot-pill--active" : ""}`}
                  >
                    {biz && fmtTime(s.start, biz.timezone)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {slot && biz && (
            <div className="slot-selected-banner">
              ✅ Hora seleccionada: <strong>{fmtTime(slot, biz.timezone)}</strong> —{" "}
              <span style={{ textTransform: "capitalize" }}>{fmtDate(slot, biz.timezone)}</span>
            </div>
          )}
        </section>

        {/* ── Step 3: Contact ── */}
        <section className="book-card">
          <h2 className="section-title">
            <span className="step-badge">3</span> Tus datos de contacto
          </h2>
          <p className="section-sub">Sin registro. Sin pagos online. Solo tu nombre y cómo avisarte.</p>

          <div className="fields-stack">
            <div>
              <label className="field-label" htmlFor="book-name">Nombre *</label>
              <input
                id="book-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
                autoComplete="name"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="book-phone">Teléfono</label>
              <input
                id="book-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                inputMode="tel"
                autoComplete="tel"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="book-email">Email (para confirmación)</label>
              <input
                id="book-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoComplete="email"
                className="field-input"
              />
            </div>
          </div>

          {msg && (
            <div className={`alert-msg ${msg.ok ? "alert-ok" : "alert-err"}`} role="alert">
              {msg.ok ? "✅" : "⚠️"} {msg.text}
            </div>
          )}

          <button
            onClick={submit}
            disabled={loading || !slot || !name || (!phone && !email)}
            className="btn-primary"
            style={{ width: "100%", marginTop: "8px" }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                <span className="spinner" /> Reservando…
              </span>
            ) : (
              "Confirmar reserva →"
            )}
          </button>

          <p className="legal-note">
            Al confirmar aceptas que el negocio guarde tus datos para gestionar tu cita.
            Sin pagos online. Puedes cancelar en cualquier momento.
          </p>
        </section>

        {/* Map (optional) */}
        {biz?.address && (
          <section className="book-card" style={{ padding: "0", overflow: "hidden" }}>
            <iframe
              title={`Mapa: ${biz.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(biz.address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ width: "100%", aspectRatio: "16/7", border: "none", display: "block" }}
            />
            <div style={{ padding: "12px 16px" }}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(biz.address)}`}
                target="_blank"
                rel="noopener"
                className="map-link"
              >
                📍 Cómo llegar en Google Maps →
              </a>
            </div>
          </section>
        )}

        <p className="powered-by">Reservas gestionadas con <strong>MyBookMe</strong></p>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Scoped styles — avoids polluting global CSS
══════════════════════════════════════════════ */
const bookPageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

  .book-page {
    font-family: 'Outfit', system-ui, sans-serif;
    min-height: 100vh;
    background: hsl(240 20% 97%);
    color: hsl(220 15% 15%);
    position: relative;
    overflow-x: hidden;
    padding: 32px 16px 80px;
  }

  .book-bg-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }
  .orb1 {
    width: 500px; height: 500px;
    top: -150px; left: -150px;
    background: hsl(252 75% 57% / 0.08);
  }
  .orb2 {
    width: 400px; height: 400px;
    bottom: -100px; right: -100px;
    background: hsl(320 70% 55% / 0.06);
  }

  .book-main {
    position: relative;
    z-index: 1;
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Header */
  .book-header {
    text-align: center;
    padding: 8px 0 4px;
  }
  .book-logo {
    width: 64px; height: 64px;
    border-radius: 20px;
    background: linear-gradient(135deg, hsl(252 75% 57%), hsl(320 70% 55%));
    color: #fff;
    font-size: 26px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    box-shadow: 0 8px 24px hsl(252 75% 57% / 0.3);
    text-transform: uppercase;
  }
  .book-title {
    font-size: clamp(22px, 5vw, 30px);
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: -0.02em;
    color: hsl(220 15% 12%);
  }
  .book-desc {
    font-size: 15px;
    color: hsl(220 10% 45%);
    margin: 0 0 4px;
    line-height: 1.5;
  }
  .book-meta {
    font-size: 13px;
    color: hsl(220 10% 55%);
    margin: 0;
  }
  .book-loading {
    font-size: 14px;
    color: hsl(220 10% 55%);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

  /* Step tracker */
  .steps-bar {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 0;
    padding: 4px 0;
  }
  .steps-line {
    flex: 1;
    height: 2px;
    background: hsl(220 15% 88%);
    margin-top: 15px;
    max-width: 60px;
  }

  /* Cards */
  .book-card {
    background: #fff;
    border: 1px solid hsl(220 15% 90%);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 2px 12px hsl(220 15% 60% / 0.08);
    transition: box-shadow .2s;
  }
  .book-card:hover {
    box-shadow: 0 4px 20px hsl(220 15% 60% / 0.13);
  }

  .section-title {
    font-size: 17px;
    font-weight: 700;
    color: hsl(220 15% 12%);
    margin: 0 0 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .step-badge {
    width: 26px; height: 26px;
    border-radius: 50%;
    background: hsl(252 75% 57%);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .section-sub {
    font-size: 13px;
    color: hsl(220 10% 50%);
    margin: -10px 0 16px;
  }

  /* Service cards */
  .service-grid {
    display: grid;
    gap: 10px;
  }
  .service-card {
    text-align: left;
    padding: 14px 16px;
    border: 2px solid hsl(220 15% 90%);
    border-radius: 12px;
    background: hsl(220 20% 98%);
    cursor: pointer;
    transition: all .18s;
  }
  .service-card:hover {
    border-color: hsl(252 75% 70%);
    background: hsl(252 85% 98%);
  }
  .service-card--active {
    border-color: hsl(252 75% 57%);
    background: hsl(252 85% 97%);
    box-shadow: 0 0 0 3px hsl(252 75% 57% / 0.15);
  }
  .service-name {
    font-size: 15px;
    font-weight: 600;
    color: hsl(220 15% 12%);
    margin: 0 0 3px;
  }
  .service-meta {
    font-size: 13px;
    color: hsl(252 70% 48%);
    font-weight: 500;
    margin: 0 0 3px;
  }
  .service-desc {
    font-size: 12px;
    color: hsl(220 10% 50%);
    margin: 0;
    line-height: 1.4;
  }

  /* Fields */
  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: hsl(220 15% 30%);
    margin-bottom: 6px;
    letter-spacing: 0.02em;
  }
  .field-input, .field-select {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid hsl(220 15% 88%);
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    background: #fff;
    color: hsl(220 15% 15%);
    transition: border-color .15s, box-shadow .15s;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }
  .field-input:focus, .field-select:focus {
    border-color: hsl(252 75% 57%);
    box-shadow: 0 0 0 3px hsl(252 75% 57% / 0.12);
  }
  .field-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%236b7280' d='M6 8L0 0h12z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
  }
  .fields-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 18px;
  }

  /* Time slots */
  .loading-badge {
    font-size: 11px;
    font-weight: 500;
    background: hsl(252 85% 95%);
    color: hsl(252 70% 48%);
    padding: 2px 8px;
    border-radius: 20px;
    animation: pulse 1.2s ease-in-out infinite;
  }
  .slots-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 8px;
  }
  @media (max-width: 400px) {
    .slots-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .slot-pill {
    padding: 9px 4px;
    border: 1.5px solid hsl(220 15% 88%);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    background: #fff;
    color: hsl(220 15% 20%);
    cursor: pointer;
    transition: all .15s;
    text-align: center;
  }
  .slot-pill:hover {
    border-color: hsl(252 75% 60%);
    background: hsl(252 85% 98%);
    color: hsl(252 70% 45%);
  }
  .slot-pill--active {
    background: hsl(252 75% 57%);
    border-color: hsl(252 75% 57%);
    color: #fff;
    box-shadow: 0 2px 10px hsl(252 75% 57% / 0.35);
  }
  .no-slots {
    text-align: center;
    padding: 28px 16px;
    color: hsl(220 10% 50%);
    font-size: 15px;
    border: 2px dashed hsl(220 15% 88%);
    border-radius: 12px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
  }
  .slot-selected-banner {
    margin-top: 14px;
    padding: 10px 14px;
    background: hsl(148 60% 95%);
    border: 1px solid hsl(148 60% 80%);
    border-radius: 10px;
    font-size: 13px;
    color: hsl(148 50% 30%);
  }

  /* Buttons */
  .btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 13px 24px;
    background: linear-gradient(135deg, hsl(252 75% 57%), hsl(252 70% 48%));
    color: #fff;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all .2s;
    box-shadow: 0 4px 14px hsl(252 75% 57% / 0.3);
    letter-spacing: 0.01em;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px hsl(252 75% 57% / 0.4);
  }
  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }
  .btn-primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
  .w-full { width: 100%; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Alerts */
  .alert-msg {
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 14px;
    margin-bottom: 12px;
  }
  .alert-ok {
    background: hsl(148 60% 95%);
    color: hsl(148 50% 28%);
    border: 1px solid hsl(148 60% 80%);
  }
  .alert-err {
    background: hsl(0 80% 96%);
    color: hsl(0 65% 38%);
    border: 1px solid hsl(0 70% 87%);
  }

  /* Legal */
  .legal-note {
    font-size: 11.5px;
    color: hsl(220 10% 55%);
    margin-top: 10px;
    text-align: center;
    line-height: 1.5;
  }
  .empty-state {
    font-size: 14px;
    color: hsl(220 10% 50%);
    padding: 16px 0;
  }

  /* Map */
  .map-link {
    font-size: 13px;
    color: hsl(252 70% 48%);
    text-decoration: none;
    font-weight: 500;
  }
  .map-link:hover {
    text-decoration: underline;
  }

  /* Powered by */
  .powered-by {
    text-align: center;
    font-size: 12px;
    color: hsl(220 10% 60%);
    padding-top: 8px;
  }
  .powered-by strong {
    color: hsl(252 70% 48%);
  }

  /* ── Confirmation screen ── */
  .confirm-card {
    background: #fff;
    border: 1px solid hsl(220 15% 90%);
    border-radius: 20px;
    padding: 32px 28px;
    box-shadow: 0 8px 40px hsl(220 15% 60% / 0.1);
    text-align: center;
  }
  .confirm-icon {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, hsl(148 65% 45%), hsl(160 60% 38%));
    color: #fff;
    font-size: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    box-shadow: 0 8px 24px hsl(148 60% 40% / 0.35);
  }
  .confirm-title {
    font-size: 26px;
    font-weight: 700;
    color: hsl(220 15% 10%);
    margin: 0 0 4px;
    letter-spacing: -0.02em;
  }
  .confirm-sub {
    font-size: 15px;
    color: hsl(220 10% 50%);
    margin: 0 0 24px;
  }
  .confirm-details {
    background: hsl(220 20% 97%);
    border-radius: 14px;
    padding: 16px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 16px;
  }
  .confirm-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .confirm-icon-sm {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .confirm-label {
    font-size: 11px;
    font-weight: 600;
    color: hsl(220 10% 55%);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 2px;
  }
  .confirm-value {
    font-size: 15px;
    font-weight: 600;
    color: hsl(220 15% 12%);
    margin: 0;
  }
  .confirm-notice {
    background: hsl(45 90% 96%);
    border: 1px solid hsl(45 80% 85%);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: hsl(40 60% 35%);
    margin-bottom: 20px;
  }
  .confirm-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
  .btn-cal {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    font-family: inherit;
    transition: all .18s;
  }
  .btn-google {
    background: hsl(220 85% 95%);
    color: hsl(220 70% 40%);
    border: 1px solid hsl(220 70% 85%);
  }
  .btn-google:hover { background: hsl(220 85% 90%); }
  .btn-outlook {
    background: hsl(210 80% 95%);
    color: hsl(210 70% 38%);
    border: 1px solid hsl(210 70% 85%);
  }
  .btn-outlook:hover { background: hsl(210 80% 90%); }
  .btn-ics {
    background: hsl(220 15% 95%);
    color: hsl(220 15% 35%);
    border: 1px solid hsl(220 15% 88%);
  }
  .btn-ics:hover { background: hsl(220 15% 90%); }
  .cancel-link {
    display: block;
    font-size: 13px;
    color: hsl(0 65% 50%);
    text-decoration: underline;
    padding: 4px 0;
  }
  .cancel-link:hover { color: hsl(0 65% 40%); }
`;
