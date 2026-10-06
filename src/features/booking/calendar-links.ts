export interface CalendarEventInput {
  title: string;
  details?: string;
  location?: string;
  start: Date;
  end: Date;
}

/** 2026-10-12T09:00:00Z → 20261012T090000Z (formato Google Template). */
export function toGoogleDate(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Enlace que abre Google Calendar con el evento ya relleno (sin descargar nada). */
export function googleCalendarUrl(e: CalendarEventInput): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${toGoogleDate(e.start)}/${toGoogleDate(e.end)}`,
  });
  if (e.details) q.set("details", e.details);
  if (e.location) q.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Enlace que abre Outlook web con el evento ya relleno. */
export function outlookCalendarUrl(e: CalendarEventInput): string {
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: e.start.toISOString(),
    enddt: e.end.toISOString(),
  });
  if (e.details) q.set("body", e.details);
  if (e.location) q.set("location", e.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}
