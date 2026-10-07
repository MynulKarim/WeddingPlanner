import { monogramToSvg, type MonogramShape, type MonogramStyle } from '@/lib/monogram/svg';

/**
 * Reusable monogram mark. Server-safe (pure SVG string) so it renders in
 * previews, public pages, and print pipelines identically.
 */
export function MonogramMark({
  initials,
  style,
  shape,
  accent,
  ink,
  size = 96,
  className = '',
}: {
  initials: string;
  style: MonogramStyle;
  shape: MonogramShape;
  accent: string;
  ink: string;
  size?: number;
  className?: string;
}) {
  const svg = monogramToSvg({ initials, style, shape, accent, ink });
  return (
    <span
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
