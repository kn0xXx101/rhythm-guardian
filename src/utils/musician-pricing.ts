/** Musician pricing helpers shared by search, booking dialog, and filters. */

export function parseNumericProfileField(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : undefined;
}

export type MusicianPricingFields = {
  pricing_model?: 'hourly' | 'fixed' | null;
  hourly_rate?: unknown;
  base_price?: unknown;
  price_min?: unknown;
  price_max?: unknown;
};

/**
 * Unit rate used in the booking dialog: explicit fixed/hourly branches, then base, then hourly.
 */
export function getMusicianBookingUnitRate(m: MusicianPricingFields | null | undefined): number {
  if (!m) return 0;

  const base = parseNumericProfileField(m.base_price);
  const hourly = parseNumericProfileField(m.hourly_rate);

  if (m.pricing_model === 'fixed' && base !== undefined && base > 0) {
    return base;
  }
  if (m.pricing_model === 'hourly' && hourly !== undefined && hourly > 0) {
    return hourly;
  }
  if (base !== undefined && base > 0) return base;
  if (hourly !== undefined && hourly > 0) return hourly;
  return 0;
}

/**
 * Total is flat when fixed model, or legacy profile with base_price but no pricing_model.
 * Mirrors BookingDialog: fixed OR (!model && base_price).
 */
export function isMusicianBookingFlatTotal(m: MusicianPricingFields | null | undefined): boolean {
  if (!m) return false;
  const base = parseNumericProfileField(m.base_price);
  return m.pricing_model === 'fixed' || (!m.pricing_model && base !== undefined && base > 0);
}

export function getMusicianEstimatedBookingTotal(
  m: MusicianPricingFields | null | undefined,
  durationHours: number
): number {
  const unit = getMusicianBookingUnitRate(m);
  if (unit <= 0) return 0;
  if (isMusicianBookingFlatTotal(m)) return unit;
  return unit * Math.max(0, durationHours);
}

/**
 * One number per musician for price slider and sort: booking unit rate if present,
 * else midpoint (or edge) of price_min/max so range-only profiles are filterable.
 */
export function getMusicianComparableRate(m: MusicianPricingFields | null | undefined): number {
  const unit = getMusicianBookingUnitRate(m);
  if (unit > 0) return unit;
  const minP = parseNumericProfileField(m?.price_min);
  const maxP = parseNumericProfileField(m?.price_max);
  if (minP !== undefined && maxP !== undefined) return (minP + maxP) / 2;
  if (minP !== undefined) return minP;
  if (maxP !== undefined) return maxP;
  return 0;
}

/** Search card / list copy — follows the same model priority as booking, not “base first”. */
export type MusicianRateCardDisplay =
  | { variant: 'flat'; amount: number }
  | { variant: 'hourly'; amount: number }
  | { variant: 'range'; min?: number; max?: number }
  | { variant: 'none' };

export function getMusicianRateCardDisplay(m: MusicianPricingFields | null | undefined): MusicianRateCardDisplay {
  if (!m) return { variant: 'none' };

  const base = parseNumericProfileField(m.base_price);
  const hourly = parseNumericProfileField(m.hourly_rate);
  const minP = parseNumericProfileField(m.price_min);
  const maxP = parseNumericProfileField(m.price_max);

  if (m.pricing_model === 'hourly' && hourly !== undefined && hourly > 0) {
    return { variant: 'hourly', amount: hourly };
  }
  if (m.pricing_model === 'fixed' && base !== undefined && base > 0) {
    return { variant: 'flat', amount: base };
  }

  // No explicit model: legacy behaviour — flat total wins when base is set (matches booking).
  if (base !== undefined && base > 0) {
    return { variant: 'flat', amount: base };
  }
  if (hourly !== undefined && hourly > 0) {
    return { variant: 'hourly', amount: hourly };
  }

  if (minP !== undefined && maxP !== undefined) {
    return { variant: 'range', min: minP, max: maxP };
  }
  if (minP !== undefined) return { variant: 'range', min: minP };
  if (maxP !== undefined) return { variant: 'range', max: maxP };

  return { variant: 'none' };
}

/**
 * Matches `bookings` insert: hourly when the profile is explicitly hourly, or legacy
 * hourly-only (no model, no base, has hourly). Flat-fee / package uses `fixed`.
 */
export function isMusicianDbRowHourly(m: MusicianPricingFields | null | undefined): boolean {
  if (!m) return false;
  const hasBase = (parseNumericProfileField(m.base_price) ?? 0) > 0;
  const hasHourly = (parseNumericProfileField(m.hourly_rate) ?? 0) > 0;
  return m.pricing_model === 'hourly' || (!m.pricing_model && !hasBase && hasHourly);
}
