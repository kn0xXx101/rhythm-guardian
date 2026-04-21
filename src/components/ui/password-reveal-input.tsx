import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PasswordRevealInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'> & {
  showPassword: boolean;
  onToggleShow: () => void;
  /** Optional leading icon (e.g. lock), absolutely positioned in the field */
  leftAdornment?: React.ReactNode;
};

/**
 * Password field with an in-input eye toggle. Uses a plain `<button>` (not `Button`) so themes
 * keep a visible, consistent icon without oversized touch chrome or ripple.
 */
const PasswordRevealInput = React.forwardRef<HTMLInputElement, PasswordRevealInputProps>(
  ({ className, showPassword, onToggleShow, leftAdornment, ...props }, ref) => {
    return (
      <div className="relative">
        {leftAdornment}
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            leftAdornment ? 'pl-9' : undefined,
            'pr-10',
            showPassword && 'font-mono text-base tracking-wide text-foreground',
            className
          )}
          {...props}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className={cn(
            'absolute right-1 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md',
            'text-muted-foreground',
            'hover:bg-muted/80 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
            'dark:hover:bg-muted/50'
          )}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          ) : (
            <Eye className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
    );
  }
);
PasswordRevealInput.displayName = 'PasswordRevealInput';

export { PasswordRevealInput };
