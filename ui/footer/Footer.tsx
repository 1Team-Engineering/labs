import Image from 'next/image';
import Link from 'next/link';

interface FooterColumn {
  heading: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}

const defaultColumns: FooterColumn[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Classrooms', href: '/' },
      { label: 'Settings', href: '#settings' },
    ],
  },
  {
    heading: 'Learn More',
    links: [
      { label: '1Team Technologies', href: 'https://1team.io', external: true },
      { label: 'AI Solutions', href: 'https://1team.io/#ai-solutions', external: true },
    ],
  },
];

interface FooterProps {
  columns?: FooterColumn[];
  tagline?: string;
}

/**
 * 1Team-style 4-column footer adapted for labs.1team.io.
 * Matches 1team.io visual identity: zinc borders, Inter font, logo pill.
 */
export function Footer({
  columns = defaultColumns,
  tagline = 'AI-powered interactive learning by 1Team Technologies.',
}: FooterProps) {
  return (
    <footer className="border-t border-zinc-200 px-4 py-16 dark:border-zinc-800">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
        {/* Brand column */}
        <div>
          <div className="inline-flex rounded-full bg-white px-3 py-1 dark:bg-zinc-100">
            <Image
              src="/logo/1team-logo.png"
              alt="1Team"
              width={90}
              height={26}
              className="h-6 w-auto"
            />
          </div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{tagline}</p>
        </div>

        {/* Dynamic columns */}
        {columns.map((col) => (
          <div key={col.heading}>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{col.heading}</h4>
            <ul className="mt-3 space-y-2 text-sm text-zinc-500">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="transition hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Back to 1Team column */}
        <div>
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">1Team.io</h4>
          <ul className="mt-3 space-y-2 text-sm text-zinc-500">
            <li>
              <a
                href="https://1team.io"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ← Back to 1Team
              </a>
            </li>
            <li>
              <a
                href="https://1team.io/#contact"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Contact Us
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-zinc-500">Built with ❤️ by 1Team Technologies</p>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-7xl text-xs text-zinc-500">
        © {new Date().getFullYear()} 1Team Technologies. All rights reserved.
      </p>
    </footer>
  );
}
