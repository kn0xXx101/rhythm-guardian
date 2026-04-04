import { getSettings } from '@/api/settings';

export interface FeeBreakdown {
  totalAmount: number;
  platformFee: number;
  platformFeeRate: number;
  paystackFee: number;
  musicianPayout: number;
}

/**
 * Calculate comprehensive fee breakdown for a booking amount
 * @param amount - The total booking amount
 * @param platformCommissionRate - Optional override for platform commission rate
 * @returns Promise<FeeBreakdown> - Complete fee breakdown
 */
export async function calculateFeeBreakdown(
  amount: number,
  platformCommissionRate?: number
): Promise<FeeBreakdown> {
  let commissionRate = platformCommissionRate;
  
  // Fetch from admin settings if not provided
  if (commissionRate === undefined) {
    try {
      const settings = await getSettings();
      commissionRate = settings?.bookingPayments?.platformCommissionRate ?? 15;
    } catch (error) {
      console.error('Failed to fetch platform commission rate, using default 15%:', error);
      commissionRate = 15; // Fallback - must match Settings default
    }
  }

  const totalAmount = parseFloat(amount.toString()) || 0;
  const platformFee = totalAmount * (commissionRate / 100);
  const paystackFee = totalAmount * 0.015 + 0.50; // 1.5% + ₵0.50
  const musicianPayout = totalAmount - platformFee - paystackFee;

  return {
    totalAmount,
    platformFee,
    platformFeeRate: commissionRate,
    paystackFee,
    musicianPayout: Math.max(0, musicianPayout), // Ensure non-negative
  };
}

/**
 * Calculate platform fee only
 * @param amount - The total booking amount
 * @param platformCommissionRate - Optional override for platform commission rate
 * @returns Promise<number> - Platform fee amount
 */
export async function calculatePlatformFee(
  amount: number,
  platformCommissionRate?: number
): Promise<number> {
  const breakdown = await calculateFeeBreakdown(amount, platformCommissionRate);
  return breakdown.platformFee;
}

/**
 * Calculate Paystack processing fee
 * @param amount - The total booking amount
 * @returns number - Paystack fee amount (1.5% + ₵0.50)
 */
export function calculatePaystackFee(amount: number): number {
  return amount * 0.015 + 0.50;
}

/**
 * Calculate musician payout after all fees
 * @param amount - The total booking amount
 * @param platformCommissionRate - Optional override for platform commission rate
 * @returns Promise<number> - Net musician payout
 */
export async function calculateMusicianPayout(
  amount: number,
  platformCommissionRate?: number
): Promise<number> {
  const breakdown = await calculateFeeBreakdown(amount, platformCommissionRate);
  return breakdown.musicianPayout;
}

/**
 * Synchronous fee calculation when platform rate is already known
 * @param amount - The total booking amount
 * @param platformCommissionRate - Known platform commission rate
 * @returns FeeBreakdown - Complete fee breakdown
 */
export function calculateFeeBreakdownSync(
  amount: number,
  platformCommissionRate: number
): FeeBreakdown {
  const totalAmount = parseFloat(amount.toString()) || 0;
  const platformFee = totalAmount * (platformCommissionRate / 100);
  const paystackFee = totalAmount * 0.015 + 0.50; // 1.5% + ₵0.50
  const musicianPayout = totalAmount - platformFee - paystackFee;

  return {
    totalAmount,
    platformFee,
    platformFeeRate: platformCommissionRate,
    paystackFee,
    musicianPayout: Math.max(0, musicianPayout), // Ensure non-negative
  };
}