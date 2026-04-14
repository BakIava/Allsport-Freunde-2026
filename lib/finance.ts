/**
 * Format a number as German Euro currency string.
 * Examples: 1234.5 → "1.234,50 €", 0 → "0,00 €"
 */
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a German-formatted decimal string to a JS number.
 * Accepts both "1.234,56" and "1234.56" forms.
 */
export function parseDecimal(value: string): number {
  // If it contains a comma, treat as German format
  if (value.includes(",")) {
    // Remove thousands dots, replace decimal comma with dot
    return parseFloat(value.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(value);
}
