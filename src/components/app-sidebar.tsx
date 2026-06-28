"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./logout-button";

const NAV_ITEMS = [
  {
    section: "メイン",
    items: [
      { href: "/dashboard", label: "ダッシュボード", icon: "dashboard" },
      { href: "/candidates", label: "候補銘柄", icon: "candidates" },
      { href: "/review", label: "レビュー", icon: "review", badge: "5" },
      { href: "/compare", label: "比較", icon: "compare" },
      { href: "/industries", label: "業界", icon: "industries" },
    ],
  },
  {
    section: "その他",
    items: [
      { href: "/settings", label: "設定", icon: "settings" },
    ],
  },
];

const ICONS: Record<string, string> = {
  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  candidates:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  review:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  compare:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  industries:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <div className="sidebar-overlay" />
      <aside className="sidebar">
        <Link href="/" className="sidebar-brand">
          <div className="sidebar-brand-icon">S</div>
          Signal
        </Link>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section">{group.section}</div>
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link${active ? " active" : ""}`}
                  >
                    <span
                      dangerouslySetInnerHTML={{ __html: ICONS[item.icon] ?? "" }}
                    />
                    {item.label}
                    {item.badge ? (
                      <span
                        className="badge badge-warn"
                        style={{ marginLeft: "auto", fontSize: 11 }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <div className="avatar" style={{ background: "var(--dark-hover)", color: "var(--dark-fg)" }}>AK</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--dark-fg)" }}>アレックス・キム</div>
              <div style={{ fontSize: 11, color: "var(--dark-muted)" }}>alex@signal.app</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
