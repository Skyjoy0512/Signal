export type Company = {
  id: string;
  ticker: string;
  name: string;
  market: string;
  exchange: string;
  industry: string;
  industryCode: string;
  themeTags: string[];
  description: string;
  fiscalMonth: number;
};

export type FinancialPoint = {
  year: string;
  revenue: number;
  operatingIncome: number;
  netIncome: number;
  assets: number;
  equity: number;
  liabilities: number;
  operatingCashFlow: number;
  roe: number;
  operatingMargin: number;
};

export type MarketMetric = {
  ticker: string;
  stockPrice: number;
  marketCap: number;
  enterpriseValue: number;
  per: number;
  pbr: number;
  evEbitda: number;
  psr: number;
  dividendYield: number;
  roe: number;
  roic: number;
  roa: number;
};

export const tso33Industries = [
  ["1", "水産・農林業"],
  ["2", "鉱業"],
  ["3", "建設業"],
  ["4", "食料品"],
  ["5", "繊維製品"],
  ["6", "パルプ・紙"],
  ["7", "化学"],
  ["8", "医薬品"],
  ["9", "石油・石炭製品"],
  ["10", "ゴム製品"],
  ["11", "ガラス・土石製品"],
  ["12", "鉄鋼"],
  ["13", "非鉄金属"],
  ["14", "金属製品"],
  ["15", "機械"],
  ["16", "電気機器"],
  ["17", "輸送用機器"],
  ["18", "精密機器"],
  ["19", "その他製品"],
  ["20", "電気・ガス業"],
  ["21", "陸運業"],
  ["22", "海運業"],
  ["23", "空運業"],
  ["24", "倉庫・運輸関連業"],
  ["25", "情報・通信業"],
  ["26", "卸売業"],
  ["27", "小売業"],
  ["28", "銀行業"],
  ["29", "証券、商品先物取引業"],
  ["30", "保険業"],
  ["31", "その他金融業"],
  ["32", "不動産業"],
  ["33", "サービス業"],
] as const;

const seedCompanies: Array<Omit<Company, "id" | "market" | "exchange" | "description" | "fiscalMonth">> = [
  { ticker: "7203.T", name: "トヨタ自動車", industry: "輸送用機器", industryCode: "17", themeTags: ["自動車", "輸出関連", "次世代自動車"] },
  { ticker: "7267.T", name: "ホンダ", industry: "輸送用機器", industryCode: "17", themeTags: ["自動車", "二輪車", "輸出関連"] },
  { ticker: "6902.T", name: "デンソー", industry: "輸送用機器", industryCode: "17", themeTags: ["自動車部品", "次世代自動車"] },
  { ticker: "8035.T", name: "東京エレクトロン", industry: "電気機器", industryCode: "16", themeTags: ["半導体", "半導体製造装置"] },
  { ticker: "6857.T", name: "アドバンテスト", industry: "電気機器", industryCode: "16", themeTags: ["半導体", "半導体検査装置"] },
  { ticker: "6758.T", name: "ソニーグループ", industry: "電気機器", industryCode: "16", themeTags: ["ゲーム", "コンテンツ", "半導体"] },
  { ticker: "6501.T", name: "日立製作所", industry: "電気機器", industryCode: "16", themeTags: ["ITサービス", "インフラ", "AI関連"] },
  { ticker: "4063.T", name: "信越化学工業", industry: "化学", industryCode: "7", themeTags: ["半導体材料", "総合化学"] },
  { ticker: "4568.T", name: "第一三共", industry: "医薬品", industryCode: "8", themeTags: ["医薬品メーカー", "バイオ医療"] },
  { ticker: "4502.T", name: "武田薬品工業", industry: "医薬品", industryCode: "8", themeTags: ["医薬品メーカー", "グローバル製薬"] },
  { ticker: "4503.T", name: "アステラス製薬", industry: "医薬品", industryCode: "8", themeTags: ["医薬品メーカー"] },
  { ticker: "4578.T", name: "大塚HD", industry: "医薬品", industryCode: "8", themeTags: ["医薬品", "ヘルスケア"] },
  { ticker: "8306.T", name: "三菱UFJ FG", industry: "銀行業", industryCode: "28", themeTags: ["メガバンク", "金利上昇"] },
  { ticker: "8316.T", name: "三井住友FG", industry: "銀行業", industryCode: "28", themeTags: ["メガバンク", "高配当"] },
  { ticker: "8411.T", name: "みずほFG", industry: "銀行業", industryCode: "28", themeTags: ["メガバンク"] },
  { ticker: "9432.T", name: "NTT", industry: "情報・通信業", industryCode: "25", themeTags: ["通信キャリア", "高配当"] },
  { ticker: "9433.T", name: "KDDI", industry: "情報・通信業", industryCode: "25", themeTags: ["通信キャリア", "高配当"] },
  { ticker: "9984.T", name: "ソフトバンクグループ", industry: "情報・通信業", industryCode: "25", themeTags: ["AI関連", "投資会社"] },
  { ticker: "8058.T", name: "三菱商事", industry: "卸売業", industryCode: "26", themeTags: ["総合商社", "資源"] },
  { ticker: "8001.T", name: "伊藤忠商事", industry: "卸売業", industryCode: "26", themeTags: ["総合商社", "消費"] },
  { ticker: "9983.T", name: "ファーストリテイリング", industry: "小売業", industryCode: "27", themeTags: ["アパレル", "グローバル小売"] },
  { ticker: "3382.T", name: "セブン&アイHD", industry: "小売業", industryCode: "27", themeTags: ["コンビニ", "小売"] },
  { ticker: "9843.T", name: "ニトリHD", industry: "小売業", industryCode: "27", themeTags: ["家具", "小売"] },
  { ticker: "7974.T", name: "任天堂", industry: "その他製品", industryCode: "19", themeTags: ["ゲーム", "コンテンツ"] },
  { ticker: "6098.T", name: "リクルートHD", industry: "サービス業", industryCode: "33", themeTags: ["人材サービス", "SaaS"] },
  { ticker: "2413.T", name: "エムスリー", industry: "サービス業", industryCode: "33", themeTags: ["医療DX", "SaaS"] },
  { ticker: "6301.T", name: "コマツ", industry: "機械", industryCode: "15", themeTags: ["建設機械", "輸出関連"] },
  { ticker: "6367.T", name: "ダイキン工業", industry: "機械", industryCode: "15", themeTags: ["空調", "グローバル"] },
  { ticker: "2914.T", name: "日本たばこ産業", industry: "食料品", industryCode: "4", themeTags: ["食品", "高配当"] },
  { ticker: "5411.T", name: "JFE HD", industry: "鉄鋼", industryCode: "12", themeTags: ["鉄鋼", "素材"] },
];

