/**
 * Theme CSS emission — Phase 3.
 * Produces a <style> payload so themed invitations render identically in
 * previews, public pages, and (later) print/PDF pipelines from one source.
 */
import { themeToCssVars, type ThemeTokens } from '@/lib/themes/tokens';

/** CSS declarations for the wp-* custom properties. */
export function themeCssText(theme: ThemeTokens, selector = '.wp-theme'): string {
  const vars = themeToCssVars(theme);
  const decls = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${decls}\n}\n${selector} .wp-motion {\n  transition-duration: ${theme.motion === 'soft' ? '240ms' : '0ms'};\n}\n@media (prefers-reduced-motion: reduce) {\n  ${selector} .wp-motion {\n    transition-duration: 0ms;\n    animation: none;\n  }\n}`;
}
