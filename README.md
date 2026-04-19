# StarCraft TMG Visual Dice Calculator

Interactive web calculator for **StarCraft Tabletop Miniatures Game (TMG)** attack resolution.

It computes exact probability distributions (no Monte Carlo simulation) for one attacker profile versus one target profile.

## Highlights

- Exact PMF (probability mass function) of total damage.
- Expected total damage and intermediate expected dice pools.
- Supports:
  - Optional Surge formula (`d3`, `2d3+1`, integer values).
  - `CRITICAL HIT (X)` bypass.
  - `HITS X (Y)` automatic hits.
  - `TOUGH (X)` armour mitigation.
  - Optional Evade toggle and threshold.
- Three live charts:
  - PMF by total damage.
  - Pool dice expectations (`Attack Pool -> Armour Pool -> Damage Pool -> Health Inflict`).
  - Dice outcome breakdown (hides `Evaded Dice` when Evade is disabled).
- Dark-mode UI with stronger disabled input affordances.

Combat flow used by the calculator:

`Attack Pool -> Armour Pool -> Damage Pool -> (optional Evade roll) -> Health Inflict`

## Tech Stack

- Astro 6
- React 19 (single interactive island)
- TypeScript
- Chart.js + react-chartjs-2
- Vitest + Testing Library

## Project Structure

- `src/pages/index.astro`: page shell + heading.
- `src/layouts/MainLayout.astro`: global styles/tokens/theme/footer.
- `src/components/AttackCalculator.tsx`: form UI, charts, summary panel.
- `src/lib/engine.ts`: probability engine.
- `src/lib/validation.ts`: input validation rules.
- `src/lib/dice.ts`: dice expression parsing/evaluation.

## Development

Requirements:

- Node.js 18+ (or current LTS)
- pnpm

Commands:

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

Dev server: `http://localhost:4321`

## Documentation Files

- `design.md`: current dark-mode design decisions and UI token notes.
- `attack_resolution.md`: combat flow reference used by the calculator model.
- `AGENTS.md`: project knowledge for future human/AI maintainers.

## AI Assistance

This project is developed with AI assistance for implementation, design iteration, and documentation.

## Disclaimer

- Not affiliated with Blizzard Entertainment or Archon Studio.
- Bug reports are welcome on GitHub.
