import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRipple } from '@/hooks/use-ripple';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))] shadow-lg hover:shadow-xl hover:scale-105',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[hsl(var(--destructive-hover))] shadow-lg hover:shadow-xl hover:scale-105',
        outline:
          'border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:scale-105',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))] shadow-lg hover:shadow-xl hover:scale-105',
        ghost: 'hover:bg-[hsl(var(--accent-hover))] hover:text-accent-foreground hover:scale-105',
        link: 'text-primary underline-offset-4 hover:underline hover:text-[hsl(var(--primary-hover))]',
        success: 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl hover:scale-105',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-lg hover:shadow-xl hover:scale-105',
        info: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl hover:scale-105',
        gradient: 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg hover:shadow-xl hover:scale-105',
      },
      size: {
        default: 'h-11 px-6 py-2.5 min-h-[44px] md:h-11 md:min-h-0',
        sm: 'h-9 px-4 py-2 min-h-[44px] md:h-9 md:min-h-0',
        lg: 'h-14 px-8 py-3.5 min-h-[44px] md:h-14 text-base',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] md:h-11 md:w-11 md:min-h-0 md:min-w-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      loadingText,
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const isSingleElementChild =
      React.Children.count(children) === 1 && React.isValidElement(children as any);
    const Comp = asChild && isSingleElementChild ? Slot : 'button';
    const { ripples, addRipple } = useRipple();

    // Disable button when loading
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled && !(asChild && isSingleElementChild)) {
        addRipple(e as React.MouseEvent<HTMLElement>);
      }
      onClick?.(e);
    };

    if (asChild && isSingleElementChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }), 'relative overflow-hidden')}
          ref={ref}
          onClick={handleClick as any}
          aria-disabled={isDisabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), 'relative overflow-hidden')}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
            }}
          />
        ))}
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading && loadingText ? loadingText : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
