import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface TextareaWithCounterProps extends React.ComponentProps<'textarea'> {
  maxLength?: number;
  showValidation?: boolean;
  isValid?: boolean;
  currentLength?: number;
}

const TextareaWithCounter = React.forwardRef<HTMLTextAreaElement, TextareaWithCounterProps>(
  (
    {
      className,
      maxLength,
      showValidation = false,
      isValid,
      currentLength,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [length, setLength] = React.useState(
      currentLength ?? (typeof value === 'string' ? value.length : 0)
    );

    React.useEffect(() => {
      if (typeof value === 'string') {
        setLength(value.length);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (!maxLength || newValue.length <= maxLength) {
        setLength(newValue.length);
        onChange?.(e);
      }
    };

    const isAtLimit = maxLength !== undefined && length >= maxLength;
    const remainingChars = maxLength !== undefined ? maxLength - length : undefined;

    return (
      <div className="relative w-full">
        <div className="relative">
          <Textarea
            ref={ref}
            className={cn(
              showValidation &&
                isValid !== undefined &&
                (isValid
                  ? 'border-green-500 focus-visible:ring-green-500'
                  : 'border-red-500 focus-visible:ring-red-500'),
              maxLength && 'pb-8',
              className
            )}
            value={value}
            onChange={handleChange}
            maxLength={maxLength}
            {...props}
          />
          {showValidation && isValid !== undefined && (
            <div className="absolute right-3 top-3">
              {isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Valid input" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" aria-label="Invalid input" />
              )}
            </div>
          )}
        </div>
        {maxLength !== undefined && (
          <div
            className={cn(
              'absolute bottom-2 right-3 text-xs',
              isAtLimit
                ? 'text-red-600 font-medium'
                : remainingChars && remainingChars <= 10
                  ? 'text-yellow-600'
                  : 'text-muted-foreground'
            )}
          >
            {length} / {maxLength}
            {remainingChars !== undefined && remainingChars <= 10 && remainingChars > 0 && (
              <span className="ml-1">({remainingChars} remaining)</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

TextareaWithCounter.displayName = 'TextareaWithCounter';

export { TextareaWithCounter };
