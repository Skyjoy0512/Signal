export interface OHLCVBar {
  symbol: string; date: string; open: number; high: number; low: number;
  close: number; adjustedClose: number | null; volume: number; timeframe: "1D" | "1W";
}
export interface FetchResult { bars: OHLCVBar[]; errors: Array<{ symbol: string; message: string }>; }
export interface MarketDataAdapter {
  readonly provider: string;
  fetchDailyBars(symbols: string[], from: Date, to: Date): Promise<FetchResult>;
  fetchWeeklyBars(symbols: string[], from: Date, to: Date): Promise<FetchResult>;
}
