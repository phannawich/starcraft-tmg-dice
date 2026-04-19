# Design System Notes

Current UI direction is a **dark-mode tactical workspace** with restrained visuals and high readability.

## Theme Tokens

### Surface + Layout

- `--bg-app: #0f1218`
- `--bg-elev-1: #151a22`
- `--bg-elev-2: #1b2230`
- `--surface: var(--bg-elev-1)`

### Inputs + States

- `--bg-input: #101620`
- `--bg-input-disabled: #0d121a`
- `--line: #2b3648`
- `--line-disabled: #4a5972`
- Disabled tint pattern is a subtle diagonal repeating gradient.

### Text + Feedback

- `--text-primary: #e7ecf5`
- `--text-secondary: #a6b2c7`
- `--text-disabled: #7f8da4`
- `--danger: #ff6b6b`
- `--focus: #7fc4ff`

### Accent

- `--accent: #5bb4ff`
- `--accent-2: #39c49a`

## UI Decisions

- Dark-only mode (no runtime theme toggle).
- Same information architecture as v1; visual polish only.
- Inputs must clearly indicate disabled state:
  - muted text
  - stronger disabled border
  - striped tint
  - `not-allowed` cursor
- Focus rings are globally visible with `:focus-visible`.

## Chart Styling

- Dark-aware axis/grid/tick colors.
- Dark tooltip palette.
- Distinct dataset colors for quick category recognition.
- Pool chart stages are fixed to:
  - `Attack Pool`
  - `Armour Pool`
  - `Damage Pool`
  - `Health Inflict`
- Evade is treated as a roll against Damage Pool (not a standalone pool stage).

## Accessibility/Usability Targets

- Maintain readable contrast for all text/control states.
- Preserve clear keyboard focus indication.
- Keep form controls and chart labels readable on mobile and desktop.
