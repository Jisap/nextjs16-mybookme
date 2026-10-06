import Link from "next/link";

/* ─── SVG Icon helpers ────────────────────────────────────── */
const IconCalendar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconLink = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IconBell = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

/* ─── Data ────────────────────────────────────────────────── */
const features = [
  { icon: <IconLink />, title: "Tu enlace único", desc: "Obtén tu URL personalizada /book/tu-negocio lista para compartir desde el primer día." },
  { icon: <IconCalendar />, title: "Calendario inteligente", desc: "Solo se muestran los huecos realmente libres. Cero huecos dobles, cero llamadas de confirmación." },
  { icon: <IconBell />, title: "Recordatorios automáticos", desc: "Email de confirmación y recordatorio previo a la cita. Sin que muevas un dedo." },
  { icon: <IconUsers />, title: "Multi-profesional", desc: "Añade todos los profesionales de tu equipo con horarios y servicios propios." },
  { icon: <IconZap />, title: "Sin fricción para el cliente", desc: "Reservan sin crear cuenta. Solo nombre y contacto, y ya tienen su cita confirmada." },
  { icon: <IconShield />, title: "Sin pagos online", desc: "El cliente paga en tu local como siempre. Tú decides si cobras o no en el momento." },
];

const steps = [
  { n: "1", title: "Crea tu negocio", desc: "Regístrate, ponle nombre y te generamos tu URL y horario base en menos de 2 minutos." },
  { n: "2", title: "Configura", desc: "Añade servicios, profesionales y ajusta horarios desde el panel. Sin código, sin complicaciones." },
  { n: "3", title: "Comparte y gestiona", desc: "Comparte tu enlace. Recibe, confirma o cancela citas desde cualquier dispositivo." },
];

const clientSteps = [
  "Abren tu enlace, eligen servicio y profesional (o «cualquiera»).",
  "Seleccionan fecha y hora entre los huecos disponibles.",
  "Dejan su nombre y contacto, confirman y listo.",
  "Reciben email con confirmación, enlace al calendario y opción de cancelar.",
];

const stats = [
  { value: "2 min", label: "para estar operativo" },
  { value: "30 días", label: "de prueba gratis" },
  { value: "29$/mes", label: "sin permanencia" },
  { value: "∞", label: "reservas incluidas" },
];

