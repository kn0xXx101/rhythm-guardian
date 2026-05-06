import type { SupabaseClient } from '@supabase/supabase-js';

export type RevieweeRatingRow = {
  reviewee_id: string | null;
  rating: number | string | null;
};

/**
 * Aggregate raw review rows by reviewee (person being rated).
 * Ignores invalid or non-positive ratings.
 */
export function aggregateReviewRatingsByReviewee(
  rows: RevieweeRatingRow[]
): Record<string, { sum: number; count: number }> {
  return (rows || []).reduce(
    (acc, row) => {
      const id = row.reviewee_id;
      if (typeof id !== 'string' || !id) return acc;
      const r = Number(row.rating);
      if (!Number.isFinite(r) || r <= 0) return acc;
      if (!acc[id]) acc[id] = { sum: 0, count: 0 };
      acc[id].sum += r;
      acc[id].count += 1;
      return acc;
    },
    {} as Record<string, { sum: number; count: number }>
  );
}

/** Same rounding as ReviewsSection / search cards: one decimal. */
export function averageRatingFromSumCount(sum: number, count: number): number | null {
  if (!count || !Number.isFinite(sum)) return null;
  return Number((sum / count).toFixed(1));
}

/** Average from an in-memory review list (e.g. dialog already fetched full rows). */
export function averageRatingFromReviewList(
  reviews: ReadonlyArray<{ rating: number | string | null | undefined }>
): number {
  const valid = (reviews || [])
    .map((r) => Number(r.rating))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (valid.length === 0) return 0;
  const sum = valid.reduce((s, n) => s + n, 0);
  return Number((sum / valid.length).toFixed(1));
}

/**
 * One query: all reviews for the given reviewee user IDs.
 * `failed: true` means the caller should fall back to profile-stored aggregates if desired.
 */
export async function fetchReviewAggregatesForReviewees(
  client: SupabaseClient,
  revieweeIds: string[]
): Promise<{ byRevieweeId: Record<string, { sum: number; count: number }>; failed: boolean }> {
  const uniqueIds = [...new Set(revieweeIds.filter((id) => typeof id === 'string' && id.length > 0))];
  if (uniqueIds.length === 0) {
    return { byRevieweeId: {}, failed: false };
  }

  // Limit to prevent excessive queries
  if (uniqueIds.length > 100) {
    console.warn('fetchReviewAggregatesForReviewees: Too many IDs, limiting to 100');
    uniqueIds.splice(100);
  }

  try {
    const { data, error } = await client.from('reviews').select('reviewee_id,rating').in('reviewee_id', uniqueIds);

    if (error) {
      console.warn('fetchReviewAggregatesForReviewees:', error);
      return { byRevieweeId: {}, failed: true };
    }

    return {
      byRevieweeId: aggregateReviewRatingsByReviewee(data || []),
      failed: false,
    };
  } catch (error) {
    console.warn('fetchReviewAggregatesForReviewees exception:', error);
    return { byRevieweeId: {}, failed: true };
  }
}
