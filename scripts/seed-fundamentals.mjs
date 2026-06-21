const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
const token = process.env.FUNDAMENTALS_SEED_TOKEN;

if (!token) {
  console.error("FUNDAMENTALS_SEED_TOKEN is required.");
  process.exit(1);
}

const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/fundamentals/seed`, {
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
