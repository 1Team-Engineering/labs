import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';

interface Button1TProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  asChild?: boolean;
}

/**
 * 1Team-style pill button.
 * Matches 1team.io Button component exactly.
 * Use variant="primary" (default) or variant="ghost".
 * Use asChild to render as a Link or other element.
 */
export function Button1T({
  className,
  variant = 'primary',
  asChild = false,
  ...props
}: Button1TProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'rounded-full border px-6 py-3 text-sm font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary'
          ? [
              'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700',
              'dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300',
            ]
          : [
              'border-zinc-400 bg-transparent text-zinc-900 hover:border-zinc-900',
              'dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-100',
            ],
        className
      )}
      {...props}
    />
  );
}
