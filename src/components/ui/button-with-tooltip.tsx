import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ButtonWithTooltipProps extends ButtonProps {
  tooltip?: React.ReactNode;
  tooltipDelay?: number;
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  tooltipDisabled?: boolean;
}

/**
 * Button component with integrated tooltip
 * Useful for icon-only buttons or buttons that need additional context
 */
export const ButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  ButtonWithTooltipProps
>(
  (
    {
      tooltip,
      tooltipDelay = 300,
      tooltipSide = 'top',
      tooltipDisabled = false,
      children,
      ...buttonProps
    },
    ref
  ) => {
    // If no tooltip or tooltip is disabled, just render a regular button
    if (!tooltip || tooltipDisabled) {
      return (
        <Button ref={ref} {...buttonProps}>
          {children}
        </Button>
      );
    }

    return (
      <TooltipProvider delayDuration={tooltipDelay}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button ref={ref} {...buttonProps}>
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent side={tooltipSide}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

ButtonWithTooltip.displayName = 'ButtonWithTooltip';


