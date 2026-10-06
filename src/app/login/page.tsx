"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  function valid() {
    if (!email.trim() || !password) {
      setMsg("Escribe email y contraseña (6+ caracteres) antes de continuar.");
      setIsError(true);
      return false;
    }
    return true;
  }

  async function signIn() {
    setMsg("");
    setIsError(false);
    if (!valid()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMsg(error.message);
        setIsError(true);
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setMsg("");
    setIsError(false);
    if (!valid()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        setMsg(error.message);
        setIsError(true);
      } else {
        setMsg("¡Cuenta creada! Ya puedes iniciar sesión. Si requiere confirmación, revisa tu correo.");
        setIsError(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-dark bg-mesh min-h-screen flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[350px] rounded-full blur-[100px] opacity-40"
        style={{ background: "radial-gradient(circle, hsl(252 87% 64%), hsl(280 84% 60%))" }}
      />
      <div 
        className="pointer-events-none absolute -bottom-20 right-10 w-[300px] h-[300px] rounded-full blur-[90px] opacity-25"
        style={{ background: "hsl(187 92% 55%)" }}
      />

      {/* Top bar / Back button */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-[hsl(240_10%_70%)] hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al inicio
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
            M
          </div>
          <span className="font-bold text-base tracking-tight text-white hidden sm:inline" style={{ fontFamily: "Outfit, sans-serif" }}>
            MyBook<span className="text-brand-400">Me</span>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-8">
        <div className="glass rounded-3xl p-7 sm:p-9 shadow-2xl relative border border-white/10 backdrop-blur-2xl">
          {/* Card Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-accent-500/20 border border-brand-500/30 text-brand-300 mb-4 shadow-inner">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
              Bienvenido de nuevo
            </h1>
            <p className="text-sm text-[hsl(240_10%_70%)] mt-2">
              Inicia sesión o crea tu cuenta para gestionar tus citas
            </p>
          </div>

          {/* Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              signIn();
            }}
            className="space-y-4"
          >
            <div>
              <label 
                htmlFor="email" 
                className="block text-xs font-semibold uppercase tracking-wider text-[hsl(240_10%_75%)] mb-1.5"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@negocio.com"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(240_18%_11%)] border border-white/10 text-white placeholder-[hsl(240_8%_45%)] text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-semibold uppercase tracking-wider text-[hsl(240_10%_75%)]"
                >
                  Contraseña
                </label>
                <span className="text-[11px] text-[hsl(240_10%_55%)]">Mínimo 6 caracteres</span>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[hsl(240_18%_11%)] border border-white/10 text-white placeholder-[hsl(240_8%_45%)] text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            {/* Status / Error Message */}
            {msg && (
              <div 
                className={`text-xs p-3.5 rounded-xl border flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  isError
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                }`}
              >
                <span className="text-base leading-none mt-0.5">{isError ? "⚠️" : "✓"}</span>
                <span className="flex-1 leading-relaxed">{msg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-glow w-full py-3.5 px-4 rounded-xl font-semibold text-sm text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando…
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-xs text-[hsl(240_10%_50%)]">o si eres nuevo</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={signUp}
                disabled={loading}
                className="btn-outline-glass w-full py-3 px-4 rounded-xl font-medium text-sm text-white/90 hover:text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Crear cuenta de negocio
              </button>
            </div>
          </form>

          {/* Trial Notice */}
          <div className="mt-6 pt-5 border-t border-white/5 text-center">
            <p className="text-xs text-[hsl(240_10%_60%)] flex items-center justify-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              30 días de prueba gratis · Sin tarjeta obligatoria
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-xs text-[hsl(240_10%_50%)]">
        © {new Date().getFullYear()} MyBookMe. Todos los derechos reservados.
      </footer>
    </div>
  );
}
