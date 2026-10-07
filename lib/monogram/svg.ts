/**
 * Monogram SVG generation — Phase 3 (pure, unit-tested).
 * Renders couple initials as a reusable SVG mark (seal / crest / minimal).
 * Output is transparent-background SVG; safe to embed (inputs validated).
 */

export const MONOGRAM_STYLES = ['serif', 'script', 'modern', 'traditional'] as const;
export type MonogramStyle = (typeof MONOGRAM_STYLES)[number];

export const MONOGRAM_SHAPES = ['seal', 'crest', 'minimal'] as const;
export type MonogramShape = (typeof MONOGRAM_SHAPES)[number];

const STYLE_FONTS: Record<MonogramStyle, string> = {
  serif: 'Georgia, serif',
  script: '"Snell Roundhand", "Brush Script MT", cursive',
  modern: 'Inter, system-ui, sans-serif',
  traditional: 'Palatino, "Palatino Linotype", serif',
};

const INITIALS_RE = /^[A-Za-z&·. ]{1,6}$/;

export function isValidInitials(value: string): boolean {
  return INITIALS_RE.test(value.trim());
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface MonogramSpec {
  initials: string;
  style: MonogramStyle;
  shape: MonogramShape;
  /** Accent color for ring/frame. */
  accent: string;
  /** Ink color for lettering. */
  ink: string;
}

export function monogramToSvg(spec: MonogramSpec): string {
  const initials = escapeXml(spec.initials.trim().slice(0, 6) || '·');
  const font = STYLE_FONTS[spec.style] ?? STYLE_FONTS.serif;
  const size = 120;
  const cx = size / 2;
  const ring =
    spec.shape === 'seal'
      ? `<circle cx="${cx}" cy="${cx}" r="54" fill="none" stroke="${spec.accent}" stroke-width="2"/><circle cx="${cx}" cy="${cx}" r="47" fill="none" stroke="${spec.accent}" stroke-width="1"/>`
      : spec.shape === 'crest'
        ? `<rect x="14" y="14" width="92" height="92" rx="6" fill="none" stroke="${spec.accent}" stroke-width="2"/><rect x="20" y="20" width="80" height="80" rx="3" fill="none" stroke="${spec.accent}" stroke-width="1"/>`
        : '';
  const fontSize = initials.length <= 2 ? 40 : initials.length <= 4 ? 30 : 22;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Monogram ${initials}">` +
    ring +
    `<text x="${cx}" y="${cx + fontSize * 0.36}" text-anchor="middle" font-family="${font}" font-size="${fontSize}" fill="${spec.ink}">${initials}</text>` +
    `</svg>`
  );
}
