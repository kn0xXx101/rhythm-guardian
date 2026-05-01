import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PhoneInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * Format a Ghana phone number to +233 XX XXX XXXX format
 */
function formatGhanaPhone(value: string): string {
  // Remove all non-digits
  let digits = value.replace(/[^\d]/g, '');
  
  // Handle different input formats
  if (digits.startsWith('0') && digits.length >= 10) {
    // Convert 0501234567 to 233501234567
    digits = '233' + digits.substring(1);
  } else if (!digits.startsWith('233') && digits.length >= 9) {
    // Add Ghana country code if missing
    digits = '233' + digits;
  }
  
  // Format as +233 XX XXX XXXX
  if (digits.length >= 12) {
    return `+${digits.substring(0, 3)} ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8, 12)}`;
  } else if (digits.length >= 8) {
    return `+${digits.substring(0, 3)} ${digits.substring(3, 5)} ${digits.substring(5, 8)} ${digits.substring(8)}`;
  } else if (digits.length >= 5) {
    return `+${digits.substring(0, 3)} ${digits.substring(3, 5)} ${digits.substring(5)}`;
  } else if (digits.length >= 3) {
    return `+${digits.substring(0, 3)} ${digits.substring(3)}`;
  } else if (digits.length > 0) {
    return `+${digits}`;
  }
  
  return '';
}

/**
 * Extract raw digits from formatted phone number
 */
function extractDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => formatGhanaPhone(value));

    // Update display value when external value changes
    React.useEffect(() => {
      const formatted = formatGhanaPhone(value);
      setDisplayValue(formatted);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const formatted = formatGhanaPhone(inputValue);
      
      setDisplayValue(formatted);
      onChange?.(formatted);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter
      if ([8, 9, 27, 13, 46].includes(e.keyCode)) {
        return;
      }
      
      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey && [65, 67, 86, 88].includes(e.keyCode)) {
        return;
      }
      
      // Allow arrow keys
      if (e.keyCode >= 35 && e.keyCode <= 40) {
        return;
      }
      
      // Ensure that it's a number and stop the keypress
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    };

    return (
      <Input
        ref={ref}
        type="tel"
        className={cn(className)}
        value={displayValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="+233 50 123 4567"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export { PhoneInput };