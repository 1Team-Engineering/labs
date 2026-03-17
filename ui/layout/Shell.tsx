'use client';

import { cn } from '@/lib/utils';

interface ShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-page shell wrapper for the 1Team Labs UI.
 * Applies base background/text colors matching 1team.io identity.
 * Wrap your page content in this component.
 */
export function Shell({ children, className }: ShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors duration-300',
        'dark:bg-zinc-950 dark:text-zinc-100',
        className
      )}
    >
      {children}
    </div>
  );
}
