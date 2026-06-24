import { chromium } from "playwright";
import { spawn } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";

const port = Number(process.env.APP_UNDER_TEST_PORT ?? 3100);
const baseUrl = process.env.APP_UNDER_TEST_URL ?? `http://127.0.0.1:${port}`;
const routes = ["/", "/dashboard", "/candidates", "/review", "/compare", "/settings"];
const nextEnvPath = new URL("../next-env.d.ts", import.meta.url);
const lockPath = new URL("../.signal-verify.lock", import.meta.url);
const originalNextEnv = await readFile(nextEnvPath, "utf8").catch(() => null);
let server;
let releaseLock;
const serverLogs = [];
let browser;
const issues = [];

try {
  if (!process.env.APP_UNDER_TEST_URL) {
    releaseLock = await acquireLock();
    server = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
      cwd: process.cwd(),
      env: process.env.APP_UNDER_TEST_ADMIN_TOKEN ? process.env : { ...process.env, APP_ADMIN_TOKEN: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    collectServerLogs(server, serverLogs);
    await waitForHttp(baseUrl, 60_000);
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  if (process.env.APP_UNDER_TEST_ADMIN_TOKEN) {
    await page.addInitScript((token) => {
      localStorage.setItem("signal-admin-token", token);
    }, process.env.APP_UNDER_TEST_ADMIN_TOKEN);
    await login(page, process.env.APP_UNDER_TEST_ADMIN_TOKEN);
  }

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      if (isExpectedUnauthorizedSettingsFetch(message)) return;
      const location = message.location();
      const suffix = location.url ? ` at ${location.url}:${location.lineNumber}` : "";
      issues.push(`[console:${message.type()}] ${message.text()}${suffix}`);
    }
  });
  page.on("pageerror", (error) => {
    issues.push(`[pageerror] ${error.message}`);
  });

  for (const route of routes) {
    const beforeIssueCount = issues.length;
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    if (!response || !response.ok()) {
      issues.push(`[http] ${route} returned ${response?.status() ?? "no response"}`);
      continue;
    }

    const title = await page.locator("h1").first().textContent().catch(() => "");
    const visibleText = await page.locator("body").innerText();
    if (!title?.trim()) issues.push(`[content] ${route} has no visible h1`);
    if (/Strong Entry|Entry候補|買い推奨|強い買い/.test(visibleText)) {
      issues.push(`[copy] ${route} still contains investment-advice-like forbidden copy`);
    }
    await page.screenshot({ path: `/tmp/signal-ui-${route === "/" ? "home" : route.slice(1)}.png`, fullPage: true });
    if (issues.length > beforeIssueCount) {
      issues.splice(beforeIssueCount, 0, `[route] ${route}`);
    }
  }

  if (process.env.APP_UNDER_TEST_ADMIN_TOKEN) {
    await verifySettingsAdminTokenFlow(page);
  }
} finally {
  await browser?.close();
  if (server) await stopServer(server);
  if (releaseLock) await releaseLock();
  await restoreNextEnv();
}

if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

console.log(`Verified ${routes.length} routes without HTTP, console, copy, or settings auth flow issues.`);

async function verifySettingsAdminTokenFlow(page) {
  const token = process.env.APP_UNDER_TEST_ADMIN_TOKEN;
  const cleanPage = await page.context().browser().newPage({ viewport: { width: 1366, height: 900 } });
  try {
    await login(cleanPage, token);
    await cleanPage.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
    await cleanPage.getByLabel("Admin token").fill(token);
    await cleanPage.getByRole("button", { name: /再読み込み/ }).click();
    await expectText(cleanPage, "環境変数を使用中", "settings reload succeeds after entering admin token");
    const stored = await cleanPage.evaluate(() => localStorage.getItem("signal-admin-token"));
    if (stored !== token) {
      issues.push("[settings] admin token was not persisted to localStorage");
    }
  } finally {
    await cleanPage.close();
  }
}

async function login(page, token) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="token"]').fill(token);
  await page.getByRole("button", { name: "続行" }).click();
  await page.waitForURL((url) => url.pathname !== "/login", { timeout: 10_000 }).catch(() => undefined);
}

async function expectText(page, text, label) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 10_000 });
  } catch {
    issues.push(`[settings] ${label}`);
  }
}

function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const pass = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    server?.once("exit", (code) => {
      fail(new Error(`Dev server exited before ${url} was ready, code=${code}\n${serverLogs.join("")}`));
    });
    const tryFetch = async () => {
      try {
        const response = await fetch(url);
        if (response.status < 500) {
          await response.arrayBuffer().catch(() => undefined);
          pass();
          return;
        }
      } catch {
        // Retry until the dev server can serve a real HTTP response.
      }
      if (Date.now() - start > timeoutMs) {
        fail(new Error(`Timed out waiting for ${url}\n${serverLogs.join("")}`));
      } else {
        setTimeout(tryFetch, 250);
      }
    };
    void tryFetch();
  });
}

function collectServerLogs(child, logs) {
  child.stdout?.on("data", (chunk) => logs.push(chunk.toString()));
  child.stderr?.on("data", (chunk) => logs.push(chunk.toString()));
}

function isExpectedUnauthorizedSettingsFetch(message) {
  if (process.env.APP_UNDER_TEST_ADMIN_TOKEN) return false;
  const location = message.location();
  return (
    message.type() === "error" &&
    message.text().includes("Failed to load resource") &&
    location.url.includes("/api/settings/llm")
  );
}

async function restoreNextEnv() {
  if (originalNextEnv != null) {
    await writeFile(nextEnvPath, originalNextEnv);
  }
}

async function acquireLock(timeoutMs = 90_000) {
  const start = Date.now();
  while (true) {
    try {
      await mkdir(lockPath);
      await writeFile(new URL("pid", `${lockPath.href}/`), `${process.pid}\n`);
      return async () => {
        await rm(lockPath, { recursive: true, force: true });
      };
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
      if (Date.now() - start > timeoutMs) {
        throw new Error("Timed out waiting for another Signal verification run to finish");
      }
      await sleep(500);
    }
  }
}

function isAlreadyExists(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopServer(child) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    child.once("exit", finish);
    child.kill("SIGTERM");
    setTimeout(() => {
      child.kill("SIGKILL");
      finish();
    }, 5_000);
  });
}
