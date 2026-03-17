import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

/**
 * 1Team-style card component.
 * Zinc borders, white/zinc-900 surface, optional hover state.
 */
export function Card1T({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 bg-white p-6',
        'dark:border-zinc-800 dark:bg-zinc-900',
        hover && 'transition-all hover:border-zinc-300 hover:shadow-sm dark:hover:border-zinc-700',
        className
      )}
    >
      {children}
    </div>
  );
}
