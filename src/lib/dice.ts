import type { DistributionEntry } from "@/lib/types";

export interface ParsedDiceExpression {
  count: number;
  sides: number;
  modifier: number;
  isConstant: boolean;
  constant: number;
}

const DICE_REGEX = /^([+-]?\d*)d(\d+)([+-]\d+)?$/i;
const INT_REGEX = /^[+-]?\d+$/;

export function parseDiceExpression(expression: string): ParsedDiceExpression {
  const normalized = expression.replace(/\s+/g, "").toLowerCase();

  if (!normalized) {
    throw new Error("Surge formula cannot be empty.");
  }

  if (INT_REGEX.test(normalized)) {
    const constant = Number(normalized);
    return {
      count: 0,
      sides: 0,
      modifier: 0,
      isConstant: true,
      constant,
    };
  }

  const match = normalized.match(DICE_REGEX);
  if (!match) {
    throw new Error("Dice expression must be integer or NdM+K format.");
  }

  const [, countRaw, sidesRaw, modifierRaw] = match;
  const parsedCount = countRaw === "" || countRaw === "+" ? 1 : Number(countRaw);
  const sides = Number(sidesRaw);
  const modifier = modifierRaw ? Number(modifierRaw) : 0;

  if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
    throw new Error("Dice count must be a positive integer.");
  }

  if (!Number.isInteger(sides) || sides <= 1) {
    throw new Error("Dice sides must be an integer greater than 1.");
  }

  return {
    count: parsedCount,
    sides,
    modifier,
    isConstant: false,
    constant: 0,
  };
}

export function evaluateDiceDistribution(expression: string): DistributionEntry[] {
  const parsed = parseDiceExpression(expression);

  if (parsed.isConstant) {
    return [{ value: parsed.constant, probability: 1 }];
  }

  const oneDie = new Map<number, number>();
  const p = 1 / parsed.sides;
  for (let value = 1; value <= parsed.sides; value += 1) {
    oneDie.set(value, p);
  }

  let sumDist = new Map<number, number>();
  sumDist.set(0, 1);

  for (let i = 0; i < parsed.count; i += 1) {
    const next = new Map<number, number>();
    for (const [currentValue, currentProb] of sumDist) {
      for (const [dieValue, dieProb] of oneDie) {
        const key = currentValue + dieValue;
        next.set(key, (next.get(key) ?? 0) + currentProb * dieProb);
      }
    }
    sumDist = next;
  }

  if (parsed.modifier !== 0) {
    const shifted = new Map<number, number>();
    for (const [value, prob] of sumDist) {
      shifted.set(value + parsed.modifier, prob);
    }
    sumDist = shifted;
  }

  return mapToSortedDistribution(sumDist);
}

export function mapToSortedDistribution(map: Map<number, number>): DistributionEntry[] {
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([value, probability]) => ({ value, probability }));
}
