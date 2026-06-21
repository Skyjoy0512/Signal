"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label: string; color: string }>;

export function ChartContainer({
  className,
  children,
}: {
  config?: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      setReady(width > 0 && height > 0);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("h-64 w-full min-w-0 overflow-hidden", className)} style={{ minWidth: 240, minHeight: 160 }}>
      {ready ? children : null}
    </div>
  );
}
