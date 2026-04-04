/**
 * Format a number as Ghana Cedis (GHS)
 * @param amount The amount to format
 * @param options Optional formatting options
 * @returns Formatted currency string
 */
export const formatGHS = (amount: number, options?: Intl.NumberFormatOptions): string => {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat('en-GH', { ...defaultOptions, ...options }).format(amount);
};

/**
 * Format a number as Ghana Cedis (GHS) with the ₵ symbol
 * @param amount The amount to format
 * @returns Formatted currency string with ₵ symbol
 */
export const formatGHSWithSymbol = (amount: number | null | undefined): string => {
  const safeAmount = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  return `₵${safeAmount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
