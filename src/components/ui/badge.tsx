import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-md hover:-translate-y-0.5 hover:shadow-xl',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))]',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))]',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-[hsl(var(--destructive-hover))]',
        success:
          'border-transparent bg-green-600 text-white hover:bg-green-700',
        warning:
          'border-transparent bg-yellow-600 text-white hover:bg-yellow-700',
        info:
          'border-transparent bg-blue-600 text-white hover:bg-blue-700',
        outline: 'text-foreground border-border hover:bg-[hsl(var(--accent-hover))] hover:text-accent-foreground hover:border-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
