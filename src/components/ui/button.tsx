import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useRipple } from '@/hooks/use-ripple';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-[hsl(var(--primary-hover))] shadow-md hover:shadow-xl hover:-translate-y-0.5',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-[hsl(var(--destructive-hover))] shadow-md hover:shadow-xl hover:-translate-y-0.5',
        outline:
          'border-2 border-input bg-background hover:bg-[hsl(var(--accent-hover))] hover:text-accent-foreground hover:border-primary shadow-sm hover:shadow-lg hover:-translate-y-0.5',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[hsl(var(--secondary-hover))] shadow-sm hover:shadow-lg hover:-translate-y-0.5',
        ghost: 'hover:bg-[hsl(var(--accent-hover))] hover:text-accent-foreground hover:shadow-md hover:-translate-y-0.5',
        link: 'text-primary underline-offset-4 hover:underline hover:text-[hsl(var(--primary-hover))]',
        success: 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-xl hover:-translate-y-0.5',
        warning: 'bg-yellow-600 text-white hover:bg-yellow-700 shadow-md hover:shadow-xl hover:-translate-y-0.5',
        info: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-xl hover:-translate-y-0.5',
      },
      size: {
        default: 'h-10 px-4 py-2 min-h-[44px] md:h-10 md:min-h-0',
        sm: 'h-9 rounded-lg px-3 min-h-[44px] md:h-9 md:min-h-0',
        lg: 'h-12 rounded-lg px-8 min-h-[44px] md:h-12 text-base',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px] md:h-10 md:w-10 md:min-h-0 md:min-w-0 rounded-lg',
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
