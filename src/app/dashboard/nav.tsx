import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardNav({
  businessId,
  slug,
  current,
}: {
  businessId: string;
  slug: string;
  current?: "citas" | "calendario" | "servicios" | "staff" | "horarios" | "negocio";
}) {
  const q = `?businessId=${businessId}`;
  const item = (key: string, href: string, label: string) => (
    <Button key={key} asChild variant={current === key ? "default" : "outline"} size="sm">
      <Link href={href} aria-current={current === key ? "page" : undefined}>
        {label}
      </Link>
    </Button>
  );
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Panel del negocio">
      {item("citas", `/dashboard${q}`, "Citas")}
      {item("calendario", `/dashboard/calendar${q}`, "Calendario")}
      {item("servicios", `/dashboard/services${q}`, "Servicios")}
      {item("staff", `/dashboard/staff${q}`, "Profesionales")}
      {item("horarios", `/dashboard/schedule${q}`, "Horarios")}
      {item("negocio", `/dashboard/business${q}`, "Negocio")}
      <span className="mx-1 text-neutral-300" aria-hidden="true">
        |
      </span>
      <Button asChild variant="link" size="sm">
        <Link href={`/book/${slug}`}>Ver página pública</Link>
      </Button>
    </nav>
  );
}
