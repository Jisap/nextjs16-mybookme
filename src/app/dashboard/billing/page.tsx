import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { trialStatus } from "@/features/billing/trial";
import { DashboardNav } from "../nav";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const memberships = await prisma.businessMember.findMany({
    where: { userId: data.user.id },
    include: { business: true },
  });
  if (memberships.length === 0) redirect("/dashboard");
  const sp = await searchParams;
  const membership = memberships.find((m) => m.businessId === sp.businessId) ?? memberships[0];
  const business = membership.business;
  const trial = trialStatus(business);
  const trialEnd = business.trialEndsAt
    ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(
        business.trialEndsAt
      )
    : null;

  return (
    <main style={{ maxWidth: "860px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h1 className="text-2xl font-extrabold text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Facturación y Suscripción — {business.name}
        </h1>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-neutral-900 text-white">
            {membership.role === "OWNER" ? "Propietario" : "Personal"}
          </span>
          <span className="hidden sm:inline">{data.user.email}</span>
        </div>
      </div>

      <DashboardNav businessId={business.id} slug={business.slug} current="billing" />

      <div className="mt-4 max-w-2xl space-y-4">
        <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {trial.state === "ACTIVE"
                  ? "Suscripción Activa"
                  : trial.state === "EXPIRED"
                  ? "Prueba Gratuita Terminada"
                  : "Periodo de Prueba en Curso"}
              </h2>
              <span className="text-xs text-neutral-500">
                Plan MyBookMe Negocio · Facturación mensual
              </span>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                trial.state === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : trial.state === "EXPIRED"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-brand-50 text-brand-700 border border-brand-200"
              }`}
            >
              {trial.state === "ACTIVE" ? "Activo" : trial.state === "EXPIRED" ? "Expirado" : `Quedan ${trial.daysLeft} días`}
            </span>
          </div>

          <div className="space-y-3 text-sm text-neutral-600">
            {trial.state === "ACTIVE" && (
              <p>Tu suscripción de negocio está al día (29$/mes). Todas las reservas online están activas sin interrupciones.</p>
            )}
            {trial.state === "TRIAL" && (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs text-neutral-600 space-y-1.5">
                <p className="font-semibold text-neutral-800">
                  ✦ Dispones de prueba gratuita de 30 días{trialEnd ? ` hasta el ${trialEnd}` : ""}.
                </p>
                <p>
                  Durante este periodo tienes acceso completo a todas las funciones. Al finalizar, el plan tendrá un coste de <strong>29$/mes</strong> (el cliente final nunca paga por reservar).
                </p>
              </div>
            )}
            {trial.state === "EXPIRED" && (
              <p className="text-rose-700 text-xs font-medium">
                Tu periodo de prueba ha expirado. Tu página pública no está admitiendo nuevas citas hasta activar la suscripción.
              </p>
            )}

            <div className="pt-2">
              <button
                type="button"
                disabled
                className="py-2.5 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200"
              >
                Suscribirme (Pasarela Stripe próximamente)
              </button>
              <p className="text-[11px] text-neutral-400 mt-2">
                El pago seguro con tarjeta estará disponible en este apartado antes de que finalice tu periodo de prueba.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
