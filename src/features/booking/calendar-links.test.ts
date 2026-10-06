import { describe, expect, it } from "vitest";
import { googleCalendarUrl, outlookCalendarUrl, toGoogleDate } from "./calendar-links";

const event = {
  title: "Manicura - Maria Nails",
  details: "Reserva con Maria",
  location: "Maria Nails",
  start: new Date("2026-10-12T09:00:00Z"),
  end: new Date("2026-10-12T09:45:00Z"),
};

describe("calendar links", () => {
  it("formatea fechas UTC estilo Google", () => {
    expect(toGoogleDate(event.start)).toBe("20261012T090000Z");
  });

  it("Google incluye título y rango inicio/fin", () => {
    const url = googleCalendarUrl(event);
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("20261012T090000Z%2F20261012T094500Z");
    expect(url).toContain("Manicura");
  });

  it("Outlook incluye asunto e ISOs", () => {
    const url = outlookCalendarUrl(event);
    expect(url).toContain("https://outlook.live.com/calendar/0/deeplink/compose");
    expect(url).toContain("rru=addevent");
    expect(url).toContain("2026-10-12T09%3A00%3A00.000Z");
  });
});
