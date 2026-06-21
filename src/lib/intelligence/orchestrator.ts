import type { LayerCondition, SymbolSnapshot } from "./types";
import { evaluateMarketRegime } from "./market-regime";
import { evaluateSector } from "./sector";
import { evaluateTheme } from "./theme";
import { evaluateSymbol } from "./symbol";

export interface ComputeAllLayersInput {
  symbolSnapshots: Record<string, SymbolSnapshot>;
  benchmarkSnapshots: Record<string, SymbolSnapshot[]>;
  sectors: Record<string, string[]>;
  themes: Record<string, string[]>;
  timeframe: "1D" | "1W";
  capturedAt: string;
}

export interface ComputeAllLayersOutput {
  market: LayerCondition | null;
  sectors: LayerCondition[];
  themes: LayerCondition[];
  symbols: LayerCondition[];
}

export function computeAllLayers(input: ComputeAllLayersInput): ComputeAllLayersOutput {
  const { symbolSnapshots, benchmarkSnapshots, sectors, themes, timeframe, capturedAt } = input;
  const nk225 = benchmarkSnapshots["Nikkei225"] ?? benchmarkSnapshots["^N225"] ?? [];
  const market = nk225.length > 0 ? evaluateMarketRegime({ benchmark: nk225, timeframe, capturedAt }) : null;
  const sectorResults: LayerCondition[] = [];
  for (const [sectorName, symbolList] of Object.entries(sectors)) {
    const snaps = symbolList.map((sym) => symbolSnapshots[sym]).filter((s): s is SymbolSnapshot => s !== undefined);
    sectorResults.push(evaluateSector({ sectorName, symbols: snaps, timeframe, capturedAt }));
  }
  const themeResults: LayerCondition[] = [];
  for (const [themeName, symbolList] of Object.entries(themes)) {
    const snaps = symbolList.map((sym) => symbolSnapshots[sym]).filter((s): s is SymbolSnapshot => s !== undefined);
    themeResults.push(evaluateTheme({ themeName, symbols: snaps, timeframe, capturedAt }));
  }
  const symbolResults: LayerCondition[] = [];
  for (const [sym, snapshot] of Object.entries(symbolSnapshots)) {
    symbolResults.push(evaluateSymbol({ symbol: sym, snapshot, timeframe, capturedAt }));
  }
  return { market, sectors: sectorResults, themes: themeResults, symbols: symbolResults };
}
