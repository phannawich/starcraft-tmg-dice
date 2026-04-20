# AGENTS Knowledge Base

This document is for human and AI collaborators working in this repository.

## 1) Project Mission

Build and maintain a deterministic, browser-only calculator for StarCraft TMG attack outcomes.

Core product promises:

- Exact probability results (no simulation sampling).
- Fast interactive feedback from form edits.
- Clear charts that explain how dice move through pools.

## 2) Stack and Runtime

- Framework: Astro (`src/pages/index.astro`, `src/layouts/MainLayout.astro`)
- Interactive UI: React component island (`src/components/AttackCalculator.tsx`)
- Logic: TypeScript modules in `src/lib/*`
- Charts: Chart.js via `react-chartjs-2`
- Tests: Vitest + Testing Library
- Deployment target: static hosting (no backend required)

## 3) Repository Map

- `src/pages/index.astro`  
  Page entry and header copy.

- `src/layouts/MainLayout.astro`  
  Global CSS tokens, responsive scaffolding, background, footer, shared styles.

- `src/components/AttackCalculator.tsx`  
  Input form state, validation coupling, result rendering, chart datasets, chart options.

- `src/lib/validation.ts`  
  Parses user form values and enforces constraints.

- `src/lib/engine.ts`  
  Probability engine that builds PMFs and expected values.

- `src/lib/dice.ts`  
  Dice expression parsing and distribution evaluation.

- `src/components/AttackCalculator.test.tsx`  
  UI behavior and chart-shape tests.

- `src/lib/*.test.ts`  
  Core logic tests for parser/validation/engine.

## 4) Combat Model Used in Code

High-level flow:

1. Roll to Hit.
2. Apply Precision.
3. Apply Surge + Critical bypass (with Dodge reduction).
4. Resolve Armour failures (with Tough mitigation).
5. Build Damage Pool (bypass + failed Armour dice).
6. Optionally resolve Evade against Damage Pool.
7. Convert surviving dice to total damage (Health Inflict).

Inputs currently represented in UI:

- Model count
- RoA
- Hit target
- Damage per die
- PRECISION (X)
- Surge enabled + Surge formula
- CRITICAL HIT (X)
- HITS X and HITS Y
- Armour target
- TOUGH (X)
- DODGE (X)
- Evade enabled + Evade target

Outputs:

- PMF of total damage
- Expected total damage
- Intermediate expectations:
  - expected hit successes
  - expected bypass dice
  - expected failed armour dice
  - expected damage pool dice
  - expected health-inflicting dice

## 5) Validation Rules (Important)

Current constraints include:

- Integer checks for numeric fields.
- d6 target bounds for hit/armour/evade (`2` to `6`).
- `modelCount >= 0`, `rateOfAttack > 0`, `damagePerDie > 0`.
- `precisionX`, `critX`, `hitsX`, `toughX`, `dodgeX` are non-negative.
- `hitsY > 0` when `hitsX > 0`.
- Evade target validation only enforced when Evade is enabled.
- Attack dice guardrail: `modelCount * rateOfAttack <= 60`.
- Combined armour-input guardrail: `modelCount * rateOfAttack + hitsX <= 60`.
- Surge formula syntax validated only when Surge is enabled.
- Surge dice complexity guardrails:
  - dice count `<= 60`
  - dice sides `<= 100`
  - `diceCount * diceSides <= 600`

## 6) Current UI/UX Behavior

- Dark-mode-first visual system with tokenized colors.
- Three charts are rendered when validation passes:
  - PMF by total damage
  - Pool dice expectations
  - Dice outcome breakdown
- Pool chart uses fixed stage labels: `Attack Pool`, `Armour Pool`, `Damage Pool`, `Health Inflict`.
- Outcome chart hides `Evaded Dice` when Evade is disabled.
- Disabled inputs use a stronger “locked” treatment:
  - muted text
  - stronger disabled border
  - striped tint pattern
  - `not-allowed` cursor

## 7) Design Token Notes

Main tokens live in `MainLayout.astro`.

Relevant groups:

- Surface/background tokens (`--bg-*`)
- Text tokens (`--text-*`, `--ink`, `--ink-soft`)
- Line tokens (`--line`, `--line-disabled`)
- Action/focus tokens (`--accent`, `--focus`)
- State tokens (`--danger`)

## 8) Testing and Verification

Recommended commands:

```bash
pnpm test
pnpm build
```

When modifying calculator behavior:

- Update or add unit tests for deterministic logic changes.
- Keep component tests aligned with chart label/data shape changes.

When modifying only styles/docs:

- At minimum run `pnpm test` once before merging.

## 9) Branch / Release Workflow Knowledge

Repository branch intent:

- `dev`: default working branch
- `release`: publishing branch (GitHub Pages target)

Release gate intent:

- `release` should accept merges only through PR flow from `dev`.
- Branch protection + required check should block random source branches.

## 10) Documentation Strategy

Primary docs:

- `README.md`: product + setup + usage
- `design.md`: UI/theme system decisions
- `attack_resolution.md`: attack-flow reference
- `AGENTS.md`: maintainer knowledge (this file)

Local-only notes:

- `keyword.md`
- `plan.md`
- `.codex`

These are intentionally git-ignored for privacy/noise control.

## 11) Collaboration Guardrails

- Prefer deterministic, test-backed changes.
- Keep UI readability high (especially chart labels and disabled states).
- Avoid introducing backend coupling unless explicitly requested.
- Keep rules assumptions explicit in code and docs.
- Maintain docs whenever behavior changes.
