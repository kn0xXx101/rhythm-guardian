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
  const cleanValue = value.replace(/[^\d]/g, '');
  let maskedValue = '';
  let cleanIndex = 0;

  for (let i = 0; i < maskPattern.length && cleanIndex < cleanValue.length; i++) {
    const patternChar = maskPattern[i];

    if (typeof patternChar === 'string') {
      maskedValue += patternChar;
    } else if (patternChar.test(cleanValue[cleanIndex])) {
      maskedValue += cleanValue[cleanIndex];
      cleanIndex++;
    } else {
      break;
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
