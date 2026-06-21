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

export function anonymizePrice(_price: number, _referencePrice?: number): string {
  void _price;
  void _referencePrice;
  // Express as relative value: R
  return `R (基準価格: 非表示)`;
}

export function anonymizeQuantity(_quantity: number): string {
  void _quantity;
  return "[非表示 - ポジションサイズは%で表現]";
}

export function anonymizeComment(text: string): string {
  // Remove common personal patterns
  const result = text
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[Name]")
    .replace(/\b\d{4,}\b/g, "[XXXX]");
  return result;
}
