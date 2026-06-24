import { readFile } from "fs/promises";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const token = process.env.FUNDAMENTALS_SEED_TOKEN;
const filePath = process.env.FINANCIAL_STATEMENTS_FILE;
const source = process.env.FINANCIAL_STATEMENTS_SOURCE;

if (!token) {
  console.error("FUNDAMENTALS_SEED_TOKEN is required.");
  process.exit(1);
}

if (!filePath) {
  console.error("FINANCIAL_STATEMENTS_FILE is required.");
  process.exit(1);
}

const body = await readFile(filePath, "utf8");
const url = new URL(`${appUrl.replace(/\/$/, "")}/api/fundamentals/seed`);
url.searchParams.set("mode", "financials");
if (source) url.searchParams.set("source", source);

const response = await fetch(url, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": filePath.endsWith(".json") || filePath.endsWith(".jsonl") ? "application/json" : "text/csv",
  },
  body,
});

const responseBody = await response.text();
if (!response.ok) {
  console.error(`Import failed: HTTP ${response.status}`);
  console.error(responseBody);
  process.exit(1);
}

console.log(responseBody);
