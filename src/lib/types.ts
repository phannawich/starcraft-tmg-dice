export interface AttackInput {
  modelCount: number;
  rateOfAttack: number;
  hitTarget: number;
  damagePerDie: number;
  surgeEnabled: boolean;
  surgeFormula: string;
  critX: number;
  hitsX: number;
  hitsY: number;
  armourTarget: number;
  toughX: number;
  evadeEnabled: boolean;
  evadeTarget: number;
}

export interface DistributionEntry {
  value: number;
  probability: number;
}

export interface AttackOutcome {
  pmf: DistributionEntry[];
  expectedTotalDamage: number;
  expectedHitSuccesses: number;
  expectedBypassDice: number;
  expectedFailedArmourDice: number;
  expectedDamagePoolDice: number;
  expectedHealthInflictedDice: number;
}
