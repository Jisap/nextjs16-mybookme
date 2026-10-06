import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { trialStatus } from "@/features/billing/trial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "../nav";
import { BusinessBar } from "../business-bar";

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
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold">Facturación — {business.name}</h1>
      <BusinessBar role={membership.role} userEmail={data.user.email!} slug={business.slug} />
      <DashboardNav businessId={business.id} slug={business.slug} current="billing" />
      <Card>
        <CardHeader>
          <CardTitle>
            {trial.state === "ACTIVE"
              ? "Suscripción activa"
              : trial.state === "EXPIRED"
                ? "Prueba terminada"
                : "Prueba gratuita"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-700">
          {trial.state === "ACTIVE" && (
            <p>Tu suscripción está al día. Gracias por usar MyBookMe.</p>
          )}
          {trial.state === "TRIAL" && (
            <p>
              Estás en prueba gratuita{trialEnd ? ` hasta el ${trialEnd}` : ""} ({trial.daysLeft}{" "}
              días). Al terminar, tu página dejará de aceptar reservas hasta que te suscribas. Tus
              datos no se borran.
            </p>
          )}
          {trial.state === "EXPIRED" && (
            <p>
              Tu prueba terminó. Suscríbete para volver a recibir reservas en{" "}
              <code>/book/{business.slug}</code>.
            </p>
          )}
          <Button disabled> Suscribirme (próximamente)</Button>
          <p className="text-xs text-neutral-500">
            El pago con tarjeta se activará aquí en cuanto definamos los planes.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
