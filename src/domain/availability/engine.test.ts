import { describe, expect, it } from "vitest";
import { getAvailability, getAvailabilityAny } from "./engine";
import { overlaps } from "./intervals";
import type { AvailabilityInput } from "./types";

const TZ = "Europe/Madrid";
const MONDAY = "2026-10-05"; // lunes, CEST (UTC+2)
const STAFF = "staff-maria";

function base(over: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    dateStr: MONDAY,
    timezone: TZ,
    durationMinutes: 45,
    slotIntervalMinutes: 15,
    bufferMinutes: 0,
    minimumAdvanceMinutes: 0,
    maximumAdvanceDays: 30,
    now: new Date("2026-10-01T00:00:00Z"),
    staffId: STAFF,
    workingHours: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "14:00" },
      { dayOfWeek: 1, startTime: "16:00", endTime: "20:00" },
    ],
    exceptions: [],
    appointments: [],
    ...over,
  };
}

const iso = (d: Date) => d.toISOString();

describe("overlaps (spec §7)", () => {
  it("10:00-11:00 vs 10:30-11:30 solapa", () => {
    const a = { start: new Date("2026-10-05T10:00:00Z"), end: new Date("2026-10-05T11:00:00Z") };
    const b = { start: new Date("2026-10-05T10:30:00Z"), end: new Date("2026-10-05T11:30:00Z") };
    expect(overlaps(a, b)).toBe(true);
  });
  it("10:00-11:00 vs 11:00-12:00 no solapa (borde)", () => {
    const a = { start: new Date("2026-10-05T10:00:00Z"), end: new Date("2026-10-05T11:00:00Z") };
    const b = { start: new Date("2026-10-05T11:00:00Z"), end: new Date("2026-10-05T12:00:00Z") };
    expect(overlaps(a, b)).toBe(false);
  });
});

