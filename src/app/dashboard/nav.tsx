import Link from "next/link";

type NavKey = "citas" | "calendario" | "servicios" | "staff" | "horarios" | "negocio" | "billing";

export function DashboardNav({
  businessId,
  slug,
  current,
}: {
  businessId: string;
  slug: string;
  current?: NavKey;
}) {
  const q = `?businessId=${businessId}`;
  const links: { key: NavKey | "pub"; href: string; label: string }[] = [
    { key: "citas",      href: `/dashboard${q}`,                  label: "Citas" },
    { key: "calendario", href: `/dashboard/calendar${q}`,         label: "Calendario" },
    { key: "servicios",  href: `/dashboard/services${q}`,         label: "Servicios" },
    { key: "staff",      href: `/dashboard/staff${q}`,            label: "Profesionales" },
    { key: "horarios",   href: `/dashboard/schedule${q}`,         label: "Horarios" },
    { key: "negocio",    href: `/dashboard/business${q}`,         label: "Negocio" },
    { key: "billing",    href: `/dashboard/billing${q}`,          label: "Facturación" },
    { key: "pub",        href: `/book/${slug}`,                   label: "↗ Página pública" },
  ];

  return (
    <nav
      style={{
        display: "flex", flexWrap: "wrap", gap: "0.375rem",
        padding: "0.75rem 0",
      }}
      aria-label="Panel del negocio"
    >
      {links.map(({ key, href, label }) => {
        const isActive = key === current;
        const isPub = key === "pub";
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "0.35rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: isActive ? 600 : 500,
              borderRadius: "9999px",
              textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
              ...(isActive
                ? {
                    background: "hsl(252 75% 57%)",
                    color: "#fff",
                    boxShadow: "0 2px 8px hsl(252 75% 57% / 0.3)",
                  }
                : isPub
                ? {
                    background: "transparent",
                    color: "hsl(252 70% 55%)",
                    border: "1px solid hsl(252 75% 57% / 0.35)",
                  }
                : {
                    background: "hsl(220 20% 96%)",
                    color: "hsl(220 15% 30%)",
                    border: "1px solid hsl(220 15% 88%)",
                  }),
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
