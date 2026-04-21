import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    setCanPortal(true);
  }, []);

  useEffect(() => {
    const toggleVisibility = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const current = window.scrollY;
      const progress = Math.min(100, Math.max(0, (current / maxScroll) * 100));
      setScrollProgress(progress);
      setIsVisible(current > 300);
    };

    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const ring = useMemo(() => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (scrollProgress / 100) * circumference;
    return { radius, circumference, offset };
  }, [scrollProgress]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!canPortal) {
    return null;
  }

  return createPortal(
    <button
      onClick={scrollToTop}
      type="button"
      className={cn(
        'fixed inset-x-auto left-auto !right-3 sm:!right-5 md:!right-8 bottom-[max(0.9rem,env(safe-area-inset-bottom))] sm:bottom-6 md:bottom-8 z-[90]',
        'group flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/90 text-foreground backdrop-blur-xl',
        'shadow-[0_12px_34px_-14px_hsl(var(--foreground)/0.55)]',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-14px_hsl(var(--primary)/0.45)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        'supports-[backdrop-filter]:bg-background/70'
      )}
      aria-label="Back to top"
      title="Back to top"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 48 48"
        aria-hidden
      >
        <circle
          cx="24"
          cy="24"
          r={ring.radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="2"
          className="opacity-50"
        />
        <circle
          cx="24"
          cy="24"
          r={ring.radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeDasharray={ring.circumference}
          strokeDashoffset={ring.offset}
          strokeLinecap="round"
          className="transition-all duration-200 ease-out"
        />
      </svg>

      <ArrowUp className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  , document.body);
}
