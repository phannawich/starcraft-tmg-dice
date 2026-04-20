import { describe, expect, it } from "vitest";
import { calculateAttackOutcome } from "@/lib/engine";
import { validateAttackForm } from "@/lib/validation";

const BASE_FORM = {
  modelCount: "2",
  rateOfAttack: "4",
  hitTarget: "3",
  damagePerDie: "2",
  surgeEnabled: true,
  surgeFormula: "d3",
  critX: "0",
  hitsX: "0",
  hitsY: "2",
  armourTarget: "4",
  toughX: "0",
  evadeEnabled: true,
  evadeTarget: "6",
};

function getValidInput(overrides: Partial<typeof BASE_FORM> = {}) {
  const validation = validateAttackForm({ ...BASE_FORM, ...overrides });
  if (!validation.ok || !validation.data) {
    throw new Error("Expected valid input for test.");
  }
  return validation.data;
}

describe("calculateAttackOutcome", () => {
  it("creates normalized PMF", () => {
    const outcome = calculateAttackOutcome(getValidInput());
    const sum = outcome.pmf.reduce((acc, item) => acc + item.probability, 0);
    expect(sum).toBeCloseTo(1, 8);
    expect(outcome.pmf.every((item) => item.probability >= 0)).toBe(true);
  });

  it("surge toggle controls surge bypass", () => {
    const withSurge = calculateAttackOutcome(getValidInput({ surgeEnabled: true, surgeFormula: "d3" }));
    const withoutSurge = calculateAttackOutcome(getValidInput({ surgeEnabled: false, surgeFormula: "d3" }));

    expect(withSurge.expectedBypassDice).toBeGreaterThan(withoutSurge.expectedBypassDice);
  });

  it("critical hit bypass still applies when surge disabled", () => {
    const result = calculateAttackOutcome(
      getValidInput({ surgeEnabled: false, surgeFormula: "not-used", critX: "2" }),
    );

    expect(result.expectedBypassDice).toBeGreaterThan(0);
  });

  it("evade toggle impacts health-inflicting dice but not damage-pool dice", () => {
    const withEvade = calculateAttackOutcome(getValidInput({ evadeEnabled: true, evadeTarget: "6" }));
    const withoutEvade = calculateAttackOutcome(
      getValidInput({ evadeEnabled: false, evadeTarget: "6" }),
    );

    expect(withoutEvade.expectedDamagePoolDice).toBeCloseTo(withEvade.expectedDamagePoolDice, 8);
    expect(withoutEvade.expectedHealthInflictedDice).toBeGreaterThan(withEvade.expectedHealthInflictedDice);
  });

  it("hits x (y) adds automatic-hit damage path", () => {
    const withoutHits = calculateAttackOutcome(getValidInput({ hitsX: "0", hitsY: "2" }));
    const withHits = calculateAttackOutcome(getValidInput({ hitsX: "2", hitsY: "2" }));

    expect(withHits.expectedTotalDamage).toBeGreaterThan(withoutHits.expectedTotalDamage);
  });

  it("supports hits-only path when model count is zero", () => {
    const outcome = calculateAttackOutcome(
      getValidInput({
        modelCount: "0",
        hitsX: "3",
        hitsY: "1",
        evadeEnabled: true,
        evadeTarget: "6",
      }),
    );

    expect(outcome.expectedHitSuccesses).toBe(0);
    expect(outcome.expectedBypassDice).toBe(0);
    expect(outcome.expectedTotalDamage).toBeGreaterThan(0);
  });

  it("tough x reduces failed armour dice and expected damage", () => {
    const baseline = calculateAttackOutcome(getValidInput({ toughX: "0" }));
    const toughened = calculateAttackOutcome(getValidInput({ toughX: "2" }));

    expect(toughened.expectedFailedArmourDice).toBeLessThan(baseline.expectedFailedArmourDice);
    expect(toughened.expectedTotalDamage).toBeLessThan(baseline.expectedTotalDamage);
  });

  it("throws on non-finite trial counts", () => {
    const invalidInput = {
      ...getValidInput(),
      modelCount: Number.POSITIVE_INFINITY,
    };

    expect(() => calculateAttackOutcome(invalidInput)).toThrow(RangeError);
  });
});
