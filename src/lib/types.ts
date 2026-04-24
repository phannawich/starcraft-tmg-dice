export interface AttackInput {
  modelCount: number;
  rateOfAttack: number;
  hitTarget: number;
  damagePerDie: number;
  precisionX: number;
  surgeEnabled: boolean;
  surgeFormula: string;
  critX: number;
  hitsX: number;
  hitsY: number;
  armourTarget: number;
  toughX: number;
  dodgeX: number;
  evadeEnabled: boolean;
  evadeTarget: number;
}

export interface DistributionEntry {
  value: number;
  probability: number;
}

export interface AttackBreakdownExpected {
  attackDice: number;
  rawHitDice: number;
  rawMissDice: number;
  precisionPromotedDice: number;
  effectiveHitDice: number;
  effectiveMissDice: number;
  preDodgeBypassDice: number;
  bypassDice: number;
  armourDiceRolled: number;
  armourSavedDice: number;
  rawArmourFailedDice: number;
  toughMitigatedDice: number;
  finalFailedArmourDice: number;
  damagePoolDice: number;
  evadedDice: number;
  healthInflictedDice: number;
}

export interface AttackBreakdownRates {
  rawHitRate: number;
  rawMissRate: number;
  effectiveHitRate: number;
  effectiveMissRate: number;
  bypassOfEffectiveHitsRate: number;
  armourSaveRate: number;
  armourFailRate: number;
  evadeRate: number;
  damageConversionRate: number;
}

export interface AttackBreakdownDistributions {
  rawHitDice: DistributionEntry[];
  effectiveHitDice: DistributionEntry[];
  bypassDice: DistributionEntry[];
  finalFailedArmourDice: DistributionEntry[];
  damagePoolDice: DistributionEntry[];
  healthInflictedDice: DistributionEntry[];
}

export interface AttackBreakdown {
  expected: AttackBreakdownExpected;
  rates: AttackBreakdownRates;
  distributions: AttackBreakdownDistributions;
}

export interface AttackOutcome {
  pmf: DistributionEntry[];
  expectedTotalDamage: number;
  expectedHitSuccesses: number;
  expectedBypassDice: number;
  expectedFailedArmourDice: number;
  expectedDamagePoolDice: number;
  expectedHealthInflictedDice: number;
  breakdown: AttackBreakdown;
}
