/**
 * PrimeVue theme token helpers for Mentor System personas.
 *
 * These tokens can be used with PrimeVue's CSS variables or
 * the upcoming design tokens API. Import them inside the Vue
 * app to dynamically switch theme colors when the active mentor
 * changes.
 */
import { mentorColorTokens, MentorThemeKey } from './tailwind.tokens';

type PrimeVueTokenSet = Record<string, string>;

export const primeVueTokens: Record<MentorThemeKey, PrimeVueTokenSet> = Object.fromEntries(
  Object.entries(mentorColorTokens).map(([id, value]) => {
    const [gradientStart, gradientEnd] = value.gradient;
    return [
      id as MentorThemeKey,
      {
        '--p-primary-color': value.base,
        '--p-primary-color-text': '#ffffff',
        '--p-menu-bg': gradientStart,
        '--p-menu-bg-hover': gradientEnd,
        '--p-chip-bg': `${value.accent}1a`,
        '--p-chip-border-color': value.accent,
        '--p-tag-bg': value.accent,
        '--p-tag-color': '#0b0f19',
      },
    ];
  })
);

/**
 * Apply theme variables to the document root.
 * Call this in a layout effect when mentor context changes.
 */
export function applyPrimeVueMentorTheme(mentor: MentorThemeKey) {
  const tokens = primeVueTokens[mentor];
  const root = document.documentElement;

  Object.entries(tokens).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });
}

/**
 * Reset theme to default (general mentor) values.
 */
export function resetPrimeVueTheme() {
  applyPrimeVueMentorTheme('general');
}
