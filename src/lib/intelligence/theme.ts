import { evaluateSector } from "./sector";
import type { LayerCondition, SymbolSnapshot } from "./types";

export function evaluateTheme(params: { themeName: string; symbols: SymbolSnapshot[]; timeframe: "1D" | "1W"; capturedAt: string }): LayerCondition {
  const result = evaluateSector({ sectorName: params.themeName, symbols: params.symbols, timeframe: params.timeframe, capturedAt: params.capturedAt });
  return { ...result, layer_name: "theme" };
}
