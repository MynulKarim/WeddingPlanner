/**
 * Token-based theme system — Phase 0 foundation.
 * Components consume tokens; never copy component trees per theme.
 * Full Theme Engine UI arrives in Phase 3.
 */

export interface ThemeTypography {
  display: string;
  body: string;
  accent?: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
}

export interface ThemeTokens {
  id: string;
  label: string;
  typography: ThemeTypography;
  colors: ThemeColors;
  radius: string;
  /** Subtle motion preset id, respects prefers-reduced-motion at render time. */
  motion: 'soft' | 'still';
}

export const THEMES: ThemeTokens[] = [
  { id: 'editorial', label: 'Editorial', typography: { display: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#faf8f4', surface: '#ffffff', ink: '#1a1a1a', muted: '#6b6459', accent: '#8a6d3b', accentInk: '#ffffff' }, radius: '0.25rem', motion: 'soft' },
  { id: 'classic', label: 'Classic', typography: { display: 'Georgia, serif', body: 'Georgia, serif' }, colors: { background: '#fdfcf9', surface: '#ffffff', ink: '#2b2b2b', muted: '#77705f', accent: '#1f3a5f', accentInk: '#ffffff' }, radius: '0.375rem', motion: 'still' },
  { id: 'romantic', label: 'Romantic', typography: { display: 'Palatino, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#fff7f7', surface: '#ffffff', ink: '#4a2c2c', muted: '#9a7b7b', accent: '#c48a8a', accentInk: '#ffffff' }, radius: '1rem', motion: 'soft' },
  { id: 'botanical', label: 'Botanical', typography: { display: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#f4f7f0', surface: '#ffffff', ink: '#22301f', muted: '#67785f', accent: '#4a7c59', accentInk: '#ffffff' }, radius: '0.75rem', motion: 'soft' },
  { id: 'black-tie', label: 'Black Tie', typography: { display: 'Didot, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#0e0e0e', surface: '#1a1a1a', ink: '#f5f1e8', muted: '#a39e93', accent: '#c9a227', accentInk: '#0e0e0e' }, radius: '0.25rem', motion: 'still' },
  { id: 'royal', label: 'Royal', typography: { display: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#f7f3ea', surface: '#ffffff', ink: '#2c2340', muted: '#6f6685', accent: '#5b2d8e', accentInk: '#ffffff' }, radius: '0.5rem', motion: 'soft' },
  { id: 'modern', label: 'Modern', typography: { display: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#ffffff', surface: '#f6f6f6', ink: '#111111', muted: '#6b7280', accent: '#111111', accentInk: '#ffffff' }, radius: '0.75rem', motion: 'soft' },
  { id: 'minimal', label: 'Minimal', typography: { display: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#ffffff', surface: '#ffffff', ink: '#1f1f1f', muted: '#8a8a8a', accent: '#1f1f1f', accentInk: '#ffffff' }, radius: '0.25rem', motion: 'still' },
  { id: 'garden', label: 'Garden', typography: { display: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#fbfdf6', surface: '#ffffff', ink: '#2f3a24', muted: '#7d8b6f', accent: '#7ba05b', accentInk: '#ffffff' }, radius: '1rem', motion: 'soft' },
  { id: 'luxury', label: 'Luxury', typography: { display: 'Didot, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#101010', surface: '#181818', ink: '#efe9dc', muted: '#a89f8d', accent: '#d4af37', accentInk: '#101010' }, radius: '0.375rem', motion: 'soft' },
  { id: 'south-asian', label: 'South Asian', typography: { display: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#fff9f0', surface: '#ffffff', ink: '#4a1f1f', muted: '#9a6b4f', accent: '#b91c1c', accentInk: '#ffffff' }, radius: '0.5rem', motion: 'soft' },
  { id: 'contemporary', label: 'Contemporary', typography: { display: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#f8f7ff', surface: '#ffffff', ink: '#1e1b3a', muted: '#6f6a94', accent: '#4f46e5', accentInk: '#ffffff' }, radius: '0.75rem', motion: 'soft' },
  { id: 'coastal', label: 'Coastal', typography: { display: 'Georgia, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#f2f7f9', surface: '#ffffff', ink: '#1f3341', muted: '#6b8a99', accent: '#0e7490', accentInk: '#ffffff' }, radius: '0.75rem', motion: 'soft' },
  { id: 'traditional', label: 'Traditional', typography: { display: 'Palatino, serif', body: 'Georgia, serif' }, colors: { background: '#faf6ee', surface: '#ffffff', ink: '#3d2b1f', muted: '#8a7360', accent: '#92600f', accentInk: '#ffffff' }, radius: '0.375rem', motion: 'still' },
  { id: 'dark-luxury', label: 'Dark Luxury', typography: { display: 'Didot, serif', body: 'Inter, system-ui, sans-serif' }, colors: { background: '#0b0b0f', surface: '#15151c', ink: '#ece8df', muted: '#8f8a9e', accent: '#b08d57', accentInk: '#0b0b0f' }, radius: '0.5rem', motion: 'soft' },
];

export const DEFAULT_THEME_ID = 'editorial';

export function getTheme(id: string): ThemeTokens {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Emit CSS custom properties for a theme (used by preview + website in later phases). */
export function themeToCssVars(theme: ThemeTokens): Record<string, string> {
  return {
    '--wp-background': theme.colors.background,
    '--wp-surface': theme.colors.surface,
    '--wp-ink': theme.colors.ink,
    '--wp-muted': theme.colors.muted,
    '--wp-accent': theme.colors.accent,
    '--wp-accent-ink': theme.colors.accentInk,
    '--wp-radius': theme.radius,
    '--wp-font-display': theme.typography.display,
    '--wp-font-body': theme.typography.body,
  };
}

/** Per-wedding customization overrides merged over the base theme. */
export interface ThemeOverrides {
  background?: string;
  surface?: string;
  ink?: string;
  muted?: string;
  accent?: string;
  accentInk?: string;
  radius?: string;
  displayFont?: string;
  bodyFont?: string;
}

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

const FONT_STACKS: Record<string, string> = {
  serif: 'Georgia, serif',
  palatino: 'Palatino, "Palatino Linotype", serif',
  didot: 'Didot, "Bodoni MT", serif',
  sans: 'Inter, system-ui, sans-serif',
};

export function fontStack(id: string): string | null {
  return FONT_STACKS[id] ?? null;
}

export function fontStackIds(): string[] {
  return Object.keys(FONT_STACKS);
}

/** Sanitize + merge overrides: only valid hex colors, known fonts, safe radii. */
export function resolveTheme(baseId: string, overrides: ThemeOverrides): ThemeTokens {
  const base = getTheme(baseId);
  const pick = (v: string | undefined) =>
    v && isValidHexColor(v) ? v.trim().toLowerCase() : undefined;
  const radius =
    overrides.radius && /^\d+(\.\d+)?(rem|px)$/.test(overrides.radius.trim())
      ? overrides.radius.trim()
      : undefined;
  return {
    ...base,
    typography: {
      display: (overrides.displayFont && fontStack(overrides.displayFont)) || base.typography.display,
      body: (overrides.bodyFont && fontStack(overrides.bodyFont)) || base.typography.body,
    },
    colors: {
      background: pick(overrides.background) ?? base.colors.background,
      surface: pick(overrides.surface) ?? base.colors.surface,
      ink: pick(overrides.ink) ?? base.colors.ink,
      muted: pick(overrides.muted) ?? base.colors.muted,
      accent: pick(overrides.accent) ?? base.colors.accent,
      accentInk: pick(overrides.accentInk) ?? base.colors.accentInk,
    },
    radius: radius ?? base.radius,
  };
}
