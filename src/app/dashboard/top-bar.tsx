"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TopBar({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 1.5rem", height: "3.5rem",
      background: "#fff",
      borderBottom: "1px solid hsl(220 15% 88%)",
      boxShadow: "0 1px 3px hsl(220 15% 15% / 0.06)",
      position: "sticky", top: 0, zIndex: 40,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
        aria-label="MyBookMe — ir al panel">
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: "1.75rem", height: "1.75rem", borderRadius: "0.4rem",
          background: "linear-gradient(135deg, hsl(252 75% 57%), hsl(320 75% 55%))",
          color: "#fff", fontWeight: 800, fontSize: "0.9rem",
        }}>M</span>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: "1rem", color: "hsl(220 15% 15%)" }}>
          MyBook<span style={{ color: "hsl(252 70% 55%)" }}>Me</span>
        </span>
      </Link>

      {/* Right side */}
      {email ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{
            maxWidth: "11rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontSize: "0.8rem", color: "hsl(220 10% 50%)",
          }} title={email}>{email}</span>
          <button
            onClick={signOut}
            style={{
              padding: "0.35rem 0.9rem", fontSize: "0.8rem", fontWeight: 500,
              border: "1px solid hsl(220 15% 85%)", borderRadius: "0.5rem",
              background: "#fff", cursor: "pointer", color: "hsl(220 15% 25%)",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "hsl(220 20% 96%)"; }}
            onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "#fff"; }}
          >
            Salir
          </button>
        </div>
      ) : (
        <Link href="/login" style={{
          padding: "0.35rem 0.9rem", fontSize: "0.8rem", fontWeight: 500,
          border: "1px solid hsl(220 15% 85%)", borderRadius: "0.5rem",
          background: "#fff", textDecoration: "none", color: "hsl(220 15% 25%)",
        }}>Entrar</Link>
      )}
    </header>
  );
}
