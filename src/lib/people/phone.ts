// Mobile numbers ("Celular") of people without a corporate email, used to
// share their personal survey link by WhatsApp.

/** Country code assumed for numbers typed without one (Kultiva's clients are Colombian). */
export const DEFAULT_PHONE_COUNTRY_CODE = "57";

/**
 * "300 123 4567", "(300) 123-4567", "+57 300.123.4567" → digits, keeping a
 * leading "+". Null when it isn't a phone number (7 to 15 digits).
 */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/[\s\-().]/g, "");
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned;
}

/**
 * The number as wa.me wants it: country code and number, digits only. A
 * number without "+" and with 10 digits or fewer is a local one, so it gets
 * the default country code; "00" is the international prefix.
 */
export function whatsAppNumber(phone: string, countryCode = DEFAULT_PHONE_COUNTRY_CODE): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  if (normalized.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.length <= 10 ? `${countryCode}${digits}` : digits;
}

/** A link that opens WhatsApp on a chat with this number, with the message typed in. */
export function whatsAppUrl(phone: string, message: string): string | null {
  const number = whatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
