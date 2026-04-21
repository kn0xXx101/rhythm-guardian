import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        'fixed inset-x-auto left-auto !right-3 sm:!right-5 md:!right-8 bottom-[max(0.9rem,env(safe-area-inset-bottom))] sm:bottom-6 md:bottom-8 z-[90] h-11 w-11 sm:h-12 sm:w-12 rounded-full transition-all duration-300',
        'bg-gradient-to-br from-primary to-secondary text-white border border-primary/30',
        'shadow-[0_10px_28px_-8px_hsl(var(--primary)/0.55)] hover:shadow-[0_14px_32px_-8px_hsl(var(--primary)/0.65)]',
        'hover:scale-105 active:scale-95',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
      aria-label="Back to top"
    >
      <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5" />
    </Button>
  );
}
