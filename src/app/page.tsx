import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl space-y-10 p-4 pb-16 sm:p-6">
      <header className="flex items-center justify-between py-4">
        <p className="text-lg font-bold">MyBookMe</p>
        <nav className="flex gap-2" aria-label="Acceso">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/onboarding">Crear mi negocio</Link>
          </Button>
        </nav>
      </header>

      <section aria-labelledby="hero-h" className="space-y-4 text-center sm:py-6">
        <h1 id="hero-h" className="text-3xl font-bold text-balance sm:text-4xl">
          Reservas online para tu negocio, sin complicaciones
        </h1>
        <p className="mx-auto max-w-2xl text-base text-neutral-600">
          Crea tu página de reservas, comparte tu enlace y gestiona citas desde el panel. Tus
          clientes reservan sin crear cuenta. El pago se hace en tu local, como siempre.
        </p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/onboarding">Crear mi negocio gratis</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/book/maria-nails">Probar demo de reserva</Link>
          </Button>
        </div>
        <p className="text-sm text-neutral-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/dashboard" className="underline">
            Ir a mi panel
          </Link>
        </p>
      </section>

      <section aria-labelledby="biz-h" className="space-y-3">
        <h2 id="biz-h" className="text-xl font-bold">
          Para tu comercio: en 3 pasos
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>1. Crea tu negocio</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Regístrate y ponle nombre a tu negocio. Te creamos tu enlace{" "}
              <code>/book/tu-negocio</code> y un horario base de lunes a viernes.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Configura</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Añade servicios, profesionales y horarios desde el panel. Sin pagos online: el
              cliente paga en metálico en tu sede.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Comparte y gestiona</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-neutral-600">
              Comparte tu enlace. Recibe citas, confirma o cancela desde el calendario y tus
              clientes reciben email de confirmación y recordatorio.
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/onboarding">Empezar ahora</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Ver mi panel</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="cli-h" className="space-y-3">
        <h2 id="cli-h" className="text-xl font-bold">
          Para tus clientes: reservar es así
        </h2>
        <Card>
          <CardContent className="space-y-2 pt-4 text-sm text-neutral-700">
            <p>1. Abren tu enlace, eligen servicio y profesional (o «cualquiera»).</p>
            <p>2. Eligen fecha y solo ven las horas realmente libres.</p>
            <p>3. Dejan nombre y teléfono o email, confirman y listo.</p>
            <p>
              4. Reciben confirmación por email, pueden añadirla al calendario y cancelarla si
              lo necesitan.
            </p>
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <Link href="/book/maria-nails">Ver ejemplo real de reserva</Link>
        </Button>
      </section>
    </main>
  );
}
