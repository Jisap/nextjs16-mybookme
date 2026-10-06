"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMsg(error.message);
      else router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function signUp() {
    setMsg("");
    if (!valid()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      setMsg(
        error
          ? error.message
          : "Cuenta creada, ya puedes entrar. Si pide confirmar email, revísalo."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm space-y-3 p-6">
      <p className="text-sm">
        <Link href="/" className="underline">
          ← Volver al inicio
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Entrar al panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              type="password"
              autoComplete="current-password"
            />
          </div>
          <Button onClick={signIn} disabled={loading} className="w-full">
            {loading ? "Entrando…" : "Entrar"}
          </Button>
          <Button onClick={signUp} disabled={loading} variant="outline" className="w-full">
            Crear cuenta
          </Button>
          {msg && <p className="text-sm text-neutral-700">{msg}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
