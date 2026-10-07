import { describe, expect, it } from 'vitest';
import {
  THEMES,
  getTheme,
  resolveTheme,
  isValidHexColor,
  fontStack,
  themeToCssVars,
} from '@/lib/themes/tokens';
import { themeCssText } from '@/lib/themes/css';

describe('theme registry', () => {
  it('ships 15+ themes and falls back safely', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(15);
    expect(getTheme('nope').id).toBe(THEMES[0].id);
  });

  it('validates hex colors', () => {
    expect(isValidHexColor('#8a6d3b')).toBe(true);
    expect(isValidHexColor('#fff')).toBe(true);
    expect(isValidHexColor('red')).toBe(false);
    expect(isValidHexColor('#gggggg')).toBe(false);
  });
});

describe('resolveTheme', () => {
  it('merges valid overrides over the base theme', () => {
    const t = resolveTheme('editorial', {
      accent: '#B91C1C',
      radius: '1rem',
      displayFont: 'sans',
    });
    expect(t.colors.accent).toBe('#b91c1c');
    expect(t.radius).toBe('1rem');
    expect(t.typography.display).toBe(fontStack('sans'));
    expect(t.colors.background).toBe(getTheme('editorial').colors.background);
  });

  it('rejects invalid overrides', () => {
    const t = resolveTheme('editorial', {
      accent: 'not-a-color',
      radius: 'huge',
      displayFont: 'comic-sans',
    });
    expect(t).toEqual(getTheme('editorial'));
  });
});

describe('theme CSS', () => {
  it('emits wp-* vars, motion preset, and reduced-motion guard', () => {
    const vars = themeToCssVars(getTheme('luxury'));
    expect(vars['--wp-accent']).toBe('#d4af37');
    const css = themeCssText(getTheme('editorial'));
    expect(css).toContain('.wp-theme');
    expect(css).toContain('--wp-accent');
    expect(css).toContain('prefers-reduced-motion');
  });
});
