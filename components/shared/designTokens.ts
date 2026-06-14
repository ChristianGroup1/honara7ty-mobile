/**
 * Shared design tokens for the youthful redesign.
 *
 * IMPORTANT: colors intentionally reuse the app's existing hex values so the
 * runtime night-mode patch in lib/nightMode.tsx keeps transforming them.
 * This module only adds a consistent scale for radius / spacing / shadows /
 * typography so every screen shares the same modern, rounded, airy language.
 */

export const palette = {
  navy: '#0A1124',
  accent: '#78A1BD',
  gold: '#E6D5A2',
  bg: '#F2F4F8',
  card: '#FFFFFF',
  cardMuted: '#F8FAFD',
  border: '#E3E8F1',
  text: '#0A1124',
  mutedText: '#667085',
  success: '#2D9C5A',
  warning: '#E67E22',
  danger: '#B42318',
} as const;

/** Dark theme palette — kept in sync with lib/nightMode.tsx transforms. */
export const darkPalette = {
  background: '#0B1020',
  card: '#151E31',
  cardMuted: '#1D2940',
  header: '#111A2E',
  text: '#F7FAFC',
  mutedText: '#C0C8D6',
  border: '#34425F',
  accent: palette.accent,
  tabInactive: 'rgba(220,226,238,0.62)',
  shadow: '#000000',
} as const;

/** Shared color aliases — import these instead of hardcoding hex values. */
export const NAVY = palette.navy;
export const ACCENT = palette.accent;
/** Legacy name used across the app for the accent blue. */
export const GOLD = palette.accent;
export const BG = palette.bg;

/** Header gradient stops (light + dark) for GradientSurface. */
export const headerGradient = {
  light: ['#0A1124', '#16243F', '#33506E'] as string[],
  dark: ['#0B1224', '#111A2E', '#1D2940'] as string[],
};

/** Corner radii — larger, friendlier curves. */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

/** Spacing scale (8pt-ish). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Typography scale. */
export const typography = {
  eyebrow: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.3 },
  title: { fontSize: 22, fontWeight: '800' as const, lineHeight: 30 },
  heading: { fontSize: 18, fontWeight: '800' as const, lineHeight: 25 },
  sectionTitle: { fontSize: 16, fontWeight: '900' as const },
  body: { fontSize: 14, fontWeight: '500' as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '600' as const, lineHeight: 18 },
} as const;

/**
 * Soft, modern card shadow. Uses an existing-ish shadow color so night mode
 * keeps it. Spread across a `card` and a lighter `soft` variant.
 */
export const shadow = {
  card: {
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  soft: {
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  hero: {
    shadowColor: '#0A1124',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
