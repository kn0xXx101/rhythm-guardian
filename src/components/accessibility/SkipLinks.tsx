import React from 'react';
import { cn } from '@/lib/utils';

interface SkipLink {
  href: string;
  label: string;
}

const defaultSkipLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
];

interface SkipLinksProps {
  links?: SkipLink[];
}

/**
 * SkipLinks component provides keyboard navigation shortcuts to major sections of the page.
 * These links are hidden by default and appear when focused, allowing keyboard users to
 * quickly jump to important sections without navigating through all content.
 */
export function SkipLinks({ links = defaultSkipLinks }: SkipLinksProps) {
  return (
    <nav
      aria-label="Skip navigation links"
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:z-[100] focus-within:left-4 focus-within:top-4 focus-within:p-4"
    >
      <ul className="flex flex-col gap-2">
        {links.map((link, index) => (
          <li key={index}>
            <a
              href={link.href}
              className={cn(
                'inline-block px-4 py-2 bg-primary text-primary-foreground',
                'rounded-md font-medium shadow-lg',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'hover:bg-primary/90 hover:shadow-xl'
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
