'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button1T } from '../buttons/Button';

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const defaultLinks: NavLink[] = [
  { label: 'Classrooms', href: '/' },
  { label: '← 1Team.io', href: 'https://1team.io', external: true },
];

interface NavbarProps {
  links?: NavLink[];
  ctaLabel?: string;
  ctaHref?: string;
  showThemeToggle?: boolean;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

/**
 * 1Team-style floating pill navbar adapted for labs.1team.io.
 * Matches 1team.io visual identity: transparent → frosted glass on scroll.
 */
export function Navbar({
  links = defaultLinks,
  ctaLabel = 'Open Classroom',
  ctaHref = '/',
  showThemeToggle = true,
  theme = 'light',
  onToggleTheme,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 py-3">
      <nav
        className={cn(
          'mx-auto flex max-w-7xl items-center justify-between rounded-full border px-4 py-3 transition-all',
          scrolled
            ? 'border-zinc-300/70 bg-white/80 backdrop-blur-xl dark:border-zinc-700/70 dark:bg-zinc-950/75'
            : 'border-transparent bg-transparent'
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 rounded-full bg-white px-3 py-1 dark:bg-zinc-100">
          <Image
            src="/logo/1team-logo.png"
            alt="1Team Technologies"
            width={96}
            height={28}
            className="h-6 w-auto"
          />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          {showThemeToggle && onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="rounded-full border border-zinc-300 p-2 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <Button1T asChild>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button1T>
        </div>

        {/* Mobile hamburger */}
        <button
          className="rounded-full border border-zinc-300 p-2 md:hidden dark:border-zinc-700"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-72 border-l border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <button onClick={() => setOpen(false)} className="mb-8 ml-auto block">
              <X />
            </button>
            <div className="flex flex-col gap-5">
              {links.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="text-lg text-zinc-800 dark:text-zinc-100"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-lg text-zinc-800 dark:text-zinc-100"
                  >
                    {link.label}
                  </Link>
                )
              )}
              {showThemeToggle && onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200"
                >
                  Theme {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}
              <Button1T asChild>
                <Link href={ctaHref} onClick={() => setOpen(false)}>
                  {ctaLabel}
                </Link>
              </Button1T>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </header>
  );
}
