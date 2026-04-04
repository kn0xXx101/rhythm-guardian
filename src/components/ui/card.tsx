import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRipple } from '@/hooks/use-ripple';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

const cardVariants = cva(
  'rounded-3xl border bg-card text-card-foreground shadow-sm transition-all duration-200 ease-out relative overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-border hover:shadow-xl hover:-translate-y-1',
        glass: 'glass-card border-white/10 backdrop-blur-md hover:shadow-xl hover:-translate-y-1',
        hover: 'hover:shadow-xl hover:-translate-y-2 cursor-pointer transform-gpu border-border',
        gradient: 'border-border shadow-md hover:shadow-xl hover:-translate-y-1',
        outlined: 'border-2 border-border hover:shadow-lg hover:-translate-y-1',
        'gradient-border':
          'border-2 border-border hover:shadow-xl hover:-translate-y-2 group transform-gpu shadow-md',
        elevated: 'shadow-lg border-border hover:shadow-xl hover:-translate-y-1',
        modern: 'border-border shadow-sm hover:shadow-xl hover:-translate-y-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
  tooltip?: string;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  showActionsOnHover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      onClick,
      children,
      tooltip,
      tooltipSide = 'top',
      showActionsOnHover,
      ...props
    },
    ref
  ) => {
    const { ripples, addRipple } = useRipple();
    const isClickable = !!onClick || variant === 'hover';

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isClickable) {
        addRipple(e);
      }
      onClick?.(e);
    };

    // Gradient border effect
    const hasGradientBorder = variant === 'gradient-border';

    const cardContent = (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, className }),
          isClickable && 'relative',
          hasGradientBorder && 'group',
          showActionsOnHover && 'group'
        )}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? handleClick : onClick}
        onKeyDown={
          isClickable
            ? (event: React.KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                if (event.key === ' ') {
                  event.preventDefault();
                }
                handleClick(
                  event as unknown as React.MouseEvent<HTMLDivElement, MouseEvent>
                );
              }
            }
            : undefined
        }
        {...props}
      >
        {/* Enhanced gradient border effect on hover - DISABLED */}
        {hasGradientBorder && (
          <></>
        )}

        {isClickable && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
            {ripples.map((ripple) => (
              <span
                key={ripple.id}
                className="absolute rounded-full bg-primary/20 pointer-events-none animate-ripple"
                style={{
                  left: `${ripple.x}px`,
                  top: `${ripple.y}px`,
                  width: `${ripple.size}px`,
                  height: `${ripple.size}px`,
                }}
              />
            ))}
          </div>
        )}
        {children}
      </div>
    );

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent side={tooltipSide}>
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return cardContent;
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-2 p-6 pb-4', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold leading-tight tracking-tight text-foreground', className)}
      {...props}
    >
      {children ?? <span className="sr-only">Card title</span>}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground leading-relaxed', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-2', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-4 border-t border-border/50', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

// Animated Icon Component
interface CardIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon | React.ElementType | React.ReactNode;
  className?: string;
  animated?: boolean;
}

const CardIcon = React.forwardRef<HTMLDivElement, CardIconProps>(
  ({ icon: Icon, className, animated = true, ...props }, ref) => {
    const shouldRenderAsComponent =
      typeof Icon === 'function' ||
      (Icon !== null && typeof Icon === 'object' && '$$typeof' in (Icon as any));

    const Component = Icon as any;

    return (
      <div
        ref={ref}
        className={cn(
          'text-muted-foreground transition-all duration-200 ease-out',
          animated && 'animated-icon group-hover:text-primary group-hover:scale-110',
          className
        )}
        {...props}
      >
        {shouldRenderAsComponent ? <Component className="h-4 w-4" /> : Icon}
      </div>
    );
  }
);
CardIcon.displayName = 'CardIcon';

// Progress Indicator Component
interface CardProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'error';
}

const CardProgress = React.forwardRef<HTMLDivElement, CardProgressProps>(
  (
    { value, max = 100, showLabel = false, label, variant = 'default', className, ...props },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div ref={ref} className={cn('w-full space-y-2', className)} {...props}>
        {showLabel && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label || `${value} of ${max}`}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
        <Progress
          value={percentage}
          className={cn(
            'h-2',
            variant === 'success' && '[&>div]:bg-success',
            variant === 'warning' && '[&>div]:bg-warning',
            variant === 'info' && '[&>div]:bg-info',
            variant === 'error' && '[&>div]:bg-error'
          )}
        />
      </div>
    );
  }
);
CardProgress.displayName = 'CardProgress';

// Action Buttons Overlay Component
interface CardActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const CardActions = React.forwardRef<HTMLDivElement, CardActionsProps>(
  ({ children, position = 'top-right', className, ...props }, ref) => {
    const positionClasses = {
      'top-right': 'top-3 right-3',
      'top-left': 'top-3 left-3',
      'bottom-right': 'bottom-3 right-3',
      'bottom-left': 'bottom-3 left-3',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out z-10 flex gap-2',
          positionClasses[position],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardActions.displayName = 'CardActions';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardIcon,
  CardProgress,
  CardActions,
};
