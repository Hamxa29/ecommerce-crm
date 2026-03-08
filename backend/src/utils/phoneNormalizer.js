/**
 * Normalizes Nigerian (and general) phone numbers to E.164 international format.
 * Examples:
 *   08012345678  → +2348012345678
 *   2348012345678 → +2348012345678
 *   +2348012345678 → +2348012345678
 *   8012345678   → +2348012345678
 */
export function normalizePhone(phone) {
  if (!phone) return phone;
  const digits = phone.toString().replace(/\D/g, '');

  // Already has country code with +
  if (phone.startsWith('+')) return '+' + digits;

  // Starts with 234 (Nigeria country code without +)
  if (digits.startsWith('234') && digits.length >= 13) return '+' + digits;

  // Local Nigerian format: starts with 0
  if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1);

  // Without leading 0: 7XX/8XX/9XX (10 digits)
  if (digits.length === 10 && /^[789]/.test(digits)) return '+234' + digits;

  // Fallback: prepend + as-is (could be other country)
  return '+' + digits;
}
