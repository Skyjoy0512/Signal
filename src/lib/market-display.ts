export const sectorJa: Record<string, string> = {
  "Transportation Equipment": "輸送用機器",
  "Electric Appliances": "電気機器",
  "Information & Communication": "情報通信",
  Banks: "銀行",
  Services: "サービス",
  Chemicals: "化学",
  "Other Products": "その他製品",
  Pharmaceutical: "医薬品",
  "Wholesale Trade": "卸売",
  Machinery: "機械",
  Securities: "証券",
  "Retail Trade": "小売",
  Foods: "食品",
  "Iron & Steel": "鉄鋼",
  UNCLASSIFIED: "未分類",
};

export const themeJa: Record<string, string> = {
  SEMICONDUCTOR: "半導体",
  BANKING: "銀行株",
  TELECOM: "通信",
  AI: "AI関連",
  EXPORT: "輸出関連",
};

export const sectorIndustryCode: Record<string, string> = {
  "Transportation Equipment": "17",
  "Electric Appliances": "16",
  "Information & Communication": "25",
  Banks: "28",
  Services: "33",
  Chemicals: "7",
  "Other Products": "19",
  Pharmaceutical: "8",
  "Wholesale Trade": "26",
  Machinery: "15",
  Securities: "29",
  "Retail Trade": "27",
  Foods: "4",
  "Iron & Steel": "12",
};

export function industryCodeForSector(key: string) {
  return sectorIndustryCode[key] ?? null;
}

export function displaySector(key: string) {
  return sectorJa[key] ?? key;
}

export function displayTheme(key: string) {
  return themeJa[key] ?? key;
}

export function scoreTone(score: number | null | undefined) {
  const value = score ?? 0;
  if (value >= 75) return { label: "強い", color: "var(--color-signal-green)", bg: "rgba(5,150,105,0.1)" };
  if (value >= 55) return { label: "中立", color: "var(--color-brass-gold)", bg: "rgba(183,121,31,0.12)" };
  return { label: "弱い", color: "#dc2626", bg: "rgba(220,38,38,0.1)" };
}

export function riskTone(risk: number | null | undefined) {
  const value = risk ?? 0;
  if (value <= 40) return { label: "低リスク", color: "var(--color-signal-green)", bg: "rgba(5,150,105,0.1)" };
  if (value <= 65) return { label: "注意", color: "var(--color-brass-gold)", bg: "rgba(183,121,31,0.12)" };
  return { label: "高リスク", color: "#dc2626", bg: "rgba(220,38,38,0.1)" };
}

export function finalScoreInsight(score: number) {
  if (score >= 80) return "最優先レビュー候補。想定水準と無効化ラインを確認。";
  if (score >= 65) return "追加確認候補。地合い・出来高・押し目を確認。";
  if (score >= 50) return "様子見。材料かテクニカル改善が必要。";
  return "見送り寄り。リスクまたはタイミングが弱い。";
}

export function themeDescription(key: string) {
  const descriptions: Record<string, string> = {
    SEMICONDUCTOR: "半導体装置・材料・検査など、半導体サイクルに連動しやすい銘柄群",
    BANKING: "金利・与信・金融政策に影響されやすい銀行/金融銘柄群",
    TELECOM: "通信キャリアや通信投資に関係するディフェンシブ寄りの銘柄群",
    AI: "AI投資、データセンター、半導体、DX需要と関連する銘柄群",
    EXPORT: "為替や海外景気の影響を受けやすい輸出関連銘柄群",
  };
  return descriptions[key] ?? "同じ材料や需給で連動しやすい関連銘柄群";
}
