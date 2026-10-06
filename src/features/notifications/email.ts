function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtLong(startAt: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(startAt);
}

export interface BookingEmailInput {
  businessName: string;
  serviceName: string;
  staffName: string;
  startAt: Date;
  timezone: string;
  customerName: string;
  cancelUrl: string;
  icsUrl: string;
}

export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function bookingUrls(cancelToken: string): { cancelUrl: string; icsUrl: string } {
  const base = appBaseUrl();
  return {
    cancelUrl: `${base}/book/cancel/${cancelToken}`,
    icsUrl: `${base}/api/public/appointments/by-token/${cancelToken}/ics`,
  };
}

export function buildConfirmationEmail(i: BookingEmailInput): BuiltEmail {
  const when = fmtLong(i.startAt, i.timezone);
  const subject = `Reserva confirmada: ${i.serviceName} · ${when} — ${i.businessName}`;
  const text = [
    `Hola ${i.customerName},`,
    ``,
    `Tu reserva en ${i.businessName} está confirmada:`,
    `· ${i.serviceName} con ${i.staffName}`,
    `· ${when} (${i.timezone})`,
    ``,
    `Añadir al calendario: ${i.icsUrl}`,
    `Cancelar (hasta el plazo del negocio): ${i.cancelUrl}`,
    ``,
    `Gracias por reservar.`,
  ].join("\n");
  const html = [
    `<p>Hola ${escHtml(i.customerName)},</p>`,
    `<p>Tu reserva en <strong>${escHtml(i.businessName)}</strong> está confirmada:</p>`,
    `<ul><li>${escHtml(i.serviceName)} con ${escHtml(i.staffName)}</li><li>${escHtml(when)} (${escHtml(i.timezone)})</li></ul>`,
    `<p><a href="${escHtml(i.icsUrl)}">Añadir al calendario</a> · <a href="${escHtml(i.cancelUrl)}">Cancelar reserva</a></p>`,
  ].join("\n");
  return { subject, text, html };
}

export function buildReminderEmail(i: BookingEmailInput): BuiltEmail {
  const when = fmtLong(i.startAt, i.timezone);
  const subject = `Recordatorio: ${i.serviceName} mañana · ${when} — ${i.businessName}`;
  const text = [
    `Hola ${i.customerName},`,
    ``,
    `Te recordamos tu cita de mañana en ${i.businessName}:`,
    `· ${i.serviceName} con ${i.staffName}`,
    `· ${when} (${i.timezone})`,
    ``,
    `Añadir al calendario: ${i.icsUrl}`,
    `Cancelar (hasta el plazo del negocio): ${i.cancelUrl}`,
  ].join("\n");
  const html = [
    `<p>Hola ${escHtml(i.customerName)},</p>`,
    `<p>Te recordamos tu cita de mañana en <strong>${escHtml(i.businessName)}</strong>:</p>`,
    `<ul><li>${escHtml(i.serviceName)} con ${escHtml(i.staffName)}</li><li>${escHtml(when)} (${escHtml(i.timezone)})</li></ul>`,
    `<p><a href="${escHtml(i.icsUrl)}">Añadir al calendario</a> · <a href="${escHtml(i.cancelUrl)}">Cancelar reserva</a></p>`,
  ].join("\n");
  return { subject, text, html };
}
