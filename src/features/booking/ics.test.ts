import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("ics", () => {
  it("genera VCALENDAR válido con fechas UTC", () => {
    const ics = buildIcs({
      uid: "abc123",
      summary: "Manicura - Maria Nails",
      description: "Reserva con María",
      location: "Maria Nails",
      start: new Date("2026-10-12T07:00:00.000Z"),
      end: new Date("2026-10-12T07:45:00.000Z"),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20261012T070000Z");
    expect(ics).toContain("DTEND:20261012T074500Z");
    expect(ics).toContain("SUMMARY:Manicura - Maria Nails");
    expect(ics).toContain("UID:abc123@mybookme");
    expect(ics).toContain("END:VEVENT");
  });
  it("escapa comas y puntos y coma", () => {
    const ics = buildIcs({
      uid: "x",
      summary: "A;B,C",
      start: new Date("2026-10-12T07:00:00Z"),
      end: new Date("2026-10-12T08:00:00Z"),
    });
    expect(ics).toContain("SUMMARY:A\\;B\\,C");
  });
});
