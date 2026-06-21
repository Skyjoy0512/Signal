/**
 * Forbidden Symbols check.
 *
 * Symbols can be added to the forbidden list via the forbidden_symbols table
 * or programmatically. Blocked symbols cannot generate Strong or Entry signals.
 */

export interface ForbiddenCheck {
  symbol: string;
  reason: string;
  blockedAt: string;
}

/**
 * Check if a symbol is forbidden against a local or fetched list.
 */
export function isForbidden(
  symbol: string,
  forbiddenList: ForbiddenCheck[],
): ForbiddenCheck | null {
  return forbiddenList.find((f) => f.symbol === symbol) ?? null;
}

/**
 * Build a forbidden check from a DB row (for use in-memory).
 */
export function buildForbiddenCheck(params: {
  symbol: string;
  reason: string;
}): ForbiddenCheck {
  return {
    symbol: params.symbol,
    reason: params.reason,
    blockedAt: new Date().toISOString(),
  };
}
