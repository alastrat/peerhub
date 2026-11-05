/** A loose shape check (something@domain.tld, no spaces or list separators); delivery is the real test. */
export function isEmailAddress(value: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(value);
}
