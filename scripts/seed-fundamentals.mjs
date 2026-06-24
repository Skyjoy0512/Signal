const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const token = process.env.FUNDAMENTALS_SEED_TOKEN;
const mode = process.env.FUNDAMENTALS_SEED_MODE;
const tickers = process.env.FUNDAMENTALS_SEED_TICKERS;

if (!token) {
  console.error("FUNDAMENTALS_SEED_TOKEN is required.");
  process.exit(1);
}

const url = new URL(`${appUrl.replace(/\/$/, "")}/api/fundamentals/seed`);
if (mode) url.searchParams.set("mode", mode);
if (tickers) url.searchParams.set("tickers", tickers);

const response = await fetch(url, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
  },
});

const body = await response.text();
if (!response.ok) {
  console.error(`Seed failed: HTTP ${response.status}`);
  console.error(body);
  process.exit(1);
}

console.log(body);
