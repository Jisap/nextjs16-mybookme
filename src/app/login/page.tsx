"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  function valid() {
    if (!email.trim() || !password) {
      setMsg("Escribe email y contraseña (6+ caracteres) antes de pulsar.");
      return false;
    }
    return true;
  }

  async function signIn() {
    setMsg("");
    if (!valid()) return;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setMsg(error.message);
    else window.location.href = "/dashboard";
  }

  async function signUp() {
    setMsg("");
    if (!valid()) return;
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setMsg(error ? error.message : "Cuenta creada, ya puedes entrar. Si pide confirmar email, revísalo.");
  }

  return (
    <main className="mx-auto max-w-sm space-y-3 p-6">
      <h1 className="text-xl font-bold">Entrar al panel</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="w-full rounded border p-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" type="password" className="w-full rounded border p-2" />
      <button onClick={signIn} className="w-full rounded bg-black p-3 text-white">
        Entrar
      </button>
      <button onClick={signUp} className="w-full rounded border p-3">
        Crear cuenta
      </button>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </main>
  );
}
