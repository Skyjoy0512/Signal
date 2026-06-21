"use client";

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  Car,
  ChartNoAxesCombined,
  CircleDollarSign,
  Cpu,
  Factory,
  Fish,
  Flame,
  HeartPulse,
  Home,
  Landmark,
  Mountain,
  Newspaper,
  Package,
  Phone,
  Plane,
  ShieldAlert,
  ShoppingBag,
  Store,
  Truck,
  Utensils,
  Waves,
  Wrench,
} from "lucide-react";
import { displaySector, displayTheme, scoreTone } from "@/lib/market-display";

const sectorIcons: Record<string, LucideIcon> = {
  "Transportation Equipment": Car,
  "Electric Appliances": Cpu,
  "Information & Communication": Phone,
  Banks: Landmark,
  Services: BriefcaseBusiness,
  Chemicals: Factory,
  "Other Products": Package,
  Pharmaceutical: HeartPulse,
  "Wholesale Trade": Building2,
  Machinery: Wrench,
  Securities: ChartNoAxesCombined,
  "Retail Trade": Store,
  Foods: Utensils,
  "Iron & Steel": Factory,
};

const themeIcons: Record<string, LucideIcon> = {
  SEMICONDUCTOR: Cpu,
  BANKING: Banknote,
  TELECOM: Phone,
  AI: Bot,
  EXPORT: Plane,
};

const industryIcons: Record<string, LucideIcon> = {
  "1": Fish,
  "2": Mountain,
  "3": Building2,
  "4": Utensils,
  "5": ShoppingBag,
  "6": Newspaper,
  "7": Factory,
  "8": HeartPulse,
  "9": Flame,
  "10": Package,
  "11": Factory,
  "12": Factory,
  "13": Factory,
  "14": Wrench,
  "15": Wrench,
  "16": Cpu,
  "17": Car,
  "18": ChartNoAxesCombined,
  "19": Package,
  "20": Flame,
  "21": Truck,
  "22": Waves,
  "23": Plane,
  "24": Truck,
  "25": Phone,
  "26": Building2,
  "27": Store,
  "28": Landmark,
  "29": ChartNoAxesCombined,
  "30": ShieldAlert,
  "31": CircleDollarSign,
  "32": Home,
  "33": BriefcaseBusiness,
};

export function ScoreRing({ value, label, dark = false }: { value: number; label: string; dark?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tone = scoreTone(clamped);
  return (
    <div className="score-ring-wrap" style={{ color: tone.color }}>
      <div
        className="score-ring"
        style={{
          background: `conic-gradient(${tone.color} ${clamped * 3.6}deg, ${dark ? "rgba(255,255,255,0.14)" : "#e6ebf2"} 0deg)`,
        }}
      >
        <div className="score-ring-inner" style={{ background: dark ? "var(--color-deep-charcoal)" : "#ffffff" }}>
          <span className="font-mono">{clamped}</span>
        </div>
      </div>
      <div className="score-ring-label" style={{ color: dark ? "#cbd5e1" : "var(--color-muted-clay)" }}>{label}</div>
      <div className="score-ring-tone" style={{ color: tone.color }}>{tone.label}</div>
    </div>
  );
}

export function SectorIcon({ sector }: { sector: string }) {
  const Icon = sectorIcons[sector] ?? BriefcaseBusiness;
  return (
    <span className="semantic-icon" title={displaySector(sector)}>
      <Icon size={18} />
    </span>
  );
}

export function ThemeIcon({ theme }: { theme: string }) {
  const Icon = themeIcons[theme] ?? Bell;
  return (
    <span className="semantic-icon" title={displayTheme(theme)}>
      <Icon size={18} />
    </span>
  );
}

export function IndustryIcon({ code, title }: { code: string; title?: string }) {
  const Icon = industryIcons[code] ?? BriefcaseBusiness;
  return (
    <span className="semantic-icon" title={title}>
      <Icon size={18} />
    </span>
  );
}

export function StatusPill({ value, label }: { value: number; label: string }) {
  const tone = scoreTone(value);
  return (
    <span className="status-pill" style={{ color: tone.color, background: tone.bg }}>
      {label}: {Math.round(value)}
    </span>
  );
}

export function MeaningNote({ children }: { children: React.ReactNode }) {
  return <p className="meaning-note">{children}</p>;
}
