/**
 * Input validation helpers — shared between client and server.
 */

/** Validates that a string is a proper absolute HTTPS or HTTP URL */
export function isValidUrl(raw: string): boolean {
  if (!raw || raw.trim().length === 0) return false;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Normalises a URL: trim whitespace, ensure protocol present */
export function normaliseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/** Format or clean a WhatsApp input into a valid wa.me link or standard url */
export function formatWhatsAppUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // If user entered phone number or +91..., extract digits or clean it
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length >= 7) {
    return `https://wa.me/${digits}`;
  }
  return normaliseUrl(trimmed);
}

/** Format or clean an Instagram input into a valid instagram.com link */
export function formatInstagramUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // If user typed @username or just username
  const cleanHandle = trimmed.replace(/^@/, '').trim();
  if (cleanHandle && !cleanHandle.includes('/') && !cleanHandle.includes('.')) {
    return `https://instagram.com/${cleanHandle}`;
  }
  return normaliseUrl(trimmed);
}

/** Max URL length we accept */
export const MAX_URL_LENGTH = 2048;

/** Validate and return an error message, or null if OK */
export function validateDestinationUrl(raw: string): string | null {
  if (!raw || raw.trim().length === 0) return 'Destination URL cannot be empty.';
  if (raw.trim().length > MAX_URL_LENGTH)
    return `URL is too long (max ${MAX_URL_LENGTH} characters).`;
  const normalised = normaliseUrl(raw);
  if (!isValidUrl(normalised))
    return 'Please enter a valid URL (e.g. https://example.com).';
  return null;
}
