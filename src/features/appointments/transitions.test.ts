import { describe, expect, it } from "vitest";
import { isValidTransition } from "./transitions";

describe("transitions", () => {
  it("PENDING → CONFIRMED/CANCELLED ok, → COMPLETED no", () => {
    expect(isValidTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(isValidTransition("PENDING", "CANCELLED")).toBe(true);
    expect(isValidTransition("PENDING", "COMPLETED")).toBe(false);
  });
  it("CONFIRMED → COMPLETED/CANCELLED/NO_SHOW ok, → PENDING no", () => {
    expect(isValidTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(isValidTransition("CONFIRMED", "NO_SHOW")).toBe(true);
    expect(isValidTransition("CONFIRMED", "PENDING")).toBe(false);
  });
  it("estados finales no transicionan", () => {
    expect(isValidTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(isValidTransition("COMPLETED", "CANCELLED")).toBe(false);
  });
});
