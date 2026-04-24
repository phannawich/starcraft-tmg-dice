import type { AttackInput, AttackOutcome, DistributionEntry } from "@/lib/types";
import { evaluateDiceDistribution, mapToSortedDistribution } from "@/lib/dice";

function successProbability(target: number): number {
  return (7 - target) / 6;
}

function buildBinomialDistribution(trials: number, successProb: number): DistributionEntry[] {
  if (!Number.isFinite(trials) || !Number.isInteger(trials) || trials < 0 || trials > 1000) {
    throw new RangeError(`Invalid binomial trials: ${trials}. Expected integer between 0 and 1000.`);
  }
  if (!Number.isFinite(successProb) || successProb < 0 || successProb > 1) {
    throw new RangeError(`Invalid binomial success probability: ${successProb}. Expected value between 0 and 1.`);
  }

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

function normalizeDistribution(dist: DistributionEntry[]): DistributionEntry[] {
  const total = dist.reduce((sum, entry) => sum + entry.probability, 0);
  if (total <= 0 || Math.abs(total - 1) <= 1e-10) {
    return dist;
  }

  return dist.map((entry) => ({
    value: entry.value,
    probability: entry.probability / total,
  }));
}

function safeRate(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return value / total;
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

  const rawHitPmfMap = new Map<number, number>();
  const effectiveHitPmfMap = new Map<number, number>();
  const bypassPmfMap = new Map<number, number>();
  const regularFinalFailedArmourPmfMap = new Map<number, number>();
  const hitsFinalFailedArmourPmfMap = new Map<number, number>();
  const regularDamagePoolPmfMap = new Map<number, number>();
  const hitsDamagePoolPmfMap = new Map<number, number>();
  const regularHealthInflictedPmfMap = new Map<number, number>();
  const hitsHealthInflictedPmfMap = new Map<number, number>();
  const regularDamagePmfMap = new Map<number, number>();
  const hitsDamagePmfMap = new Map<number, number>();
  const binomialCache = new Map<string, DistributionEntry[]>();

  let expectedRawHitDice = 0;
  let expectedPrecisionPromotedDice = 0;
  let expectedHitSuccesses = 0;
  let expectedPreDodgeBypassDice = 0;
  let expectedBypassDice = 0;
  let expectedRawArmourFailedDice = 0;
  let expectedFailedArmourDice = 0;
  let expectedDamagePoolDice = 0;
  let expectedHealthInflictedDice = 0;

  for (const hit of hitDist) {
    addProbability(rawHitPmfMap, hit.value, hit.probability);
    expectedRawHitDice += hit.value * hit.probability;

    const misses = attackDice - hit.value;
    const precisionHits = Math.min(input.precisionX, misses);
    const effectiveHits = hit.value + precisionHits;
    expectedPrecisionPromotedDice += precisionHits * hit.probability;
    expectedHitSuccesses += effectiveHits * hit.probability;
    addProbability(effectiveHitPmfMap, effectiveHits, hit.probability);

    for (const surge of surgeDist) {
      const jointHitSurgeProb = hit.probability * surge.probability;
      const rawBypass = Math.min(effectiveHits, Math.max(0, surge.value + input.critX));
      const bypass = Math.max(0, rawBypass - input.dodgeX);
      expectedPreDodgeBypassDice += rawBypass * jointHitSurgeProb;
      const armourPool = effectiveHits - bypass;
      expectedBypassDice += bypass * jointHitSurgeProb;
      addProbability(bypassPmfMap, bypass, jointHitSurgeProb);

      const armourKey = cacheKey(armourPool, armourFailProb);
      const armourFailDist =
        binomialCache.get(armourKey) ?? buildBinomialDistribution(armourPool, armourFailProb);
      binomialCache.set(armourKey, armourFailDist);

      for (const armourFail of armourFailDist) {
        const jointArmourProb = jointHitSurgeProb * armourFail.probability;
        expectedRawArmourFailedDice += armourFail.value * jointArmourProb;
        const adjustedArmourFail = applyTough(armourFail.value, input.toughX);
        expectedFailedArmourDice += adjustedArmourFail * jointArmourProb;
        addProbability(regularFinalFailedArmourPmfMap, adjustedArmourFail, jointArmourProb);

        const damagePoolDice = bypass + adjustedArmourFail;
        expectedDamagePoolDice += damagePoolDice * jointArmourProb;
        addProbability(regularDamagePoolPmfMap, damagePoolDice, jointArmourProb);
        const evadeKey = cacheKey(damagePoolDice, evadeFailProb);
        const postEvadeDist =
          binomialCache.get(evadeKey) ??
          buildBinomialDistribution(damagePoolDice, evadeFailProb);
        binomialCache.set(evadeKey, postEvadeDist);

        for (const postEvade of postEvadeDist) {
          const finalProb = jointArmourProb * postEvade.probability;
          expectedHealthInflictedDice += postEvade.value * finalProb;
          addProbability(regularHealthInflictedPmfMap, postEvade.value, finalProb);

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
      expectedRawArmourFailedDice += armourFail.value * armourProb;
      const adjustedArmourFail = applyTough(armourFail.value, input.toughX);
      expectedFailedArmourDice += adjustedArmourFail * armourProb;
      addProbability(hitsFinalFailedArmourPmfMap, adjustedArmourFail, armourProb);
      expectedDamagePoolDice += adjustedArmourFail * armourProb;
      addProbability(hitsDamagePoolPmfMap, adjustedArmourFail, armourProb);

      const evadeKey = cacheKey(adjustedArmourFail, evadeFailProb);
      const postEvadeDist =
        binomialCache.get(evadeKey) ??
        buildBinomialDistribution(adjustedArmourFail, evadeFailProb);
      binomialCache.set(evadeKey, postEvadeDist);

      for (const postEvade of postEvadeDist) {
        const finalProb = armourProb * postEvade.probability;
        expectedHealthInflictedDice += postEvade.value * finalProb;
        addProbability(hitsHealthInflictedPmfMap, postEvade.value, finalProb);

        const totalDamage = postEvade.value * input.hitsY;
        addProbability(hitsDamagePmfMap, totalDamage, finalProb);
      }
    }
  } else {
    hitsFinalFailedArmourPmfMap.set(0, 1);
    hitsDamagePoolPmfMap.set(0, 1);
    hitsHealthInflictedPmfMap.set(0, 1);
    hitsDamagePmfMap.set(0, 1);
  }

  const finalFailedArmourPmfMap = convolvePmfMaps(
    regularFinalFailedArmourPmfMap,
    hitsFinalFailedArmourPmfMap,
  );
  const damagePoolPmfMap = convolvePmfMaps(regularDamagePoolPmfMap, hitsDamagePoolPmfMap);
  const healthInflictedPmfMap = convolvePmfMaps(
    regularHealthInflictedPmfMap,
    hitsHealthInflictedPmfMap,
  );
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

    expectedRawHitDice *= normalizationFactor;
    expectedPrecisionPromotedDice *= normalizationFactor;
    expectedHitSuccesses *= normalizationFactor;
    expectedPreDodgeBypassDice *= normalizationFactor;
    expectedBypassDice *= normalizationFactor;
    expectedRawArmourFailedDice *= normalizationFactor;
    expectedFailedArmourDice *= normalizationFactor;
    expectedDamagePoolDice *= normalizationFactor;
    expectedHealthInflictedDice *= normalizationFactor;
  }

  const rawMissDice = Math.max(0, attackDice - expectedRawHitDice);
  const effectiveMissDice = Math.max(0, attackDice - expectedHitSuccesses);
  const armourDiceRolled = Math.max(
    0,
    expectedHitSuccesses - expectedBypassDice + input.hitsX,
  );
  const armourSavedDice = Math.max(0, armourDiceRolled - expectedRawArmourFailedDice);
  const toughMitigatedDice = Math.max(0, expectedRawArmourFailedDice - expectedFailedArmourDice);
  const evadedDice = input.evadeEnabled
    ? Math.max(0, expectedDamagePoolDice - expectedHealthInflictedDice)
    : 0;

  const expectedTotalDamage = pmf.reduce(
    (acc, item) => acc + item.value * item.probability,
    0,
  );

  const breakdown = {
    expected: {
      attackDice,
      rawHitDice: expectedRawHitDice,
      rawMissDice,
      precisionPromotedDice: expectedPrecisionPromotedDice,
      effectiveHitDice: expectedHitSuccesses,
      effectiveMissDice,
      preDodgeBypassDice: expectedPreDodgeBypassDice,
      bypassDice: expectedBypassDice,
      armourDiceRolled,
      armourSavedDice,
      rawArmourFailedDice: expectedRawArmourFailedDice,
      toughMitigatedDice,
      finalFailedArmourDice: expectedFailedArmourDice,
      damagePoolDice: expectedDamagePoolDice,
      evadedDice,
      healthInflictedDice: expectedHealthInflictedDice,
    },
    rates: {
      rawHitRate: safeRate(expectedRawHitDice, attackDice),
      rawMissRate: safeRate(rawMissDice, attackDice),
      effectiveHitRate: safeRate(expectedHitSuccesses, attackDice),
      effectiveMissRate: safeRate(effectiveMissDice, attackDice),
      bypassOfEffectiveHitsRate: safeRate(expectedBypassDice, expectedHitSuccesses),
      armourSaveRate: safeRate(armourSavedDice, armourDiceRolled),
      armourFailRate: safeRate(expectedRawArmourFailedDice, armourDiceRolled),
      evadeRate: input.evadeEnabled ? safeRate(evadedDice, expectedDamagePoolDice) : 0,
      damageConversionRate: safeRate(expectedHealthInflictedDice, expectedDamagePoolDice),
    },
    distributions: {
      rawHitDice: normalizeDistribution(mapToSortedDistribution(rawHitPmfMap)),
      effectiveHitDice: normalizeDistribution(mapToSortedDistribution(effectiveHitPmfMap)),
      bypassDice: normalizeDistribution(mapToSortedDistribution(bypassPmfMap)),
      finalFailedArmourDice: normalizeDistribution(
        mapToSortedDistribution(finalFailedArmourPmfMap),
      ),
      damagePoolDice: normalizeDistribution(mapToSortedDistribution(damagePoolPmfMap)),
      healthInflictedDice: normalizeDistribution(
        mapToSortedDistribution(healthInflictedPmfMap),
      ),
    },
  };

  return {
    pmf,
    expectedTotalDamage,
    expectedHitSuccesses,
    expectedBypassDice,
    expectedFailedArmourDice,
    expectedDamagePoolDice,
    expectedHealthInflictedDice,
    breakdown,
  };
}
