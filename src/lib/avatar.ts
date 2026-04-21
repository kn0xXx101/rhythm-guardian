const AVATAR_COLORS = [
  '#7C3AED',
  '#2563EB',
  '#059669',
  '#DB2777',
  '#EA580C',
  '#0891B2',
];

function pickColor(seed: string): string {
  const normalized = (seed || 'RG').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] || '#7C3AED';
}

export function getInitials(name?: string | null): string {
  const value = (name || '').trim();
  if (!value) return 'RG';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function buildAvatarDataUri(name?: string | null): string {
  const initials = getInitials(name);
  const bg = pickColor(name || initials);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${initials}"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#FFFFFF" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="96" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getDisplayAvatarUrl(name?: string | null, avatarUrl?: string | null): string {
  const src = (avatarUrl || '').trim();
  if (src.length > 0) return src;
  return buildAvatarDataUri(name);
}
