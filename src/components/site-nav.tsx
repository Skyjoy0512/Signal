"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const navItems = [
  { href: "/dashboard", label: "ダッシュボード" },
  { href: "/candidates", label: "候補銘柄" },
  { href: "/companies", label: "企業検索" },
  { href: "/industries", label: "業界" },
  { href: "/screening", label: "条件検索" },
  { href: "/compare", label: "企業比較" },
  { href: "/positions", label: "ポジション" },
  { href: "/review", label: "レビュー" },
  { href: "/settings", label: "設定" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <div className="nav-scroll" aria-label="主要ナビゲーション">
      {navItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} className={active ? "nav-link is-active" : "nav-link"} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
