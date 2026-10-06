import { describe, expect, it } from "vitest";
import { canCancel } from "./cancel";

describe("canCancel", () => {
  it("respeta antelación y estado", () => {
    const start = new Date("2026-10-12T07:00:00Z");
    expect(canCancel("PENDING", start, 120, new Date("2026-10-12T04:00:00Z"))).toBe(true);
    expect(canCancel("PENDING", start, 120, new Date("2026-10-12T06:30:00Z"))).toBe(false);
    expect(canCancel("CANCELLED", start, 120, new Date("2026-10-01T00:00:00Z"))).toBe(false);
    expect(canCancel("COMPLETED", start, 0, new Date("2026-10-01T00:00:00Z"))).toBe(false);
  });
});
