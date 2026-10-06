export type TrialState = "ACTIVE" | "TRIAL" | "EXPIRED";

export interface TrialInfo {
  state: TrialState;
  /** Días enteros restantes (solo en TRIAL). */
  daysLeft: number;
}

interface BusinessTrial {
  trialEndsAt: Date | null;
  subscriptionStatus: string;
}

/**
 * Prueba 30 días (Fase 8): al crear el negocio trialEndsAt = +30d.
 * - ACTIVE: suscrito en Stripe (no bloquea nunca).
 * - trialEndsAt null: gracia legacy (no bloquea).
 * - EXPIRED: bloqueo suave — el panel se ve, pero no entran reservas.
 */
export function trialStatus(b: BusinessTrial, now = new Date()): TrialInfo {
  if (b.subscriptionStatus === "ACTIVE") return { state: "ACTIVE", daysLeft: 0 };
  if (!b.trialEndsAt) return { state: "TRIAL", daysLeft: 30 };
  const ms = b.trialEndsAt.getTime() - now.getTime();
  if (ms <= 0) return { state: "EXPIRED", daysLeft: 0 };
  return { state: "TRIAL", daysLeft: Math.ceil(ms / 86400000) };
}
