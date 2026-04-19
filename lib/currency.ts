// Supported currencies for luxury resell
export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "Livre sterling" },
  { code: "USD", symbol: "$", label: "Dollar US" },
  { code: "CHF", symbol: "CHF", label: "Franc suisse" },
  { code: "JPY", symbol: "¥", label: "Yen japonais" },
];

// Approximate exchange rates to EUR (updated periodically)
// In production, these would be fetched from an API
const RATES_TO_EUR: Record<string, number> = {
  EUR: 1,
  GBP: 1.17,
  USD: 0.92,
  CHF: 1.05,
  JPY: 0.0061,
};

/**
 * Convert an amount from a given currency to EUR.
 */
export function convertToEur(amount: number, fromCurrency: string): number {
  const rate = RATES_TO_EUR[fromCurrency] ?? 1;
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Format a price with the correct currency symbol.
 */
export function formatPriceWithCurrency(amount: number | string | null, currency: string = "EUR"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (n == null || isNaN(n)) return "0,00 €";

  const cur = CURRENCIES.find((c) => c.code === currency);

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(n);
}