describe("availability", () => {
  it("1. día libre genera slots (dos intervalos)", () => {
    const slots = getAvailability(base());
    expect(slots.length).toBeGreaterThan(0);
    // 09:00 Madrid = 07:00Z en octubre (CEST)
    expect(iso(slots[0].start)).toBe("2026-10-05T07:00:00.000Z");
  });

  it("2. día sin horario → 0 slots", () => {
    const slots = getAvailability(base({ dateStr: "2026-10-04", workingHours: [] })); // domingo sin WH
    expect(slots).toHaveLength(0);
  });

  it("3. una cita intermedia la respeta", () => {
    const slots = getAvailability(
      base({
        appointments: [
          {
            staffId: STAFF,
            status: "CONFIRMED",
            startAt: "2026-10-05T08:00:00.000Z",
            endAt: "2026-10-05T08:45:00.000Z",
          }, // 10:00-10:45 Madrid
        ],
      })
    );
    // ningún slot puede solapar la cita (regla overlaps)
    for (const s of slots) {
      const e = new Date(s.start.getTime() + 45 * 60_000);
      expect(
        s.start.getTime() < new Date("2026-10-05T08:45:00Z").getTime() &&
          e.getTime() > new Date("2026-10-05T08:00:00Z").getTime()
      ).toBe(false);
    }
    expect(slots.length).toBeGreaterThan(0);
  });

  it("5. dos intervalos diarios: no hay slots en el hueco 14-16", () => {
    const slots = getAvailability(base());
    for (const s of slots) {
      const h = s.start.toISOString();
      // hueco Madrid 14:00-16:00 = 12:00-14:00Z
      expect(h >= "2026-10-05T12:00:00.000Z" && h < "2026-10-05T14:00:00.000Z").toBe(false);
    }
  });

  it("6. servicio de 90min no cabe al final del intervalo", () => {
    const slots = getAvailability(base({ durationMinutes: 300 })); // 5h no cabe en ningún intervalo (5h y 4h)
    // 09-14 son 5h exactas → cabe 1 al inicio; 16-20 son 4h → no cabe. Comprobamos que ninguno excede.
    for (const s of slots) {
      expect(
        s.start.getTime() + 300 * 60_000 <= new Date("2026-10-05T12:00:00Z").getTime() ||
          s.start.getTime() >= new Date("2026-10-05T14:00:00Z").getTime()
      ).toBe(true);
    }
  });

  it("7. excepción BLOCKED 12:00-13:00 Madrid parte el día", () => {
    const slots = getAvailability(
      base({
        exceptions: [{ date: MONDAY, type: "BLOCKED", startTime: "12:00", endTime: "13:00" }],
      })
    );
    for (const s of slots) {
      const st = s.start.getTime();
      // bloque Madrid 12-13 = 10:00-11:00Z ; slot 45min no puede solapar
      const en = st + 45 * 60_000;
      expect(
        st < new Date("2026-10-05T11:00:00Z").getTime() &&
          en > new Date("2026-10-05T10:00:00Z").getTime()
      ).toBe(false);
    }
  });

  it("8. vacaciones CLOSED día entero → 0 slots", () => {
    const slots = getAvailability(base({ exceptions: [{ date: MONDAY, type: "CLOSED" }] }));
    expect(slots).toHaveLength(0);
  });

  it("9. horario de otro profesional no afecta", () => {
    const slots = getAvailability(
      base({
        workingHours: [
          { dayOfWeek: 1, startTime: "09:00", endTime: "14:00", staffId: "otro" },
          { dayOfWeek: 1, startTime: "09:00", endTime: "14:00" },
          { dayOfWeek: 1, startTime: "16:00", endTime: "20:00" },
        ],
      })
    );
    expect(slots.length).toBeGreaterThan(0);
  });

  it("11. buffer 15min bloquea el siguiente slot", () => {
    const noBuf = getAvailability(base());
    const withBuf = getAvailability(
      base({
        bufferMinutes: 15,
        appointments: [
          {
            staffId: STAFF,
            status: "CONFIRMED",
            startAt: "2026-10-05T07:00:00.000Z",
            endAt: "2026-10-05T08:00:00.000Z",
          },
        ], // 09-10 Madrid
      })
    );
    // cita 09-10 Madrid (07-08Z) +15m → bloqueado hasta 08:15Z
    for (const s of withBuf) {
      expect(
        s.start.toISOString() >= "2026-10-05T07:00:00.000Z" &&
          s.start.toISOString() < "2026-10-05T08:15:00.000Z"
      ).toBe(false);
    }
    expect(withBuf.length).toBeLessThan(noBuf.length);
  });

  it("13. minimumAdvance filtra slots pasados", () => {
    const slots = getAvailability(
      base({ now: new Date("2026-10-05T06:30:00.000Z"), minimumAdvanceMinutes: 60 })
    );
    for (const s of slots)
      expect(s.start.getTime()).toBeGreaterThanOrEqual(new Date("2026-10-05T07:30:00Z").getTime());
  });

  it("12. timezone: misma hora local, distinto UTC verano/invierno", () => {
    const summer = getAvailability(
      base({
        dateStr: "2026-07-06",
        now: new Date("2026-07-01T00:00:00Z"),
        workingHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }],
      })
    );
    const winter = getAvailability(
      base({
        dateStr: "2026-01-05",
        now: new Date("2026-01-01T00:00:00Z"),
        workingHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }],
      })
    );
    // verano CEST = UTC+2 → 07:00Z ; invierno CET = UTC+1 → 08:00Z
    expect(summer[0].start.toISOString()).toBe("2026-07-06T07:00:00.000Z");
    expect(winter[0].start.toISOString()).toBe("2026-01-05T08:00:00.000Z");
  });

  it("DST otoño Madrid (25 oct 2026, día 25h) no rompe", () => {
    const slots = getAvailability(
      base({
        dateStr: "2026-10-25", // domingo cambio DST (03:00→02:00, a partir de ahí CET UTC+1)
        now: new Date("2026-10-20T00:00:00Z"),
        workingHours: [{ dayOfWeek: 0, startTime: "09:00", endTime: "14:00" }],
        durationMinutes: 60,
      })
    );
    expect(slots.length).toBeGreaterThan(0);
    // 09:00 ya es CET → 08:00Z
    expect(slots[0].start.toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });

  it("any: une staffs sin duplicar", () => {
    const r = getAvailabilityAny({
      dateStr: MONDAY,
      timezone: TZ,
      durationMinutes: 45,
      now: new Date("2026-10-01T00:00:00Z"),
      workingHours: base().workingHours,
      exceptions: [],
      appointments: [],
      staffIds: ["b", "a"],
    });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].staffIds).toEqual(["a", "b"]);
  });

  it("CANCELLED no bloquea", () => {
    const free = getAvailability(base()).length;
    const withCancelled = getAvailability(
      base({
        appointments: [
          {
            staffId: STAFF,
            status: "CANCELLED",
            startAt: "2026-10-05T07:00:00.000Z",
            endAt: "2026-10-05T12:00:00.000Z",
          },
        ],
      })
    );
    expect(withCancelled.length).toBe(free);
  });
});
