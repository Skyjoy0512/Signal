/**
 * Lightweight anonymizer for external analysis packs.
 *
 * Masks:
 * - Actual portfolio value → expressed as % of portfolio
 * - Position quantity → hidden, expressed via % allocation
 * - Broker info → removed
 * - Personal identifiers → removed
 * - Real symbol name → sector/industry only
 */

export function anonymizeSymbol(symbol: string, sector?: string, industry?: string): string {
  return `[${sector ?? "Unknown"}${industry ? ` / ${industry}` : ""}]`;
}

export function anonymizePrice(price: number, _referencePrice?: number): string {
  // Express as relative value: R
  return `R (基準価格: 非表示)`;
}

export function anonymizeQuantity(_quantity: number): string {
  return "[非表示 — ポジションサイズは%で表現]";
}

export function anonymizeComment(text: string): string {
  // Remove common personal patterns
  let result = text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[Name]")
    .replace(/\b\d{4,}\b/g, "[XXXX]");
  return result;
}
