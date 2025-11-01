# Design Assets

This directory centralizes UI artefacts that complement the written design specifications in `# Mentor System — UI and Interaction Des.md`.

## Contents

| Item | Description |
|------|-------------|
| `tailwind.tokens.ts` | Mentor color tokens and Tailwind `extend` fragment capturing gradients, accents, and helper class builders. |
| `primevue.theme.ts` | PrimeVue-compatible CSS variable map plus helpers for applying mentor-specific themes at runtime. |
| `assets/mentorbox_UI.png` | Latest UI screenshot reference supplied by the design team (Mentor Box prototype). |

## Usage

1. **Tailwind config** – Import `tailwindThemeExtension` within the future `tailwind.config.ts` and spread it into the `theme.extend` section.
2. **PrimeVue theming** – Call `applyPrimeVueMentorTheme(mentorId)` whenever the active mentor changes; the helper automatically updates CSS variables for PrimeVue components.
3. **Static assets** – Reference `design/assets/mentorbox_UI.png` in tickets or Figma discussions until the full design system is published.

## Next Steps

- Sync these tokens with the eventual `apps/web` Tailwind and PrimeVue configuration once the frontend workspace is scaffolded.
- Replace the static screenshot with a linked Figma prototype when available; document the URL in this README.
- Add additional assets (icon sets, typography scales) as vertical slices introduce new visual elements.
