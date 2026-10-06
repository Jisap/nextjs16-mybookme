import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) redirect("/login?next=/onboarding");

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">Crea tu negocio</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {data.user.email} · Te creamos tu enlace de reservas y un horario base. Luego añade
          servicios y profesionales.
        </p>
      </header>
      <OnboardingForm />
    </main>
  );
}
