import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
  align?: 'center' | 'left';
}

/**
 * 1Team-style section heading.
 * Matches 1team.io SectionHeading component exactly.
 * Optional eyebrow label (all-caps, tracked), title, and description.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
  align = 'center',
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">{eyebrow}</p>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl dark:text-zinc-50">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base text-zinc-600 md:text-lg dark:text-zinc-300">
          {description}
        </p>
      )}
    </div>
  );
}
