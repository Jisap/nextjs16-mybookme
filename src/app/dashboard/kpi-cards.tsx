interface KpiProps {
  todayTotal: number;
  todayCompleted: number;
  todayPending: number;
  todayRevenueCents: number;
  upcomingTotal: number;
  currency?: string;
}

export function DashboardKpiCards({
  todayTotal,
  todayCompleted,
  todayPending,
  todayRevenueCents,
  upcomingTotal,
  currency = "EUR",
}: KpiProps) {
  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  const formattedRevenue = (todayRevenueCents / 100).toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const cards = [
    {
      title: "Citas para Hoy",
      value: todayTotal,
      subtitle: todayTotal === 0 ? "Sin citas hoy" : `${todayCompleted} completadas · ${todayPending} pendientes`,
      icon: "📅",
      accent: "from-brand-500/10 to-brand-500/5 text-brand-700 border-brand-200/80",
      badgeColor: "bg-brand-50 text-brand-700",
    },
    {
      title: "Ingresos Previstos Hoy",
      value: `${formattedRevenue} ${currencySymbol}`,
      subtitle: todayTotal === 0 ? "Sin reservas hoy" : "Según servicios programados",
      icon: "💰",
      accent: "from-emerald-500/10 to-emerald-500/5 text-emerald-800 border-emerald-200/80",
      badgeColor: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Próximas en Agenda",
      value: upcomingTotal,
      subtitle: "Total citas desde hoy",
      icon: "⚡",
      accent: "from-purple-500/10 to-purple-500/5 text-purple-800 border-purple-200/80",
      badgeColor: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`bg-white rounded-2xl p-4 sm:p-4.5 border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${card.accent}`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {card.title}
            </span>
            <span className="text-lg p-1.5 rounded-xl bg-white/80 shadow-xs border border-neutral-100 flex items-center justify-center">
              {card.icon}
            </span>
          </div>

          <div>
            <div 
              className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight" 
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {card.value}
            </div>
            <div className="text-xs text-neutral-500 font-medium mt-1 truncate">
              {card.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
