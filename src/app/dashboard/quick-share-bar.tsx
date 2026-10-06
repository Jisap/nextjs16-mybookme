"use client";

import { useState } from "react";
import Link from "next/link";

export function QuickShareBar({ slug, businessName }: { slug: string; businessName: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/book/${slug}`;

  async function copyLink() {
    try {
      const fullUrl = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  function shareWhatsApp() {
    const fullUrl = `${window.location.origin}${path}`;
    const text = encodeURIComponent(`¡Hola! Reserva tu cita online en ${businessName} de forma rápida aquí: ${fullUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:border-brand-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0 text-lg border border-brand-100">
          🔗
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Tu enlace público de reservas
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 truncate">
            <span className="text-xs text-neutral-400 hidden md:inline">mybookme.com</span>
            <Link 
              href={path} 
              target="_blank"
              className="text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline truncate"
            >
              {path}
            </Link>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-1">
              Activo
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={copyLink}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            copied
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              ¡Copiado!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar enlace
            </>
          )}
        </button>

        <button
          type="button"
          onClick={shareWhatsApp}
          title="Compartir enlace por WhatsApp"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
        >
          <span className="text-sm">💬</span>
          <span className="hidden md:inline">WhatsApp</span>
        </button>
      </div>
    </div>
  );
}
