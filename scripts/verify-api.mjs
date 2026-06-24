import { spawn } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";

const port = Number(process.env.APP_UNDER_TEST_PORT ?? 3101);
const token = process.env.APP_UNDER_TEST_ADMIN_TOKEN ?? "verify-secret";
const seedToken = process.env.FUNDAMENTALS_SEED_TOKEN ?? "verify-seed-secret";
const baseUrl = process.env.APP_UNDER_TEST_URL ?? `http://127.0.0.1:${port}`;
const nextEnvPath = new URL("../next-env.d.ts", import.meta.url);
const lockPath = new URL("../.signal-verify.lock", import.meta.url);
const originalNextEnv = await readFile(nextEnvPath, "utf8").catch(() => null);
let server;
let releaseLock;
const serverLogs = [];
const failures = [];

const checks = [
  {
    name: "settings rejects missing admin token",
    request: () => fetch(`${baseUrl}/api/settings/llm`),
    expect: async (response) => response.status === 401,
  },
  {
    name: "settings accepts admin token",
    request: () => fetch(`${baseUrl}/api/settings/llm`, { headers: adminHeaders() }),
    expect: async (response) => response.ok && (await response.json()).provider,
  },
  {
    name: "LLM test route accepts admin token",
    request: () => fetch(`${baseUrl}/api/settings/llm/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminHeaders() },
      body: JSON.stringify({
        provider: "deepseek",
        baseUrl: "https://api.deepseek.com",
        reasoningModel: "deepseek-chat",
        workerModel: "deepseek-chat",
        criticModel: "deepseek-chat",
        reasoningTemperature: 0.3,
        criticTemperature: 0.5,
        enableCritic: false,
        apiKey: "",
        inputCostPerMillion: 0,
        outputCostPerMillion: 0,
        dailyCostLimitUsd: 3,
      }),
    }),
    expect: async (response) => response.ok && typeof (await response.json()).ok === "boolean",
  },
  {
    name: "daily scan rejects missing admin token",
    request: () => fetch(`${baseUrl}/api/jobs/daily-scan`, { method: "POST" }),
    expect: async (response) => response.status === 401,
  },
  {
    name: "external pack accepts admin token",
    request: () => fetch(`${baseUrl}/api/external-pack`, { headers: adminHeaders() }),
    expect: async (response) => response.ok && (await response.text()).startsWith("# Signal One-shot External Analysis Pack"),
  },
  {
    name: "fundamentals seed rejects missing seed token",
    request: () => fetch(`${baseUrl}/api/fundamentals/seed`, { method: "POST" }),
    expect: async (response) => response.status === 401,
  },
  {
    name: "fundamentals market refresh accepts seed token before Supabase config check",
    request: () => fetch(`${baseUrl}/api/fundamentals/seed?mode=market&tickers=7203`, {
      method: "POST",
      headers: { authorization: `Bearer ${seedToken}` },
    }),
    expect: async (response) => response.status === 400 && (await response.json()).error === "Supabase is not configured",
  },
  {
    name: "fundamentals financial import accepts seed token before Supabase config check",
    request: () => fetch(`${baseUrl}/api/fundamentals/seed?mode=financials`, {
      method: "POST",
      headers: { authorization: `Bearer ${seedToken}`, "content-type": "text/csv" },
      body: "ticker,period,revenue\n7203,2026,48000\n",
    }),
    expect: async (response) => response.status === 400 && (await response.json()).error === "Supabase is not configured",
  },
];

try {
  if (!process.env.APP_UNDER_TEST_URL) {
    releaseLock = await acquireLock();
    server = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
      cwd: process.cwd(),
      env: { ...process.env, APP_ADMIN_TOKEN: token, FUNDAMENTALS_SEED_TOKEN: seedToken, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    collectServerLogs(server, serverLogs);
    await waitForHttp(baseUrl, 60_000);
  }

  for (const check of checks) {
    const response = await check.request();
    if (!(await check.expect(response))) {
      failures.push(`${check.name}: unexpected status ${response.status}`);
    }
  }
} finally {
  if (server) await stopServer(server);
  if (releaseLock) await releaseLock();
  await restoreNextEnv();
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Verified ${checks.length} protected API checks.`);

function adminHeaders() {
  return { "x-signal-admin-token": token };
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
