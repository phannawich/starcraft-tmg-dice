# Attack Resolution Reference

This document summarizes the attack-flow model used by the calculator.

## Pool Flow

1. **Attack Pool**  
   Build attack dice from `modelCount * RoA`.  
   Roll to Hit. Successes move to Armour Pool.

2. **Armour Pool**  
   Defender rolls Armour.  
   Armour failures move to Damage Pool.

3. **Damage Pool**  
   Surviving dice deal damage (`dice * Damage`), optionally after Evade.

## Step-by-Step Sequence

1. **Roll to Hit**
   - Generate attack dice from models and RoA.
   - Apply Hit threshold (`2+` to `6+`).
   - Hit successes enter Armour Pool.

2. **Resolve Surge + Critical Bypass**
   - Surge result is computed from Surge formula when Surge is enabled.
   - Bypass amount uses combined cap logic: dice moved directly to Damage Pool cannot exceed available Armour Pool dice.
   - `CRITICAL HIT (X)` is modeled as an additional bypass value.

3. **Armour Resolution**
   - Defender rolls Armour threshold.
   - Failed armour dice remain threatening.
   - `TOUGH (X)` converts up to `X` armour failures into successes.

4. **Evade Resolution (Optional)**
   - Performed only when Evade is enabled in the calculator.
   - Defender rolls Evade threshold and removes successful evade dice.

5. **Damage Calculation**
   - Remaining damage dice are multiplied by per-die damage.
   - PMF and expected values are computed exactly.

## Special Inputs Modeled

- **CRITICAL HIT (X):** manual bypass contribution.
- **HITS X (Y):** automatic hits injected into Armour Pool with custom per-die damage `Y`.
- **TOUGH (X):** post-armour mitigation on failed armour dice.

## Notes

- The app focuses on probability outcomes, not casualty removal bookkeeping.
- Rules interpretation should be validated against your current table packet/errata before competitive use.
