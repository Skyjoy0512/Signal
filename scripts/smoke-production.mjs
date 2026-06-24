const appUrl = process.env.APP_UNDER_TEST_URL || process.env.NEXT_PUBLIC_APP_URL;
const adminToken = process.env.APP_UNDER_TEST_ADMIN_TOKEN || process.env.APP_ADMIN_TOKEN;
const failures = [];

if (!appUrl) {
  console.error("APP_UNDER_TEST_URL or NEXT_PUBLIC_APP_URL is required.");
  process.exit(1);
}

const baseUrl = appUrl.replace(/\/$/, "");
const authCookie = adminToken ? await loginCookie() : "";

await check("public request reaches login", async () => {
  const response = await fetch(`${baseUrl}/`);
  return response.ok && (await response.text()).includes("ログイン");
});

await check("fundamentals API loads", async () => {
  const response = await fetch(`${baseUrl}/api/fundamentals`, { cache: "no-store", headers: authHeaders() });
  if (!response.ok) return false;
  const body = await response.json();
  return Boolean(body.source && Array.isArray(body.companies));
});

await check("settings API rejects missing admin token", async () => {
  const response = await fetch(`${baseUrl}/api/settings/llm`);
  return response.status === 401;
});

if (adminToken) {
  await check("settings API accepts admin token", async () => {
    const response = await fetch(`${baseUrl}/api/settings/llm`, { headers: { "x-signal-admin-token": adminToken } });
    return response.ok;
  });

  await check("home loads after login", async () => {
    const response = await fetch(`${baseUrl}/`, { headers: authHeaders() });
    return response.ok && !(await response.text()).includes("ログイン");
  });
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Production smoke passed for ${baseUrl}.`);

async function check(name, fn) {
  try {
    if (!(await fn())) failures.push(`${name}: failed`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : "failed"}`);
  }
}

async function loginCookie() {
  const form = new URLSearchParams({ token: adminToken, next: "/" });
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    body: form,
    redirect: "manual",
  });
  const cookie = response.headers.get("set-cookie") ?? "";
  return cookie.split(";")[0];
}

function authHeaders() {
  return authCookie ? { cookie: authCookie } : {};
}
