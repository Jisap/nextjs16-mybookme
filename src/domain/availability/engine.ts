import { fromZonedTime } from "date-fns-tz";
import { subtractIntervals } from "./intervals";
import type { AvailabilityInput, Interval, Slot } from "./types";

const BLOCKING = new Set(["PENDING", "CONFIRMED"]);

function dowOfDateStr(dateStr: string): number {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

function localToUtc(dateStr: string, hhmm: string, tz: string): Date {
  return fromZonedTime(`${dateStr} ${hhmm}`, tz);
}

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/** Intervalos base: WorkingHours ese DOW (+ OPEN), CLOSED día entero vacía base. */
function baseIntervals(input: AvailabilityInput): Interval[] {
  const { dateStr, timezone, staffId, workingHours, exceptions } = input;
  const dow = dowOfDateStr(dateStr);

  const dayExc = exceptions.filter((e) => e.date === dateStr && (e.staffId == null || e.staffId === staffId));
  if (dayExc.some((e) => e.type === "CLOSED" && !e.startTime && !e.endTime)) return [];

  const wh = workingHours.filter(
    (w) => w.dayOfWeek === dow && (w.staffId == null || w.staffId === staffId),
  );
  const base: Interval[] = wh.map((w) => ({
    start: localToUtc(dateStr, w.startTime, timezone),
    end: localToUtc(dateStr, w.endTime, timezone),
  }));

  for (const e of dayExc) {
    if (e.type === "OPEN" && e.startTime && e.endTime) {
      base.push({ start: localToUtc(dateStr, e.startTime, timezone), end: localToUtc(dateStr, e.endTime, timezone) });
    }
  }
  return base
    .filter((i) => i.start.getTime() < i.end.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Ocupados: BLOCKED (parcial o día) + citas PENDING/CONFIRMED expandidas con buffer. */
function busyIntervals(input: AvailabilityInput): Interval[] {
  const { dateStr, timezone, staffId, exceptions, appointments, bufferMinutes = 0 } = input;
  const busy: Interval[] = [];

  for (const e of exceptions) {
    if (e.date !== dateStr || !(e.staffId == null || e.staffId === staffId)) continue;
    if (e.type === "BLOCKED") {
      if (e.startTime && e.endTime) {
        busy.push({ start: localToUtc(dateStr, e.startTime, timezone), end: localToUtc(dateStr, e.endTime, timezone) });
      } else {
        // BLOCKED sin horas = día entero
        busy.push({
          start: localToUtc(dateStr, "00:00", timezone),
          end: localToUtc(nextDay(dateStr), "00:00", timezone),
        });
      }
    }
    if (e.type === "CLOSED" && e.startTime && e.endTime) {
      busy.push({ start: localToUtc(dateStr, e.startTime, timezone), end: localToUtc(dateStr, e.endTime, timezone) });
    }
  }

  for (const a of appointments) {
    if (a.staffId !== staffId || !BLOCKING.has(a.status)) continue;
    const s = toDate(a.startAt).getTime();
    const e = toDate(a.endAt).getTime() + bufferMinutes * 60_000;
    if (e > s) busy.push({ start: new Date(s), end: new Date(e) });
  }
  return busy;
}

function nextDay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function getAvailability(input: AvailabilityInput): Slot[] {
  const {
    durationMinutes,
    slotIntervalMinutes = 15,
    bufferMinutes = 0,
    minimumAdvanceMinutes = 0,
    maximumAdvanceDays = 30,
    now = new Date(),
  } = input;

  if (durationMinutes <= 0 || slotIntervalMinutes <= 0) return [];

  const free = subtractIntervals(baseIntervals(input), busyIntervals(input));
  if (free.length === 0) return [];

  const totalMs = (durationMinutes + bufferMinutes) * 60_000;
  const stepMs = slotIntervalMinutes * 60_000;
  const minStart = now.getTime() + minimumAdvanceMinutes * 60_000;
  const maxStart = now.getTime() + maximumAdvanceDays * 86_400_000;

  const slots: Slot[] = [];
  for (const f of free) {
    // alinear al step desde el inicio del intervalo libre
    for (let t = f.start.getTime(); t + totalMs <= f.end.getTime(); t += stepMs) {
      if (t < minStart || t > maxStart) continue;
      slots.push({ start: new Date(t), end: new Date(t + durationMinutes * 60_000) });
    }
  }
  return slots;
}

/** "Cualquiera": une por staff en orden determinista, deduplica por start. */
export function getAvailabilityAny(
  input: Omit<AvailabilityInput, "staffId"> & { staffIds: string[] },
): (Slot & { staffIds: string[] })[] {
  const byStart = new Map<number, { start: Date; end: Date; staffIds: string[] }>();
  const ordered = [...input.staffIds].sort();
  for (const staffId of ordered) {
    for (const s of getAvailability({ ...input, staffId })) {
      const k = s.start.getTime();
      const cur = byStart.get(k);
      if (cur) cur.staffIds.push(staffId);
      else byStart.set(k, { start: s.start, end: s.end, staffIds: [staffId] });
    }
  }
  return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}
