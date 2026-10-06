function icsDate(d: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface IcsInput {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

export function buildIcs(i: IcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyBookMe//Booking//ES",
    "BEGIN:VEVENT",
    `UID:${esc(i.uid)}@mybookme`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(i.start)}`,
    `DTEND:${icsDate(i.end)}`,
    `SUMMARY:${esc(i.summary)}`,
  ];
  if (i.description) lines.push(`DESCRIPTION:${esc(i.description)}`);
  if (i.location) lines.push(`LOCATION:${esc(i.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
