/**
 * Dashboard UI primitives — Phase 3.
 * Button / card / heading system for app chrome (light + dark aware).
 * Invitation previews use wedding theme tokens directly (see
 * components/invitation/invitation-preview.tsx), not these primitives.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1a1a1a] text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary:
    'border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10',
  danger:
    'border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-black/10 bg-white p-6 dark:border-white/10 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="text-xs uppercase tracking-[0.25em] text-[#8a6d3b] dark:text-[#c9a96a]">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      {desc && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>}
    </div>
  );
}
