import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, ButtonProps } from './button';

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, children, orientation = 'horizontal', variant, size, ...props }, ref) => {
    // Clone children and inject variant/size if provided
    const enhancedChildren = React.Children.map(children, (child, index) => {
      if (React.isValidElement(child) && child.type === Button) {
        return React.cloneElement(child as React.ReactElement<ButtonProps>, {
          variant: variant || child.props.variant,
          size: size || child.props.size,
          className: cn(
            // Remove rounded corners on middle buttons
            orientation === 'horizontal'
              ? index === 0
                ? 'rounded-r-none'
                : index === React.Children.count(children) - 1
                  ? 'rounded-l-none border-l-0'
                  : 'rounded-none border-l-0'
              : index === 0
                ? 'rounded-b-none'
                : index === React.Children.count(children) - 1
                  ? 'rounded-t-none border-t-0'
                  : 'rounded-none border-t-0',
            child.props.className
          ),
        });
      }
      return child;
    });

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex',
          orientation === 'horizontal' ? 'flex-row' : 'flex-col',
          className
        )}
        role="group"
        {...props}
      >
        {enhancedChildren}
      </div>
    );
  }
);
ButtonGroup.displayName = 'ButtonGroup';

export { ButtonGroup };


