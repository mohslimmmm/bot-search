// ============================================================
// Src/Utils/Formatter.js — Mouloudia casing & string helpers
// ============================================================

/**
 * Mouloudia casing: First letter uppercase, rest lowercase.
 * Example: "EMAILADDRESS" → "Emailaddress"
 * @param {string} str
 */
export function mouloudia(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Clean a scraped string: trim whitespace and collapse internal spaces.
 * @param {string} str
 */
export function clean(str) {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Normalise a URL so it always starts with https://
 * @param {string} url
 */
export function normalizeUrl(url) {
  if (!url) return '';
  url = url.trim();
  if (url.startsWith('//'))   return 'https:' + url;
  if (!url.startsWith('http')) return 'https://' + url;
  return url;
}
