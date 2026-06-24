import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const uiCopyFiles = [
  "src/components/signal-card.tsx",
  "src/lib/market-display.ts",
  "src/app/candidates/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/review/page.tsx",
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/lib/storylines/engine.ts",
];

describe("investment-advice-safe UI copy", () => {
  it("does not reintroduce recommendation-like labels on major surfaces", () => {
    const forbidden = ["Strong Entry", "Entry候補", "買い候補", "買い推奨", "強い買い", "損切", "利確", "Entry条件", "Entry後"];
    const contents = uiCopyFiles.map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");
    for (const phrase of forbidden) {
      expect(contents, phrase).not.toContain(phrase);
    }
  });
});
