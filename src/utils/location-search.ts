const LOCATION_ALIASES: Record<string, string[]> = {
  // Keep this list intentionally small and easy to maintain.
  obuasi: ['kwabenakwa'],
};

function normalizeLocationText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s,-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeLocation(value: string): string[] {
  return normalizeLocationText(value)
    .split(/[\s,/-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getExpandedTokens(tokens: string[]): Set<string> {
  const expanded = new Set(tokens);

  for (const token of tokens) {
    const linked = LOCATION_ALIASES[token];
    if (linked) {
      for (const alias of linked) expanded.add(alias);
    }
  }

  for (const [city, aliases] of Object.entries(LOCATION_ALIASES)) {
    if (aliases.some((alias) => expanded.has(alias))) {
      expanded.add(city);
    }
  }

  return expanded;
}

/**
 * Supports city-town matching (e.g. search "Obuasi" matches "Kwabenakwa")
 * and robust normalized token matching.
 */
export function locationMatchesQuery(
  locationValue: string | null | undefined,
  queryValue: string | null | undefined
): boolean {
  const query = (queryValue || '').trim();
  if (!query) return true;

  const location = (locationValue || '').trim();
  if (!location) return false;

  const normalizedLocation = normalizeLocationText(location);
  const normalizedQuery = normalizeLocationText(query);
  if (normalizedLocation.includes(normalizedQuery)) return true;

  const locationTokens = getExpandedTokens(tokenizeLocation(location));
  const queryTokens = getExpandedTokens(tokenizeLocation(query));

  // Every query token should match one location token prefix or exact term.
  return [...queryTokens].every((queryToken) =>
    [...locationTokens].some(
      (locationToken) =>
        locationToken === queryToken ||
        locationToken.startsWith(queryToken) ||
        queryToken.startsWith(locationToken)
    )
  );
}

export function toGoogleMapsSearchUrl(value: string | null | undefined): string {
  const cleaned = (value || '').trim();
  if (!cleaned) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned)}`;
}
