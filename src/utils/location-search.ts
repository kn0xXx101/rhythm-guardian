const LOCATION_ALIASES: Record<string, string[]> = {
  // City -> common towns/suburbs/areas people type in profiles.
  // Keep aliases lowercase and token-like where possible.
  obuasi: ['kwabenakwa', 'tutuka', 'new', 'edubiase'],
  kumasi: [
    'suame',
    'tafo',
    'asokwa',
    'ahodwo',
    'bantama',
    'kwadaso',
    'manhyia',
    'dichemso',
    'abuakwa',
    'ejisu',
    'bekwai',
    'mampong',
  ],
  accra: [
    'madina',
    'adenta',
    'legon',
    'east',
    'west',
    'achimota',
    'teshie',
    'nungua',
    'spintex',
    'kasoa',
    'dansoman',
    'osu',
    'labone',
    'cantonments',
    'dzorwulu',
    'tema',
    'kokomlemle',
    'kaneshie',
    'ablekuma',
    'lapaz',
    'ashaiman',
    'ga',
  ],
  tema: ['community', 'ashaiman', 'spintex'],
  tamale: ['sagnarigu', 'nyohini', 'kalpohin', 'yendi', 'savelugu'],
  takoradi: ['sekondi', 'kwesimintsim', 'apowa', 'effia', 'shama'],
  cape: ['coast', 'abura', 'pedu', 'ucc', 'kasoa', 'winneba'],
  koforidua: ['jumapo', 'effiduase', 'adweso', 'akim', 'akosombo', 'nsawam'],
  sunyani: ['fiapre', 'berlin', 'abantankpa', 'berekum', 'dormaa'],
  ho: ['sokode', 'bankoe', 'ssnits', 'keta', 'hohoe'],
  wa: ['kperisi', 'bamahu', 'lawra', 'nadowli'],
  bolgatanga: ['navrongo', 'bawku', 'zebilla'],
  techiman: ['kintampo', 'nkoranza'],
  goaso: ['bechem', 'duayaw', 'nkawkaw'],
  damongo: ['salaga', 'sawla'],
};

const REGION_ALIASES: Record<string, string[]> = {
  greater: ['accra', 'tema', 'ga', 'ashaiman', 'kasoa'],
  ashanti: ['kumasi', 'obuasi', 'ejisu', 'bekwai', 'mampong'],
  northern: ['tamale', 'sagnarigu', 'yendi', 'savelugu'],
  western: ['takoradi', 'sekondi', 'shama'],
  central: ['cape', 'coast', 'abura', 'winneba', 'kasoa'],
  eastern: ['koforidua', 'akim', 'akosombo', 'nsawam', 'suhum'],
  volta: ['ho', 'keta', 'hohoe'],
  oti: ['dambai', 'krachi', 'jasikan'],
  upper: ['wa', 'lawra', 'nadowli', 'bolgatanga', 'navrongo', 'bawku'],
  bono: ['sunyani', 'berekum', 'dormaa', 'techiman', 'kintampo', 'nkoranza'],
  ahafo: ['goaso', 'bechem', 'duayaw'],
  savannah: ['damongo', 'buipe'],
  north: ['nalerigu', 'walewale'],
  northeast: ['nalerigu', 'walewale'],
  uppereast: ['bolgatanga', 'navrongo', 'bawku', 'zebilla'],
  upperwest: ['wa', 'lawra', 'nadowli'],
  westernnorth: ['sefwi', 'bibiani', 'juaboso'],
  bonoeast: ['techiman', 'kintampo', 'nkoranza'],
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

  for (const token of [...expanded]) {
    const regionLinked = REGION_ALIASES[token];
    if (regionLinked) {
      for (const alias of regionLinked) expanded.add(alias);
    }
  }

  for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some((alias) => expanded.has(alias))) {
      expanded.add(region);
    }
  }

  return expanded;
}

function inferRegionTokens(value: string): string[] {
  const normalized = normalizeLocationText(value);
  if (!normalized) return [];

  // Regions are often the last comma-separated segment, e.g. "Kwabenakwa, Obuasi".
  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const lastPart = parts.length > 1 ? (parts[parts.length - 1] ?? normalized) : normalized;
  return tokenizeLocation(lastPart);
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
  const locationRegionTokens = getExpandedTokens(inferRegionTokens(location));

  // Every query token should match one location token prefix or exact term.
  return [...queryTokens].every((queryToken) => {
    const tokenMatch = [...locationTokens].some(
      (locationToken) =>
        locationToken === queryToken ||
        locationToken.startsWith(queryToken) ||
        queryToken.startsWith(locationToken)
    );
    if (tokenMatch) return true;

    return [...locationRegionTokens].some(
      (regionToken) =>
        regionToken === queryToken ||
        regionToken.startsWith(queryToken) ||
        queryToken.startsWith(regionToken)
    );
  });
}

export function toGoogleMapsSearchUrl(value: string | null | undefined): string {
  const cleaned = (value || '').trim();
  if (!cleaned) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleaned)}`;
}

export function inferLocationRegion(value: string | null | undefined): string | null {
  const cleaned = (value || '').trim();
  if (!cleaned) return null;

  const tokens = [...getExpandedTokens(tokenizeLocation(cleaned))];
  const regionToken = tokens.find((token) => Object.prototype.hasOwnProperty.call(REGION_ALIASES, token));
  if (!regionToken) return null;
  return regionToken.charAt(0).toUpperCase() + regionToken.slice(1);
}
