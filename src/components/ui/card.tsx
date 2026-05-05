import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRipple } from '@/hooks/use-ripple';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

const cardVariants = cva(
  'ui-3d-card rounded-3xl border bg-card text-card-foreground shadow-[0_1px_0_0_hsl(var(--border)/0.45),0_10px_32px_-10px_rgba(15,23,42,0.1)] dark:shadow-[0_1px_0_0_hsl(var(--border)/0.15),0_16px_48px_-14px_rgba(0,0,0,0.5)] transition-all duration-300 ease-out relative overflow-hidden transform-gpu [transform-style:preserve-3d]',
  {
    variants: {
      variant: {
        default:
          'border-border hover:shadow-xl hover:[transform:translate3d(0,-0.25rem,0.02rem)_rotateX(0.65deg)] active:[transform:translate3d(0,-0.12rem,0.01rem)_rotateX(0.35deg)]',
        glass:
          'glass-card border-white/10 backdrop-blur-md hover:shadow-xl hover:[transform:translate3d(0,-0.25rem,0.02rem)_rotateX(0.65deg)] active:[transform:translate3d(0,-0.12rem,0.01rem)_rotateX(0.35deg)]',
        hover:
          'hover:shadow-xl hover:[transform:translate3d(0,-0.35rem,0.04rem)_rotateX(1deg)] active:[transform:translate3d(0,-0.18rem,0.02rem)_rotateX(0.5deg)] cursor-pointer border-border',
        gradient:
          'border-border shadow-md hover:shadow-xl hover:[transform:translate3d(0,-0.25rem,0.02rem)_rotateX(0.65deg)] active:[transform:translate3d(0,-0.12rem,0.01rem)_rotateX(0.35deg)]',
        outlined:
          'border-2 border-border hover:shadow-lg hover:[transform:translate3d(0,-0.25rem,0.02rem)_rotateX(0.65deg)] active:[transform:translate3d(0,-0.12rem,0.01rem)_rotateX(0.35deg)]',
        'gradient-border':
          'border-2 border-border hover:shadow-xl hover:[transform:translate3d(0,-0.35rem,0.04rem)_rotateX(1deg)] active:[transform:translate3d(0,-0.18rem,0.02rem)_rotateX(0.5deg)] group shadow-md',
        elevated:
          'shadow-lg border-border hover:shadow-xl hover:[transform:translate3d(0,-0.25rem,0.02rem)_rotateX(0.65deg)] active:[transform:translate3d(0,-0.12rem,0.01rem)_rotateX(0.35deg)]',
        modern:
          'border-border shadow-sm hover:shadow-xl hover:[transform:translate3d(0,-0.25rem,0.02rem)_rotateX(0.65deg)] active:[transform:translate3d(0,-0.12rem,0.01rem)_rotateX(0.35deg)]',
        depth:
          'border-border shadow-[0_2px_0_0_hsl(var(--border)/0.55),0_14px_36px_-8px_rgba(15,23,42,0.14)] dark:shadow-[0_2px_0_0_hsl(var(--border)/0.2),0_20px_50px_-10px_rgba(0,0,0,0.55)] hover:shadow-[0_3px_0_0_hsl(var(--border)/0.45),0_24px_56px_-10px_rgba(15,23,42,0.16)] dark:hover:shadow-[0_3px_0_0_hsl(var(--border)/0.25),0_28px_64px_-12px_rgba(0,0,0,0.6)] hover:[transform:translate3d(0,-0.4rem,0.06rem)_rotateX(1.1deg)] active:[transform:translate3d(0,-0.2rem,0.03rem)_rotateX(0.55deg)]',
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
