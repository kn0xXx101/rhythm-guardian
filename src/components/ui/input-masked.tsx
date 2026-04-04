import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MaskPattern, applyMask, masks } from '@/lib/input-masks';
import { CheckCircle2, XCircle } from 'lucide-react';

export interface MaskedInputProps extends Omit<
  React.ComponentProps<'input'>,
  'onChange' | 'value'
> {
  mask?: MaskPattern[] | keyof typeof masks;
  value?: string;
  onChange?: (value: string) => void;
  showValidation?: boolean;
  isValid?: boolean;
  characterCount?: boolean;
  maxLength?: number;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  (
    {
      className,
      mask,
      value = '',
      onChange,
      showValidation = false,
      isValid,
      characterCount = false,
      maxLength,
      ...props
    },
    ref
  ) => {
    const [maskedValue, setMaskedValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const maskPattern = React.useMemo(() => {
      if (!mask) return null;
      if (typeof mask === 'string') {
        return masks[mask]?.pattern || null;
      }
      return mask;
    }, [mask]);

    React.useEffect(() => {
      if (maskPattern) {
        const applied = applyMask(value, maskPattern);
        setMaskedValue(applied);
      } else {
        setMaskedValue(value);
      }
       
    }, [value, maskPattern]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      let newValue = inputValue;

      if (maskPattern) {
        newValue = applyMask(inputValue, maskPattern);
      }

      setMaskedValue(newValue);
      onChange?.(newValue);
    };

    const displayValue = maskPattern ? maskedValue : value;
    const currentLength = displayValue.replace(/[^\w\s]/g, '').length;
    const hasMaxLength = maxLength !== undefined;
    const isAtLimit = hasMaxLength && currentLength >= maxLength;

    return (
      <div className="relative w-full">
        <div className="relative">
          <Input
            ref={inputRef}
            className={cn(
              showValidation &&
                isValid !== undefined &&
                (isValid
                  ? 'border-green-500 focus-visible:ring-green-500'
                  : 'border-red-500 focus-visible:ring-red-500'),
              characterCount && hasMaxLength && isAtLimit && 'pr-20',
              className
            )}
            value={displayValue}
            onChange={handleChange}
            maxLength={maskPattern ? undefined : maxLength}
            {...props}
          />
          {showValidation && isValid !== undefined && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Valid input" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" aria-label="Invalid input" />
              )}
            </div>
          )}
        </div>
        {characterCount && hasMaxLength && (
          <div
            className={cn(
              'mt-1 text-xs text-right',
              isAtLimit ? 'text-red-600' : 'text-muted-foreground'
            )}
          >
            {currentLength} / {maxLength}
          </div>
        )}
      </div>
    );
  }
);

MaskedInput.displayName = 'MaskedInput';

export { MaskedInput };
