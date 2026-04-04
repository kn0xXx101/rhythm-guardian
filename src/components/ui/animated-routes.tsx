import { ReactNode } from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

interface AnimatedRoutesProps {
  children: ReactNode;
}

const createPageVariants = (prefersReducedMotion: boolean) => ({
  initial: {
    opacity: prefersReducedMotion ? 1 : 0,
    y: prefersReducedMotion ? 0 : 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion ? 0 : 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: prefersReducedMotion ? 1 : 0,
    y: prefersReducedMotion ? 0 : -20,
    transition: {
      duration: prefersReducedMotion ? 0 : 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
});

export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const variants = createPageVariants(prefersReducedMotion);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        className="min-h-full w-full"
      >
        <Routes>{children}</Routes>
      </motion.div>
    </AnimatePresence>
  );
}
