import type { Symbol } from "../supabase/types";
import type { SymbolSnapshot, LayerCondition } from "../intelligence/types";
import type { IndicatorInput } from "../indicators/types";
import type { ScoredSymbol, DailyScanResult } from "../jobs/types";
import { computeAllIndicators, computeDataConfidence } from "../indicators/calculator";
import { computeAllLayers } from "../intelligence/orchestrator";
import { InvestmentAnalysisEngine } from "../analysis";
import { generateStorylineSet } from "../storylines";

const MOCK_SYMBOLS: Symbol[] = [
  { id: "s1", symbol: "7203.T", name: "トヨタ自動車", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Transportation Equipment", industry: "自動車", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s2", symbol: "6758.T", name: "ソニーグループ", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Electric Appliances", industry: "電機・エンタメ", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s3", symbol: "9984.T", name: "ソフトバンクグループ", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Information & Communication", industry: "投資・通信", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s4", symbol: "8035.T", name: "東京エレクトロン", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Electric Appliances", industry: "半導体製造装置", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s5", symbol: "8306.T", name: "三菱UFJ FG", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Banks", industry: "銀行", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s6", symbol: "6861.T", name: "キーエンス", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Electric Appliances", industry: "FAセンサー", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s7", symbol: "6098.T", name: "リクルートHD", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Services", industry: "人材・販促", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s8", symbol: "4063.T", name: "信越化学工業", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Chemicals", industry: "半導体材料", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s9", symbol: "7974.T", name: "任天堂", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Other Products", industry: "ゲーム", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s10", symbol: "4568.T", name: "第一三共", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Pharmaceutical", industry: "医薬品", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s11", symbol: "9433.T", name: "KDDI", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Information & Communication", industry: "通信", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s12", symbol: "8058.T", name: "三菱商事", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Wholesale Trade", industry: "総合商社", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s13", symbol: "6501.T", name: "日立製作所", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Electric Appliances", industry: "総合電機", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s14", symbol: "8316.T", name: "三井住友FG", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Banks", industry: "銀行", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s15", symbol: "9432.T", name: "NTT", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Information & Communication", industry: "通信", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s16", symbol: "7267.T", name: "ホンダ", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Transportation Equipment", industry: "自動車", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s17", symbol: "7201.T", name: "日産自動車", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Transportation Equipment", industry: "自動車", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s18", symbol: "6902.T", name: "デンソー", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Transportation Equipment", industry: "自動車部品", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s19", symbol: "6857.T", name: "アドバンテスト", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Electric Appliances", industry: "半導体検査装置", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s20", symbol: "6723.T", name: "ルネサスエレクトロニクス", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Electric Appliances", industry: "半導体", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s21", symbol: "6146.T", name: "ディスコ", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Machinery", industry: "半導体装置", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s22", symbol: "8411.T", name: "みずほFG", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Banks", industry: "銀行", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s23", symbol: "8604.T", name: "野村HD", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Securities", industry: "証券", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s24", symbol: "9843.T", name: "ニトリHD", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Retail Trade", industry: "小売", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s25", symbol: "9983.T", name: "ファーストリテイリング", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Retail Trade", industry: "衣料小売", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s26", symbol: "3382.T", name: "セブン&アイHD", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Retail Trade", industry: "コンビニ", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s27", symbol: "2914.T", name: "日本たばこ産業", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Foods", industry: "食品・たばこ", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s28", symbol: "6301.T", name: "コマツ", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Machinery", industry: "建機", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s29", symbol: "6367.T", name: "ダイキン工業", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Machinery", industry: "空調", country: "JP", is_active: true, created_at: "", updated_at: "" },
  { id: "s30", symbol: "5411.T", name: "JFE HD", asset_type: "jp_stock", exchange: "TSE", currency: "JPY", sector: "Iron & Steel", industry: "鉄鋼", country: "JP", is_active: true, created_at: "", updated_at: "" },
];

const MOCK_PRICES: Record<string, [number, number]> = {
  "7203.T": [3100, 0.015], "6758.T": [14000, 0.02], "9984.T": [8500, 0.025],
  "8035.T": [35000, 0.03], "8306.T": [1800, 0.018], "6861.T": [72000, 0.022],
  "6098.T": [8500, 0.02], "4063.T": [6500, 0.022], "7974.T": [8500, 0.018],
  "4568.T": [5800, 0.02], "9433.T": [4500, 0.012], "8058.T": [3200, 0.018],
  "6501.T": [15000, 0.025], "8316.T": [9500, 0.02], "9432.T": [180, 0.01],
  "7267.T": [1700, 0.016], "7201.T": [560, 0.024], "6902.T": [2500, 0.02],
  "6857.T": [6200, 0.032], "6723.T": [2600, 0.03], "6146.T": [48000, 0.035],
  "8411.T": [3300, 0.018], "8604.T": [940, 0.02], "9843.T": [21000, 0.017],
  "9983.T": [43000, 0.019], "3382.T": [2100, 0.016], "2914.T": [4300, 0.012],
  "6301.T": [4500, 0.019], "6367.T": [21000, 0.021], "5411.T": [2200, 0.022],
};

function generateBars(symbol: string, days: number, basePrice: number, volatility: number): IndicatorInput[] {
  const bars: IndicatorInput[] = [];
  let price = basePrice;
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const change = (Math.random() - 0.48) * volatility * price;
    const open = price;
    price = Math.max(price + change, basePrice * 0.3);
    const close = price;
    const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
    bars.push({ date: d.toISOString().split("T")[0], open, high, low, close, volume: Math.round(500000 + Math.random() * 5000000) });
  }
  return bars;
}

