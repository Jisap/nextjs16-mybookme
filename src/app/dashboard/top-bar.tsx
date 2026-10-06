"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function TopBar({ email }: { email: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b px-4 py-2">
      <Link href="/" className="font-bold" aria-label="MyBookMe inicio">
        MyBookMe
      </Link>
      {email ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="max-w-44 truncate text-neutral-600" title={email}>
            {email}
          </span>
          <Button variant="outline" size="sm" onClick={signOut}>
            Salir
          </Button>
        </div>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Entrar</Link>
        </Button>
      )}
    </header>
  );
}