export const companies: Company[] = seedCompanies.map((company, index) => ({
  ...company,
  id: company.ticker,
  market: "プライム",
  exchange: "東証",
  description: `${company.name}は${company.industry}に属する日本株サンプル企業です。主要テーマは${company.themeTags.join("、")}です。`,
  fiscalMonth: 3 + (index % 3) * 3,
}));

export function getCompany(ticker: string) {
  return companies.find((company) => company.ticker === ticker);
}

export function financialsFor(ticker: string): FinancialPoint[] {
  const seed = [...ticker].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const baseRevenue = 1000 + (seed % 18) * 280;
  const marginBase = 6 + (seed % 12);
  const debtRatio = 0.28 + (seed % 5) * 0.07;
  return ["2022", "2023", "2024", "2025", "2026E"].map((year, index) => {
    const revenue = Math.round(baseRevenue * (1 + index * (0.035 + (seed % 6) / 100)));
    const operatingIncome = Math.round(revenue * ((marginBase + index * 0.7) / 100));
    const netIncome = Math.round(operatingIncome * 0.62);
    const assets = Math.round(revenue * (1.55 + (seed % 5) / 10));
    const equity = Math.round(assets * (1 - debtRatio));
    const liabilities = assets - equity;
    return {
      year,
      revenue,
      operatingIncome,
      netIncome,
      assets,
      equity,
      liabilities,
      operatingCashFlow: Math.round(netIncome * 1.12),
      roe: Math.round((netIncome / equity) * 1000) / 10,
      operatingMargin: Math.round((operatingIncome / revenue) * 1000) / 10,
    };
  });
}

export function metricsFor(ticker: string): MarketMetric {
  const seed = [...ticker].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const stockPrice = 800 + (seed % 120) * 130;
  const marketCap = stockPrice * (500 + (seed % 80) * 40);
  const per = Math.round((10 + (seed % 25) * 0.9) * 10) / 10;
  const pbr = Math.round((0.7 + (seed % 22) * 0.13) * 10) / 10;
  return {
    ticker,
    stockPrice,
    marketCap: Math.round(marketCap),
    enterpriseValue: Math.round(marketCap * (1.05 + (seed % 5) / 20)),
    per,
    pbr,
    evEbitda: Math.round((5 + (seed % 18) * 0.55) * 10) / 10,
    psr: Math.round((0.5 + (seed % 18) * 0.18) * 10) / 10,
    dividendYield: Math.round((0.6 + (seed % 35) * 0.08) * 10) / 10,
    roe: Math.round((6 + (seed % 18) * 0.8) * 10) / 10,
    roic: Math.round((4 + (seed % 16) * 0.7) * 10) / 10,
    roa: Math.round((2 + (seed % 13) * 0.5) * 10) / 10,
  };
}

export function enrichedCompanies() {
  return companies.map((company) => {
    const financials = financialsFor(company.ticker);
    const latest = financials[financials.length - 1];
    const metrics = metricsFor(company.ticker);
    return { ...company, latest, metrics };
  });
}

export function industrySummary() {
  return tso33Industries.map(([code, name]) => {
    const rows = enrichedCompanies().filter((company) => company.industryCode === code);
    const revenue = rows.reduce((sum, company) => sum + company.latest.revenue, 0);
    const avgMargin = rows.length ? rows.reduce((sum, company) => sum + company.latest.operatingMargin, 0) / rows.length : 0;
    const avgRoe = rows.length ? rows.reduce((sum, company) => sum + company.latest.roe, 0) / rows.length : 0;
    return {
      code,
      name,
      count: rows.length,
      revenue: Math.round(revenue),
      avgMargin: Math.round(avgMargin * 10) / 10,
      avgRoe: Math.round(avgRoe * 10) / 10,
    };
  });
}