export async function runMockScan(): Promise<DailyScanResult> {
  const startedAt = new Date().toISOString();
  const scanDate = new Date();
  const capturedAt = scanDate.toISOString();
  const dateStr = scanDate.toISOString().split("T")[0];
  const sectors: Record<string, string[]> = {
    SEMICONDUCTOR: ["8035.T", "4063.T", "6501.T", "6857.T", "6723.T", "6146.T"],
    BANKING: ["8306.T", "8316.T", "8411.T"],
    TELECOM: ["9984.T", "9432.T", "9433.T"],
  };
  const themes: Record<string, string[]> = {
    AI: ["6758.T", "9984.T", "6098.T", "6501.T", "6857.T", "6723.T"],
    EXPORT: ["7203.T", "7267.T", "6902.T", "8035.T", "6861.T", "7974.T", "6301.T", "6367.T"],
  };

  const snapshots: Record<string, SymbolSnapshot> = {};
  const benchmarkSnapshots: Record<string, SymbolSnapshot[]> = {};
  const dataConfidence: Record<string, number> = {};
  const priceHistoryBySymbol: Record<string, Array<{ close: number }>> = {};

  for (const sym of MOCK_SYMBOLS) {
    const [price, vol] = MOCK_PRICES[sym.symbol] ?? [3000, 0.02];
    const bars = generateBars(sym.symbol, 260, price, vol);
    bars.sort((a, b) => a.date.localeCompare(b.date));
    const inds = computeAllIndicators(bars);
    priceHistoryBySymbol[sym.symbol] = bars.map((bar) => ({ close: bar.close }));
    const lastInd = inds.indicators[inds.indicators.length - 1];
    const conf = computeDataConfidence({ bars, expectedBars: 60, maxAgeHours: 24, now: scanDate });
    dataConfidence[sym.symbol] = conf.score;
    if (lastInd) {
      const lb = bars[bars.length - 1];
      snapshots[sym.symbol] = { symbol: sym.symbol, close: lb.close, sma20: lastInd.sma20, sma50: lastInd.sma50, sma200: lastInd.sma200, rsi14: lastInd.rsi14, volumeRatio20d: lastInd.volumeRatio20d, return5d: lastInd.return5d, return20d: lastInd.return20d, distanceFrom52wHighPct: lastInd.distanceFrom52wHighPct, drawdownFromRecentHighPct: lastInd.drawdownFromRecentHighPct };
    }
  }

  const nkBars = generateBars("^N225", 260, 39000, 0.012);
  const nkInd = computeAllIndicators(nkBars);
  const nkLast = nkInd.indicators[nkInd.indicators.length - 1];
  const nkLb = nkBars[nkBars.length - 1];
  if (nkLast) benchmarkSnapshots["^N225"] = [{ symbol: "^N225", close: nkLb.close, sma20: nkLast.sma20, sma50: nkLast.sma50, sma200: nkLast.sma200, rsi14: nkLast.rsi14, volumeRatio20d: nkLast.volumeRatio20d, return5d: nkLast.return5d, return20d: nkLast.return20d, distanceFrom52wHighPct: nkLast.distanceFrom52wHighPct, drawdownFromRecentHighPct: nkLast.drawdownFromRecentHighPct }];

  const layerResults = computeAllLayers({ symbolSnapshots: snapshots, benchmarkSnapshots, sectors, themes, timeframe: "1D", capturedAt });
  const slMap = new Map<string, LayerCondition>();
  for (const lc of layerResults.symbols) slMap.set(lc.scope_key, lc);
  const secMap = new Map<string, string>();
  for (const [sn, sl] of Object.entries(sectors)) for (const s of sl) secMap.set(s, sn);
  const thmMap = new Map<string, string>();
  for (const [tn, tl] of Object.entries(themes)) for (const s of tl) thmMap.set(s, tn);

  const scored: ScoredSymbol[] = [];
  const analysisEngine = new InvestmentAnalysisEngine();
  for (const sym of MOCK_SYMBOLS) {
    const snap = snapshots[sym.symbol];
    if (!snap) continue;
    const sl = slMap.get(sym.symbol) ?? null;
    const sec = (() => { const n = secMap.get(sym.symbol); return n ? layerResults.sectors.find((l) => l.scope_key === n) ?? null : null; })();
    const thm = (() => { const n = thmMap.get(sym.symbol); return n ? layerResults.themes.find((l) => l.scope_key === n) ?? null : null; })();
    const analysis = analysisEngine.analyzeWithRules({
      symbol: sym.symbol,
      name: sym.name,
      snapshot: snap,
      market: layerResults.market,
      sector: sec,
      theme: thm,
      symbolLayer: sl,
      dataConfidence: dataConfidence[sym.symbol] ?? 70,
      eventBlockerActive: false,
      isForbidden: false,
      priceHistory: priceHistoryBySymbol[sym.symbol],
    });
    scored.push({ symbol: sym, snapshot: snap, layer: sl ?? { layer_name: "symbol", scope_key: sym.symbol, timeframe: "1D", captured_at: capturedAt, condition: "neutral", trend: "stable", strength: 50, risk: 50, confidence: 30, impact: "neutral", reason: "", data_confidence: 0 }, scores: analysis.scores, classification: analysis.classification });
  }
  scored.sort((a, b) => b.scores.finalEntryScore - a.scores.finalEntryScore);
  const strongSignals = scored.filter((s) => s.classification.action === "strong_entry_candidate");
  const entryCandidates = scored.filter((s) => s.classification.action === "entry_candidate");
  const watchList = scored.filter((s) => s.classification.action === "watch");
  const avoided = scored.filter((s) => s.classification.action === "avoid");
  const storylineSets = [...strongSignals, ...entryCandidates, ...watchList].slice(0, 10).map((s) => generateStorylineSet({
    scored: s,
    dataConfidence: dataConfidence[s.symbol.symbol] ?? 70,
    generatedAt: capturedAt,
  }));
  return {
    context: { date: dateStr, symbols: MOCK_SYMBOLS, snapshots, benchmarkSnapshots, sectors, themes, layerResults, dataConfidence },
    scoredSymbols: scored,
    strongSignals,
    entryCandidates,
    watchList,
    avoided,
    storylineSets,
    totalCostUsd: 0, errors: [], startedAt, finishedAt: new Date().toISOString(),
  };
}
