import { describe, expect, it } from "vitest";
import { buildConfirmationEmail, buildReminderEmail } from "./email";

describe("booking emails", () => {
  const base = {
    businessName: "María Nails",
    serviceName: "Manicura",
    staffName: "María",
    startAt: new Date("2026-10-12T09:00:00Z"),
    endAt: new Date("2026-10-12T09:45:00Z"),
    timezone: "Europe/Madrid",
    customerName: "Lucía",
    cancelUrl: "http://localhost:3000/book/cancel/abc",
    icsUrl: "http://localhost:3000/api/public/appointments/by-token/abc/ics",
  };

  it("confirmación incluye servicio, fecha y enlaces", () => {
    const e = buildConfirmationEmail(base);
    expect(e.subject).toContain("Manicura");
    expect(e.subject).toContain("María Nails");
    expect(e.text).toContain(base.cancelUrl);
    expect(e.text).toContain(base.icsUrl);
    expect(e.text).toContain("calendar.google.com");
    expect(e.html).toContain(base.cancelUrl);
    expect(e.html).toContain("Google Calendar");
  });

  it("recordatorio menciona mañana y escapa html", () => {
    const e = buildReminderEmail({ ...base, customerName: "<Lucía>" });
    expect(e.subject).toContain("Recordatorio");
    expect(e.html).toContain("&lt;Lucía&gt;");
    expect(e.html).not.toContain("<Lucía>");
  });
});
