import { describe, expect, it } from "vitest";
import { validateAttackForm } from "@/lib/validation";

const BASE_FORM = {
  modelCount: "2",
  rateOfAttack: "4",
  hitTarget: "3",
  damagePerDie: "2",
  surgeEnabled: false,
  surgeFormula: "d3",
  critX: "0",
  hitsX: "0",
  hitsY: "2",
  armourTarget: "4",
  toughX: "0",
  evadeEnabled: true,
  evadeTarget: "6",
};

describe("validateAttackForm surge behavior", () => {
  it("does not require valid surge formula when surge disabled", () => {
    const validation = validateAttackForm({
      ...BASE_FORM,
      surgeEnabled: false,
      surgeFormula: "not-dice",
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors.surgeFormula).toBeUndefined();
  });

  it("requires surge formula when surge enabled", () => {
    const validation = validateAttackForm({
      ...BASE_FORM,
      surgeEnabled: true,
      surgeFormula: "",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.surgeFormula).toMatch(/required/i);
  });

  it("rejects invalid surge formula when surge enabled", () => {
    const validation = validateAttackForm({
      ...BASE_FORM,
      surgeEnabled: true,
      surgeFormula: "xxyy",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.surgeFormula).toBeTruthy();
  });

  it("rejects negative tough and hits x values", () => {
    const validation = validateAttackForm({
      ...BASE_FORM,
      hitsX: "-1",
      toughX: "-2",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.hitsX).toBeTruthy();
    expect(validation.errors.toughX).toBeTruthy();
  });

  it("rejects non-positive hits y value", () => {
    const validation = validateAttackForm({
      ...BASE_FORM,
      hitsX: "1",
      hitsY: "0",
    });

    expect(validation.ok).toBe(false);
    expect(validation.errors.hitsY).toBeTruthy();
  });

  it("ignores hits y when hits x is zero", () => {
    const validation = validateAttackForm({
      ...BASE_FORM,
      hitsX: "0",
      hitsY: "0",
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors.hitsY).toBeUndefined();
  });
});
