import { prisma } from "@/lib/db";
import { CancelButton } from "./button";

export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: { service: true, staff: true, business: true },
  });
  if (!a || a.status === "CANCELLED") {
    return (
      <main className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold">{a ? "Ya está cancelada" : "Enlace no válido"}</h1>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-bold">Cancelar reserva</h1>
      <p>
        {a.service.name} con {a.staff.name}
      </p>
      <p className="text-sm text-gray-600">
        {new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: a.business.timezone }).format(a.startAt)}{" "}
        · {a.business.name}
      </p>
      <CancelButton token={token} />
    </main>
  );
}
