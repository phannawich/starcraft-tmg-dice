import type { AttackInput, AttackOutcome, DistributionEntry } from "@/lib/types";
import { evaluateDiceDistribution, mapToSortedDistribution } from "@/lib/dice";

function successProbability(target: number): number {
  return (7 - target) / 6;
}

function buildBinomialDistribution(trials: number, successProb: number): DistributionEntry[] {
  let current = [1];

  for (let t = 0; t < trials; t += 1) {
    const next = new Array(current.length + 1).fill(0);
    for (let successes = 0; successes < current.length; successes += 1) {
      const p = current[successes];
      next[successes] += p * (1 - successProb);
      next[successes + 1] += p * successProb;
    }
    current = next;
  }

  return current.map((probability, value) => ({ value, probability }));
}

function cacheKey(n: number, p: number): string {
  return `${n}:${p.toFixed(8)}`;
}

function addProbability(map: Map<number, number>, value: number, probability: number): void {
  map.set(value, (map.get(value) ?? 0) + probability);
}

function applyTough(failedDice: number, toughX: number): number {
  return Math.max(0, failedDice - toughX);
}

function convolvePmfMaps(
  left: Map<number, number>,
  right: Map<number, number>,
): Map<number, number> {
  const output = new Map<number, number>();

  for (const [leftDamage, leftProb] of left) {
    for (const [rightDamage, rightProb] of right) {
      addProbability(output, leftDamage + rightDamage, leftProb * rightProb);
    }
  }

  return output;
}

export function calculateAttackOutcome(input: AttackInput): AttackOutcome {
  const attackDice = input.modelCount * input.rateOfAttack;
  const hitProb = successProbability(input.hitTarget);
  const armourSuccessProb = successProbability(input.armourTarget);
  const armourFailProb = 1 - armourSuccessProb;
  const evadeFailProb = input.evadeEnabled ? 1 - successProbability(input.evadeTarget) : 1;

  const hitDist = buildBinomialDistribution(attackDice, hitProb);
  const surgeDist = input.surgeEnabled
    ? evaluateDiceDistribution(input.surgeFormula)
    : [{ value: 0, probability: 1 }];

  const regularDamagePmfMap = new Map<number, number>();
  const hitsDamagePmfMap = new Map<number, number>();
  const binomialCache = new Map<string, DistributionEntry[]>();

  let expectedHitSuccesses = 0;
  let expectedBypassDice = 0;
  let expectedFailedArmourDice = 0;
  let expectedDamagePoolDice = 0;
  let expectedHealthInflictedDice = 0;

  for (const hit of hitDist) {
    expectedHitSuccesses += hit.value * hit.probability;

    for (const surge of surgeDist) {
      const jointHitSurgeProb = hit.probability * surge.probability;
      const bypass = Math.min(hit.value, Math.max(0, surge.value + input.critX));
      const armourPool = hit.value - bypass;
      expectedBypassDice += bypass * jointHitSurgeProb;

      const armourKey = cacheKey(armourPool, armourFailProb);
      const armourFailDist =
        binomialCache.get(armourKey) ?? buildBinomialDistribution(armourPool, armourFailProb);
      binomialCache.set(armourKey, armourFailDist);

      for (const armourFail of armourFailDist) {
        const jointArmourProb = jointHitSurgeProb * armourFail.probability;
        const adjustedArmourFail = applyTough(armourFail.value, input.toughX);
        expectedFailedArmourDice += adjustedArmourFail * jointArmourProb;

        const damagePoolDice = bypass + adjustedArmourFail;
        expectedDamagePoolDice += damagePoolDice * jointArmourProb;
        const evadeKey = cacheKey(damagePoolDice, evadeFailProb);
        const postEvadeDist =
          binomialCache.get(evadeKey) ??
          buildBinomialDistribution(damagePoolDice, evadeFailProb);
        binomialCache.set(evadeKey, postEvadeDist);

        for (const postEvade of postEvadeDist) {
          const finalProb = jointArmourProb * postEvade.probability;
          expectedHealthInflictedDice += postEvade.value * finalProb;

          const totalDamage = postEvade.value * input.damagePerDie;
          addProbability(regularDamagePmfMap, totalDamage, finalProb);
        }
      }
    }
  }

  if (input.hitsX > 0) {
    const hitsArmourKey = cacheKey(input.hitsX, armourFailProb);
    const hitsArmourFailDist =
      binomialCache.get(hitsArmourKey) ??
      buildBinomialDistribution(input.hitsX, armourFailProb);
    binomialCache.set(hitsArmourKey, hitsArmourFailDist);

    for (const armourFail of hitsArmourFailDist) {
      const armourProb = armourFail.probability;
      const adjustedArmourFail = applyTough(armourFail.value, input.toughX);
      expectedFailedArmourDice += adjustedArmourFail * armourProb;
      expectedDamagePoolDice += adjustedArmourFail * armourProb;

      const evadeKey = cacheKey(adjustedArmourFail, evadeFailProb);
      const postEvadeDist =
        binomialCache.get(evadeKey) ??
        buildBinomialDistribution(adjustedArmourFail, evadeFailProb);
      binomialCache.set(evadeKey, postEvadeDist);

      for (const postEvade of postEvadeDist) {
        const finalProb = armourProb * postEvade.probability;
        expectedHealthInflictedDice += postEvade.value * finalProb;

        const totalDamage = postEvade.value * input.hitsY;
        addProbability(hitsDamagePmfMap, totalDamage, finalProb);
      }
    }
  } else {
    hitsDamagePmfMap.set(0, 1);
  }

  const pmfMap = convolvePmfMaps(regularDamagePmfMap, hitsDamagePmfMap);
  let pmf = mapToSortedDistribution(pmfMap);
  const totalProb = pmf.reduce((acc, item) => acc + item.probability, 0);
  let normalizationFactor = 1;
  if (Math.abs(totalProb - 1) > 1e-10 && totalProb > 0) {
    normalizationFactor = 1 / totalProb;
    pmf = pmf.map((item) => ({
      value: item.value,
      probability: item.probability * normalizationFactor,
    }));

    expectedHitSuccesses *= normalizationFactor;
    expectedBypassDice *= normalizationFactor;
    expectedFailedArmourDice *= normalizationFactor;
    expectedDamagePoolDice *= normalizationFactor;
    expectedHealthInflictedDice *= normalizationFactor;
  }

  const expectedTotalDamage = pmf.reduce(
    (acc, item) => acc + item.value * item.probability,
    0,
  );

  return {
    pmf,
    expectedTotalDamage,
    expectedHitSuccesses,
    expectedBypassDice,
    expectedFailedArmourDice,
    expectedDamagePoolDice,
    expectedHealthInflictedDice,
  };
}
