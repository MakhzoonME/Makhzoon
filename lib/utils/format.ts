export function formatCurrency(amount: number, currency = 'JOD'): string {
  return `${amount.toLocaleString()} ${currency}`;
}

export function truncate(str: string | null | undefined, length: number): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Derives an internal snake_case key from a user-typed label, for objects
 * (custom fields, list items, options) where the user should only ever see
 * and edit the label — the key is generated and never surfaced in the UI.
 * Falls back to `${fallback}_<random>` when the label has no latin/digit
 * characters to slug (e.g. Arabic-only labels).
 */
export function slugifyKey(str: string, fallback = 'item'): string {
  const slug = str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!slug) return `${fallback}_${Math.random().toString(36).slice(2, 8)}`;
  return /^[a-z_]/.test(slug) ? slug : `_${slug}`;
}

/** Appends a numeric suffix to `key` until it's not present in `existing`. */
export function dedupeKey(key: string, existing: Set<string>): string {
  if (!existing.has(key)) return key;
  let i = 2;
  while (existing.has(`${key}_${i}`)) i++;
  return `${key}_${i}`;
}
