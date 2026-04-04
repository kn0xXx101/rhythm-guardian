import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface PageTransitionProps {
  children: ReactNode;
}

// Animation variants factory - creates variants based on reduced motion preference
const createPageVariants = (prefersReducedMotion: boolean): Variants => ({
  initial: {
    opacity: prefersReducedMotion ? 1 : 0,
    y: prefersReducedMotion ? 0 : 20,
    scale: prefersReducedMotion ? 1 : 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: prefersReducedMotion ? 0 : 0.3,
      ease: [0.22, 1, 0.36, 1], // Custom easing for smooth feel
    },
  },
  exit: {
    opacity: prefersReducedMotion ? 1 : 0,
    y: prefersReducedMotion ? 0 : -20,
    scale: prefersReducedMotion ? 1 : 0.98,
    transition: {
      duration: prefersReducedMotion ? 0 : 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
});

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageVariants = createPageVariants(prefersReducedMotion);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        className="min-h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
