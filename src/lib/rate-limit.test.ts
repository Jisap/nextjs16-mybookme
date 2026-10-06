import { describe, expect, it } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rate-limit", () => {
  it("permite hasta el límite y luego bloquea", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });
});
