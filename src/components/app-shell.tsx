"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";

const PLAIN_ROUTES = ["/", "/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Landing / auth pages = no sidebar
  if (PLAIN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}?`))) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <AppSidebar />
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}