/* ═══════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="page-dark">
      {/* Animated background mesh */}
      <div className="bg-mesh" aria-hidden="true" />

      {/* ── Navbar ── */}
      <header className="nav-glass sticky top-0 z-50">
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "3.75rem" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: "2rem", height: "2rem", borderRadius: "0.5rem",
                background: "linear-gradient(135deg, var(--brand-500), var(--accent-500))",
                color: "#fff", fontWeight: 800, fontSize: "1rem",
              }}>M</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>
                MyBook<span style={{ color: "hsl(252 95% 75%)" }}>Me</span>
              </span>
            </Link>
            <nav aria-label="Acceso principal" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link href="/login" className="btn-outline-glass" style={{ padding: "0.45rem 1.1rem", fontSize: "0.875rem" }}>Entrar</Link>
              <Link href="/onboarding" className="btn-glow" style={{ padding: "0.45rem 1.1rem", fontSize: "0.875rem" }}>Crear mi negocio</Link>
            </nav>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 5rem" }}>

        {/* ── Hero ── */}
        <section aria-labelledby="hero-h" style={{ textAlign: "center", padding: "6rem 0 4rem" }}>
          <div className="fade-up fade-up-1" style={{ marginBottom: "1.5rem" }}>
            <span className="pill"><IconStar /> 30 días gratis · Después solo 29$/mes</span>
          </div>
          <h1 id="hero-h" className="fade-up fade-up-2" style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 900,
            fontSize: "clamp(2.5rem, 6vw, 4.25rem)", lineHeight: 1.1,
            letterSpacing: "-0.02em", marginBottom: "1.5rem",
          }}>
            Reservas online para tu negocio,{" "}
            <span className="text-gradient">sin complicaciones</span>
          </h1>
          <p className="fade-up fade-up-3" style={{
            color: "var(--text-secondary)", fontSize: "clamp(1rem, 2vw, 1.2rem)",
            lineHeight: 1.65, maxWidth: "600px", margin: "0 auto 2.5rem",
          }}>
            Crea tu página de reservas en 2 minutos, comparte tu enlace y gestiona citas desde el panel.
            Tus clientes reservan sin crear cuenta y pagan en tu local, como siempre.
          </p>
          <div className="fade-up fade-up-4" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem", marginBottom: "2rem" }}>
            <Link href="/onboarding" className="btn-glow" style={{ fontSize: "1.05rem", padding: "0.875rem 2rem" }}>
              Crear mi negocio gratis <IconArrow />
            </Link>
            <Link href="/book/maria-nails" className="btn-outline-glass" style={{ fontSize: "1.05rem", padding: "0.875rem 2rem" }}>
              Ver demo de reserva
            </Link>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/dashboard" style={{ color: "hsl(252 95% 78%)", textDecoration: "none", fontWeight: 500 }}>Ir a mi panel →</Link>
          </p>
        </section>

        {/* ── Stats bar ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "5rem" }}>
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "2rem", color: "hsl(252 95% 78%)", lineHeight: 1, marginBottom: "0.4rem" }}>{s.value}</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Features grid ── */}
        <section aria-labelledby="features-h" style={{ marginBottom: "5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 id="features-h" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", marginBottom: "0.75rem" }}>
              Todo lo que necesitas,{" "}<span className="text-gradient">listo desde el primer día</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto" }}>
              Sin instalaciones, sin plugins, sin sorpresas. Todo integrado en un panel limpio.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {features.map((f) => (
              <div key={f.title} className="glass" style={{ padding: "1.75rem" }}>
                <div className="icon-wrap" style={{ color: "hsl(252 95% 78%)" }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>{f.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="divider-glow" style={{ marginBottom: "5rem" }} />

        {/* ── Steps (business) ── */}
        <section aria-labelledby="biz-h" style={{ marginBottom: "5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <span className="pill" style={{ marginBottom: "1rem", display: "inline-flex" }}>Para negocios</span>
            <h2 id="biz-h" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", marginBottom: "0.75rem" }}>
              En marcha en <span className="text-gradient">3 pasos</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            {steps.map((s) => (
              <div key={s.n} className="glass" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <span className="step-badge">{s.n}</span>
                  <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>{s.title}</h3>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <Link href="/onboarding" className="btn-glow">Empezar ahora <IconArrow /></Link>
            <Link href="/dashboard" className="btn-outline-glass">Ver mi panel</Link>
          </div>
        </section>

        <div className="divider-glow" style={{ marginBottom: "5rem" }} />

        {/* ── Client flow ── */}
        <section aria-labelledby="cli-h" style={{ marginBottom: "5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "3rem", alignItems: "center" }}>
            <div>
              <span className="pill" style={{ marginBottom: "1rem", display: "inline-flex" }}>Para tus clientes</span>
              <h2 id="cli-h" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", marginBottom: "1rem", lineHeight: 1.2 }}>
                Reservar es <span className="text-gradient">así de fácil</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.6 }}>
                Sin apps, sin contraseñas. En menos de un minuto tienen su cita confirmada.
              </p>
              <Link href="/book/maria-nails" className="btn-glow">Ver ejemplo real <IconArrow /></Link>
            </div>
            <div className="glass" style={{ padding: "2rem" }}>
              <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {clientSteps.map((step, i) => (
                  <li key={i} style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                    <span style={{
                      minWidth: "1.5rem", height: "1.5rem", borderRadius: "9999px",
                      background: "hsl(252 75% 57% / 0.2)", border: "1px solid hsl(252 75% 57% / 0.35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "hsl(252 95% 78%)", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</span>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.5 }}>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <div className="divider-glow" style={{ marginBottom: "5rem" }} />

        {/* ── Pricing ── */}
        <section aria-labelledby="pricing-h" style={{ marginBottom: "5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 id="pricing-h" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", marginBottom: "0.75rem" }}>
              Precios <span className="text-gradient">sin sorpresas</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "480px", margin: "0 auto" }}>
              Gratis para siempre si eres cliente que reserva. Para dueños de negocio, prueba sin compromiso.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", maxWidth: "780px", margin: "0 auto" }}>

            {/* Card clientes */}
            <div className="glass" style={{ padding: "2.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <span className="pill" style={{ marginBottom: "0.75rem", display: "inline-flex" }}>Para clientes</span>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2.75rem", lineHeight: 1, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                  0$
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Siempre gratis · Sin registro</p>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {["Reserva sin crear cuenta", "Confirmación por email", "Añadir al calendario", "Cancelación online"].map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    <span style={{ color: "hsl(252 95% 78%)" }}><IconCheck /></span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/book/maria-nails" className="btn-outline-glass" style={{ textAlign: "center", justifyContent: "center", marginTop: "auto" }}>Ver demo de reserva</Link>
            </div>

            {/* Card negocios — destacada */}
            <div className="glass" style={{
              padding: "2.25rem", display: "flex", flexDirection: "column", gap: "1.25rem",
              border: "1px solid hsl(252 75% 57% / 0.45)",
              boxShadow: "0 0 40px hsl(252 75% 57% / 0.15), 0 0 0 1px hsl(252 75% 57% / 0.2)",
              position: "relative", overflow: "hidden",
            }}>
              <div aria-hidden="true" style={{ position: "absolute", top: "-40px", right: "-40px", width: "180px", height: "180px", borderRadius: "9999px", background: "radial-gradient(circle, hsl(252 75% 57% / 0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
              {/* Más popular badge */}
              <span style={{
                position: "absolute", top: "1.25rem", right: "1.25rem",
                background: "linear-gradient(135deg, var(--brand-500), var(--accent-500))",
                color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.65rem",
                borderRadius: "9999px", letterSpacing: "0.04em", textTransform: "uppercase",
              }}>Más popular</span>
              <div>
                <span className="pill" style={{ marginBottom: "0.75rem", display: "inline-flex" }}>Para negocios</span>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", marginBottom: "0.1rem" }}>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "2.75rem", lineHeight: 1, color: "var(--text-primary)" }}>29$</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", paddingBottom: "0.35rem" }}>/mes</p>
                </div>
                <p style={{ color: "hsl(252 95% 78%)", fontSize: "0.85rem", fontWeight: 600 }}>30 días de prueba gratis · Sin tarjeta</p>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  "URL propia /book/tu-negocio",
                  "Servicios y profesionales ilimitados",
                  "Calendario de gestión de citas",
                  "Emails de confirmación y recordatorio",
                  "Sin comisiones por reserva",
                  "Cancela cuando quieras",
                ].map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    <span style={{ color: "hsl(252 95% 78%)" }}><IconCheck /></span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/onboarding" className="btn-glow" style={{ textAlign: "center", justifyContent: "center", marginTop: "auto" }}>
                Empezar prueba gratis <IconArrow />
              </Link>
              <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center", marginTop: "-0.5rem" }}>Sin permanencia · Cancela en cualquier momento</p>
            </div>

          </div>
        </section>

        <div className="divider-glow" style={{ marginBottom: "5rem" }} />

        {/* ── CTA final ── */}
        <section aria-labelledby="cta-h" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div className="glass" style={{ padding: "3.5rem 2rem", position: "relative", overflow: "hidden" }}>
            <div aria-hidden="true" style={{ position: "absolute", top: "-60px", right: "-60px", width: "300px", height: "300px", borderRadius: "9999px", background: "radial-gradient(circle, hsl(252 75% 57% / 0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div aria-hidden="true" style={{ position: "absolute", bottom: "-60px", left: "-60px", width: "250px", height: "250px", borderRadius: "9999px", background: "radial-gradient(circle, hsl(320 75% 55% / 0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
            <h2 id="cta-h" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "clamp(1.75rem, 4vw, 3rem)", marginBottom: "1rem", lineHeight: 1.15 }}>
              30 días gratis.{" "}
              <span className="text-gradient">Sin compromisos.</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "440px", margin: "0 auto 2.25rem", lineHeight: 1.6 }}>
              Prueba MyBookMe durante 30 días sin coste. Si te convence, sigue por solo 29$/mes. Si no, cancela sin preguntas.
            </p>
            <ul style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1.25rem", marginBottom: "2.25rem", listStyle: "none", padding: 0 }}>
              {["Sin tarjeta de crédito", "Configuración en 2 minutos", "Clientes sin cuenta", "Cancela cuando quieras"].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <span style={{ color: "hsl(252 95% 78%)" }}><IconCheck /></span> {item}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1rem" }}>
              <Link href="/onboarding" className="btn-glow" style={{ fontSize: "1.05rem", padding: "0.9rem 2.25rem" }}>
                Empezar prueba gratis <IconArrow />
              </Link>
              <Link href="/book/maria-nails" className="btn-outline-glass" style={{ fontSize: "1.05rem", padding: "0.9rem 2.25rem" }}>
                Probar la demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid hsl(240 15% 100% / 0.06)", padding: "2rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          © {new Date().getFullYear()} MyBookMe ·{" "}
          <Link href="/login" style={{ color: "hsl(252 95% 78%)", textDecoration: "none" }}>Entrar</Link>
          {" · "}
          <Link href="/onboarding" style={{ color: "hsl(252 95% 78%)", textDecoration: "none" }}>Crear negocio</Link>
        </p>
      </footer>
    </div>
  );
}
