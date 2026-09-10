/**
 * Normalizes phone numbers to standard 10-digit format and E.164 (+91...) format
 */
export function normalizePhoneNumber(input: string): { raw: string; national: string; international: string; isValid: boolean } {
  if (!input) return { raw: '', national: '', international: '', isValid: false };

  // Remove whitespace, dashes, parentheses
  const cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  // Check if it is an email
  if (cleaned.includes('@')) {
    return {
      raw: cleaned.toLowerCase(),
      national: cleaned.toLowerCase(),
      international: cleaned.toLowerCase(),
      isValid: true,
    };
  }

  // Extract only numbers (and keep leading + if present)
  let digits = cleaned.replace(/[^\d]/g, '');

  // If 12 digits starting with 91 (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // If 11 digits starting with 0 (e.g. 09876543210)
  else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  const isValid = digits.length === 10 && /^[6-9]\d{9}$/.test(digits);

  return {
    raw: cleaned,
    national: digits,
    international: `+91${digits}`,
    isValid,
  };
}
