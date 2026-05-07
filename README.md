# StarCraft TMG Visual Dice Calculator

Interactive web calculator for **StarCraft Tabletop Miniatures Game (TMG)**.

## Live Deployments

- **Primary (GitHub Pages)**: https://phannawich.github.io/starcraft-tmg-dice/ (from `release` branch)
- **Development (Render)**: https://starcraft-tmg-dice.onrender.com/ (from `dev` branch)


## Highlights

- Exact PMF (probability mass function) of total damage.
- Expected total damage and intermediate expected dice pools.
- Step-by-step math breakdown with:
  - raw Hit/Miss rates from the d6 roll
  - post-Precision effective Hit/Miss rates
  - bypass, armour, and damage conversion percentages
  - expandable dice-outcome distributions for each stage
- Supports:
  - Optional Surge formula (`d3`, `2d3+1`, integer values).
  - `PRECISION (X)` failed-hit promotion into Armour Pool.
  - `CRITICAL HIT (X)` bypass.
  - `DODGE (X)` bypass reduction during Surge/Critical resolution.
  - `HITS X (Y)` automatic hits.
  - `TOUGH (X)` armour mitigation.
  - Optional Evade toggle and threshold.
- Three live charts:
  - PMF by total damage.
  - Pool dice expectations (`Attack Pool -> Armour Pool -> Damage Pool -> Health Inflict`).
  - Dice outcome breakdown (hides `Evaded Dice` when Evade is disabled).
- Expanded probability tables:
  - Total damage PMF table.
  - Expandable stage distributions (raw/effective hits, bypass, failed armour, damage pool, health-inflict dice).
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

## Deployment

This project is deployed to two separate services for different branches:

### GitHub Pages (Release Branch)
- **URL**: https://phannawich.github.io/starcraft-tmg-dice/
- **Deployment**: Automatic via `.github/workflows/deploy-pages.yml`
- **Trigger**: Pushes to `release` branch
- **Base path**: `/starcraft-tmg-dice` (subdirectory deployment)
- **Branch protection**: Only PRs from `dev` → `release` allowed (enforced by `release-source-guard.yml`)

### Render (Development Branch)
- **URL**: https://starcraft-tmg-dice.onrender.com/
- **Deployment**: Automatic via GitHub integration (uses `render.yaml`)
- **Trigger**: Pushes to `dev` branch
- **Base path**: `/` (root deployment)
- **Configuration**: See `render.yaml` at repository root

Both deployments use **environment-aware Astro configuration**:
- `astro.config.mjs` detects the `RENDER=true` environment variable
- GitHub Pages deployment uses base path `/starcraft-tmg-dice`
- Render deployment uses base path `/`

## SEO Notes

- Canonical production URL is set to **GitHub Pages** (`https://phannawich.github.io/starcraft-tmg-dice/`).
- Shared metadata is defined in `src/layouts/MainLayout.astro`:
  - meta description
  - canonical link
  - Open Graph tags
  - Twitter card tags
- Social preview image is served from `public/og-card.svg` and wired via Open Graph/Twitter image tags.
- Homepage structured data (JSON-LD `WebApplication`) is defined in `src/pages/index.astro`.
- Homepage FAQ structured data is also included for rich-search interpretation.
- Render deployments are marked `noindex, nofollow` while keeping GitHub Pages as canonical.
- Sitemap generation is enabled via `@astrojs/sitemap` for the canonical GitHub Pages build (not Render dev builds).
- `public/robots.txt` publishes crawler policy and sitemap location.

## Documentation Files

- `design.md`: current dark-mode design decisions and UI token notes.
- `attack_resolution.md`: combat flow reference used by the calculator model.
- `AGENTS.md`: project knowledge for future human/AI maintainers.

## AI Assistance

This project is developed with AI assistance for implementation, design iteration, and documentation.

## Inspiration

This project was conceptually inspired by [toadchild/40kdice](https://github.com/toadchild/40kdice), but all code in this repository was implemented independently for this calculator.

## Disclaimer

- Not affiliated with Blizzard Entertainment or Archon Studio.
