/**
 * Design Tokens for Rhythm Guardian
 *
 * This file contains design tokens for spacing, typography, shadows, and other design constants.
 * These tokens ensure consistency across the application and can be easily updated in one place.
 */

export const designTokens = {
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
    '4xl': '6rem', // 96px
  },

  typography: {
    fontFamily: {
      sans: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'sans-serif',
      ],
      display: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }], // 12px / 16px
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px / 20px
      base: ['1rem', { lineHeight: '1.5rem' }], // 16px / 24px
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px / 28px
      xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px / 28px
      '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px / 32px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px / 36px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px / 40px
      '5xl': ['3rem', { lineHeight: '1' }], // 48px
      '6xl': ['3.75rem', { lineHeight: '1' }], // 60px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    },
  },

  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },

  // Colored shadows for special effects
  coloredShadows: {
    primary: '0 10px 15px -3px rgb(139 92 246 / 0.3), 0 4px 6px -4px rgb(139 92 246 / 0.3)',
    success: '0 10px 15px -3px rgb(34 197 94 / 0.3), 0 4px 6px -4px rgb(34 197 94 / 0.3)',
    warning: '0 10px 15px -3px rgb(245 158 11 / 0.3), 0 4px 6px -4px rgb(245 158 11 / 0.3)',
    error: '0 10px 15px -3px rgb(239 68 68 / 0.3), 0 4px 6px -4px rgb(239 68 68 / 0.3)',
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Transition durations
  transitions: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  // Breakpoints (matching Tailwind defaults)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

/**
 * Helper function to get a design token value
 */
export function getToken(category: keyof typeof designTokens, key: string): string {
  const categoryTokens = designTokens[category] as Record<string, string>;
  return categoryTokens[key] || '';
}

/**
 * Typography presets for common use cases
 */
export const typographyPresets = {
  heading1: {
    fontSize: designTokens.typography.fontSize['4xl'],
    fontWeight: designTokens.typography.fontWeight.bold,
    lineHeight: '1.2',
    letterSpacing: designTokens.typography.letterSpacing.tight,
  },
  heading2: {
    fontSize: designTokens.typography.fontSize['3xl'],
    fontWeight: designTokens.typography.fontWeight.bold,
    lineHeight: '1.3',
    letterSpacing: designTokens.typography.letterSpacing.tight,
  },
  heading3: {
    fontSize: designTokens.typography.fontSize['2xl'],
    fontWeight: designTokens.typography.fontWeight.semibold,
    lineHeight: '1.4',
    letterSpacing: designTokens.typography.letterSpacing.normal,
  },
  body: {
    fontSize: designTokens.typography.fontSize.base,
    fontWeight: designTokens.typography.fontWeight.normal,
    lineHeight: '1.5',
  },
  caption: {
    fontSize: designTokens.typography.fontSize.sm,
    fontWeight: designTokens.typography.fontWeight.normal,
    lineHeight: '1.4',
  },
} as const;
