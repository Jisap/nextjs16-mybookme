"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AppointmentsFilterBar({
  businessId,
  currentQuery = "",
  staffList,
  currentStaffId = "",
}: {
  businessId: string;
  currentQuery?: string;
  staffList: { id: string; name: string }[];
  currentStaffId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(currentQuery);
  const [isPending, startTransition] = useTransition();

  function updateFilters(newQ: string, newStaff: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("businessId", businessId);
    
    if (newQ.trim()) {
      params.set("q", newQ.trim());
    } else {
      params.delete("q");
    }

    if (newStaff) {
      params.set("staffId", newStaff);
    } else {
      params.delete("staffId");
    }

    // Reset pagination
    params.delete("pagina");

    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters(q, currentStaffId);
  }

  function handleStaffChange(e: React.ChangeEvent<HTMLSelectElement>) {
    updateFilters(q, e.target.value);
  }

  function clearFilters() {
    setQ("");
    updateFilters("", "");
  }

  const hasActiveFilters = Boolean(currentQuery || currentStaffId);

  return (
    <div className="bg-white border border-neutral-200/90 rounded-2xl p-3 sm:p-3.5 mb-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por cliente o teléfono..."
          className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all text-neutral-800"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              updateFilters("", currentStaffId);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        )}
      </form>

      {/* Staff Filter Dropdown */}
      {staffList.length > 0 && (
        <div className="sm:w-48">
          <select
            value={currentStaffId}
            onChange={handleStaffChange}
            aria-label="Filtrar por profesional"
            className="w-full py-2 px-3 text-xs sm:text-sm bg-neutral-50 hover:bg-neutral-100/70 border border-neutral-200 rounded-xl focus:outline-none focus:border-brand-500 transition-all text-neutral-800 cursor-pointer"
          >
            <option value="">Todos los profesionales</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors self-center sm:self-auto cursor-pointer"
        >
          Limpiar filtros
        </button>
      )}

      {isPending && (
        <span className="text-xs text-neutral-400 animate-pulse self-center">
          Buscando…
        </span>
      )}
    </div>
  );
}
