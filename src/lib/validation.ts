import type { AttackInput } from "@/lib/types";
import { parseDiceExpression } from "@/lib/dice";

const MAX_ATTACK_DICE = 60;
const MAX_TOTAL_ARMOUR_INPUT_DICE = 60;

export interface AttackFormValues {
  modelCount: string;
  rateOfAttack: string;
  hitTarget: string;
  damagePerDie: string;
  surgeEnabled: boolean;
  surgeFormula: string;
  critX: string;
  hitsX: string;
  hitsY: string;
  armourTarget: string;
  toughX: string;
  evadeEnabled: boolean;
  evadeTarget: string;
}

export interface ValidationResult {
  ok: boolean;
  data?: AttackInput;
  errors: Record<string, string>;
}

function parseIntField(value: string, fieldName: string, errors: Record<string, string>): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    errors[fieldName] = "Must be a finite, safe integer.";
    return 0;
  }
  return parsed;
}

function validateD6Target(value: number, fieldName: string, errors: Record<string, string>): void {
  if (value < 2 || value > 6) {
    errors[fieldName] = "Must be between 2 and 6 for d6 checks.";
  }
}

export function validateAttackForm(values: AttackFormValues): ValidationResult {
  const errors: Record<string, string> = {};

  const modelCount = parseIntField(values.modelCount, "modelCount", errors);
  const rateOfAttack = parseIntField(values.rateOfAttack, "rateOfAttack", errors);
  const hitTarget = parseIntField(values.hitTarget, "hitTarget", errors);
  const damagePerDie = parseIntField(values.damagePerDie, "damagePerDie", errors);
  const critX = parseIntField(values.critX, "critX", errors);
  const hitsX = parseIntField(values.hitsX, "hitsX", errors);
  let hitsY = 2;
  const armourTarget = parseIntField(values.armourTarget, "armourTarget", errors);
  const toughX = parseIntField(values.toughX, "toughX", errors);
  let evadeTarget = 6;

  if (!errors.modelCount && modelCount < 0) {
    errors.modelCount = "Cannot be negative.";
  }

  if (!errors.rateOfAttack && rateOfAttack <= 0) {
    errors.rateOfAttack = "Must be greater than 0.";
  }

  if (!errors.damagePerDie && damagePerDie <= 0) {
    errors.damagePerDie = "Must be greater than 0.";
  }

  if (!errors.critX && critX < 0) {
    errors.critX = "Cannot be negative.";
  }

  if (!errors.hitsX && hitsX < 0) {
    errors.hitsX = "Cannot be negative.";
  }

  if (!errors.hitsX && hitsX > 0) {
    hitsY = parseIntField(values.hitsY, "hitsY", errors);
    if (!errors.hitsY && hitsY <= 0) {
      errors.hitsY = "Must be greater than 0.";
    }
  } else {
    const parsedHitsY = Number(values.hitsY);
    if (Number.isInteger(parsedHitsY)) {
      hitsY = parsedHitsY;
    }
  }

  if (!errors.toughX && toughX < 0) {
    errors.toughX = "Cannot be negative.";
  }

  if (!errors.hitTarget) {
    validateD6Target(hitTarget, "hitTarget", errors);
  }

  if (!errors.armourTarget) {
    validateD6Target(armourTarget, "armourTarget", errors);
  }

  if (values.evadeEnabled) {
    evadeTarget = parseIntField(values.evadeTarget, "evadeTarget", errors);
    if (!errors.evadeTarget) {
      validateD6Target(evadeTarget, "evadeTarget", errors);
    }
  } else {
    const parsedEvadeTarget = Number(values.evadeTarget);
    if (Number.isInteger(parsedEvadeTarget)) {
      evadeTarget = parsedEvadeTarget;
    }
  }

  const product = modelCount * rateOfAttack;
  if (
    !errors.modelCount &&
    !errors.rateOfAttack &&
    Number.isFinite(product) &&
    product > MAX_ATTACK_DICE
  ) {
    errors.rateOfAttack = `modelCount × RoA must be ${MAX_ATTACK_DICE} or less.`;
  }

  if (
    !errors.modelCount &&
    !errors.rateOfAttack &&
    !errors.hitsX &&
    Number.isFinite(product) &&
    product + hitsX > MAX_TOTAL_ARMOUR_INPUT_DICE
  ) {
    errors.hitsX = `modelCount × RoA + HITS X must be ${MAX_TOTAL_ARMOUR_INPUT_DICE} or less.`;
  }

  const surgeFormula = values.surgeFormula.trim();
  if (values.surgeEnabled) {
    if (!surgeFormula) {
      errors.surgeFormula = "Required.";
    } else {
      try {
        parseDiceExpression(surgeFormula);
      } catch (error) {
        errors.surgeFormula = error instanceof Error ? error.message : "Invalid surge formula.";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      modelCount,
      rateOfAttack,
      hitTarget,
      damagePerDie,
      surgeEnabled: values.surgeEnabled,
      surgeFormula,
      critX,
      hitsX,
      hitsY,
      armourTarget,
      toughX,
      evadeEnabled: values.evadeEnabled,
      evadeTarget,
    },
    errors: {},
  };
}
