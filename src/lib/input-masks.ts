/**
 * Input mask utilities for formatting phone numbers, dates, etc.
 */

export type MaskPattern = string | RegExp;

export interface MaskConfig {
  pattern: MaskPattern[];
  placeholder: string;
}

/**
 * Common input masks
 */
export const masks = {
  phone: {
    pattern: [
      /\+/,
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      /\d/,
    ],
    placeholder: '+233 50 123 4567',
  },
  phoneGhana: {
    pattern: [
      /\+/,
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      /\d/,
    ],
    placeholder: '+233 50 123 4567',
  },
  phoneUS: {
    pattern: [/\(/, /\d/, /\d/, /\d/, ')', ' ', /\d/, /\d/, /\d/, '-', /\d/, /\d/, /\d/, /\d/],
    placeholder: '(555) 123-4567',
  },
  creditCard: {
    pattern: [
      /\d/,
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      /\d/,
      ' ',
      /\d/,
      /\d/,
      /\d/,
      /\d/,
    ],
    placeholder: '1234 5678 9012 3456',
  },
  date: {
    pattern: [/\d/, /\d/, '/', /\d/, /\d/, '/', /\d/, /\d/, /\d/, /\d/],
    placeholder: 'MM/DD/YYYY',
  },
  time: {
    pattern: [/\d/, /\d/, ':', /\d/, /\d/],
    placeholder: 'HH:MM',
  },
} as const;

/**
 * Apply a mask pattern to an input value
 */
export function applyMask(value: string, maskPattern: MaskPattern[]): string {
  // Clean the input value - remove all non-digits
  let cleanValue = value.replace(/[^\d]/g, '');
  
  // Handle Ghana phone numbers - convert local format to international
  if (cleanValue.startsWith('0') && cleanValue.length >= 10) {
    // Convert 0501234567 to 233501234567
    cleanValue = '233' + cleanValue.substring(1);
  } else if (!cleanValue.startsWith('233') && cleanValue.length >= 9) {
    // Add Ghana country code if missing
    cleanValue = '233' + cleanValue;
  }
  
  let maskedValue = '';
  let cleanIndex = 0;

  for (let i = 0; i < maskPattern.length && cleanIndex < cleanValue.length; i++) {
    const patternChar = maskPattern[i];

    if (typeof patternChar === 'string') {
      // Add literal characters (like +, spaces, etc.)
      maskedValue += patternChar;
    } else if (patternChar instanceof RegExp) {
      // Handle regex patterns
      if (patternChar.test(cleanValue[cleanIndex])) {
        maskedValue += cleanValue[cleanIndex];
        cleanIndex++;
      } else {
        // If character doesn't match pattern, stop processing
        break;
      }
    }
  }

  return maskedValue;
}

/**
 * Remove mask characters from a value
 */
export function removeMask(value: string): string {
  return value.replace(/[^\d]/g, '');
}

/**
 * Check if a value matches the mask pattern
 */
export function isValidMask(value: string, maskPattern: MaskPattern[]): boolean {
  const masked = applyMask(value, maskPattern);
  let valueIndex = 0;

  for (let i = 0; i < maskPattern.length; i++) {
    const patternChar = maskPattern[i];

    if (typeof patternChar === 'string') {
      if (masked[i] !== patternChar) return false;
    } else {
      if (!masked[valueIndex] || !patternChar.test(masked[valueIndex])) return false;
      valueIndex++;
    }
  }

  return true;
}
