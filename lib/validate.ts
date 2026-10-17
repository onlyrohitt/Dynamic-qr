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
