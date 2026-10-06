import { describe, expect, it } from "vitest";
import { trialStatus } from "./trial";

describe("trial 30 días", () => {
  const now = new Date("2026-10-06T12:00:00Z");

  it("suscrito nunca bloquea", () => {
    expect(
      trialStatus({ trialEndsAt: new Date("2020-01-01"), subscriptionStatus: "ACTIVE" }, now).state
    ).toBe("ACTIVE");
  });

  it("en plazo devuelve días restantes", () => {
    const t = trialStatus(
      { trialEndsAt: new Date("2026-10-20T12:00:00Z"), subscriptionStatus: "TRIAL" },
      now
    );
    expect(t.state).toBe("TRIAL");
    expect(t.daysLeft).toBe(14);
  });

  it("vencido bloquea", () => {
    expect(
      trialStatus(
        { trialEndsAt: new Date("2026-10-05T12:00:00Z"), subscriptionStatus: "TRIAL" },
        now
      ).state
    ).toBe("EXPIRED");
  });

  it("sin fecha (legacy) no bloquea", () => {
    expect(trialStatus({ trialEndsAt: null, subscriptionStatus: "TRIAL" }, now).state).toBe(
      "TRIAL"
    );
  });
});
