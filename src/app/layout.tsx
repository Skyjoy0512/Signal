import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal - 投資判断支援",
  description: "個人投資家のための投資判断支援システム。日本株を対象に、機械式スコアとLLM分析でEntryのタイミングを可視化します。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col">
        <header className="header-bar">
          <nav className="page-container header-nav flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="brand-row flex items-center">
                <Link href="/" className="no-underline flex items-center" aria-label="Signal ホーム">
                  <Image
                    src="/images/signal-logo.svg"
                    alt="Signal"
                    width={200}
                    height={48}
                    priority
                    style={{ height: 34, width: "auto" }}
                  />
                </Link>
              </div>
              <SiteNav />
            </div>
            <span className="header-status">Phase1-A</span>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="footer-bar">
          <div className="page-container py-3 flex items-center justify-between">
            <span style={{ fontSize: 11, color: "var(--color-muted-clay)" }}>Signal - 個人利用のみ</span>
            <span className="font-mono" style={{ fontSize: 11, color: "var(--color-edge-ash)" }}>Phase1-A / 日本株</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
