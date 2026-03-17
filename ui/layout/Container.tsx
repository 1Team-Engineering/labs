import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard max-w-7xl container — matches 1team.io layout system.
 */
export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('mx-auto max-w-7xl px-4', className)}>
      {children}
    </div>
  );
}
