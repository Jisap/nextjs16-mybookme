import type { Interval } from "./types";

/** Regla de dominio (spec §7): A.start < B.end AND A.end > B.start */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/** Resta busy de base. Ambos deben venir ordenados; se ordenan por seguridad. */
export function subtractIntervals(base: Interval[], busy: Interval[]): Interval[] {
  const sortedBase = [...base].sort((x, y) => x.start.getTime() - y.start.getTime());
  const sortedBusy = [...busy].sort((x, y) => x.start.getTime() - y.start.getTime());
  const out: Interval[] = [];

  for (const b of sortedBase) {
    let cur: Interval[] = [{ start: new Date(b.start), end: new Date(b.end) }];
    for (const u of sortedBusy) {
      const next: Interval[] = [];
      for (const c of cur) {
        if (!overlaps(c, u)) {
          next.push(c);
          continue;
        }
        // recorte izquierdo
        if (c.start.getTime() < u.start.getTime()) {
          next.push({ start: c.start, end: new Date(Math.min(c.end.getTime(), u.start.getTime())) });
        }
        // recorte derecho
        if (c.end.getTime() > u.end.getTime()) {
          next.push({ start: new Date(Math.max(c.start.getTime(), u.end.getTime())), end: c.end });
        }
      }
      cur = next;
      if (cur.length === 0) break;
    }
    out.push(...cur.filter((i) => i.start.getTime() < i.end.getTime()));
  }
  return out.sort((x, y) => x.start.getTime() - y.start.getTime());
}
