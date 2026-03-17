import { cn } from '@/lib/utils';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

/**
 * Section wrapper with standard vertical padding — matches 1team.io section rhythm.
 */
export function Section({ children, className, id }: SectionProps) {
  return (
    <section id={id} className={cn('px-4 py-16 md:py-24', className)}>
      {children}
    </section>
  );
}
