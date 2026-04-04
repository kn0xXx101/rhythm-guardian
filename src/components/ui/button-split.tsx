import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface ButtonSplitProps extends Omit<ButtonProps, 'onClick'> {
  mainAction: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  dropdownActions: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
}

const ButtonSplit = React.forwardRef<HTMLButtonElement, ButtonSplitProps>(
  ({ mainAction, dropdownActions, className, variant, size, disabled, ...props }, ref) => {
    return (
      <div className={cn('inline-flex', className)} role="group">
        <Button
          ref={ref}
          variant={variant}
          size={size}
          disabled={disabled}
          onClick={mainAction.onClick}
          className={cn('rounded-r-none border-r-0')}
          {...props}
        >
          {mainAction.icon}
          {mainAction.label}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={variant}
              size={size}
              disabled={disabled}
              className={cn('rounded-l-none px-2')}
              aria-label="More options"
            >
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">Open dropdown menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {dropdownActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);
ButtonSplit.displayName = 'ButtonSplit';

export { ButtonSplit };


