"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ShareLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/book/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Enlace para clientes">
      <span className="text-neutral-500">Tus clientes reservan en:</span>
      <Link href={path} className="font-medium underline" target="_blank">
        {path}
      </Link>
      <Button variant="outline" size="sm" onClick={copy} type="button">
        {copied ? "¡Copiado!" : "Copiar enlace"}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado" : ""}
      </span>
    </div>
  );
}
