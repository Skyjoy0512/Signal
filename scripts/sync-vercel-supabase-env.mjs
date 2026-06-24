import { spawnSync } from "child_process";

const projectRef = process.env.SUPABASE_PROJECT_REF;
const vercelToken = process.env.VERCEL_TOKEN;
const vercelTeam = process.env.VERCEL_TEAM_ID || process.env.VERCEL_TEAM_SLUG;
const targetEnvironments = (process.env.VERCEL_ENVIRONMENTS || "production,preview,development")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!projectRef) {
  fail("SUPABASE_PROJECT_REF is required.");
}

const supabaseUrl = process.env.SUPABASE_URL || `https://${projectRef}.supabase.co`;
let anonKey = process.env.SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey || !serviceRoleKey) {
  const keys = fetchSupabaseApiKeys(projectRef);
  anonKey ||= findApiKey(keys, ["anon", "publishable"]);
  serviceRoleKey ||= findApiKey(keys, ["service_role", "service role", "secret"]);
}

if (!anonKey) {
  fail("Could not resolve SUPABASE_ANON_KEY. Set it directly or authenticate Supabase CLI with SUPABASE_ACCESS_TOKEN.");
}

if (!serviceRoleKey) {
  fail("Could not resolve SUPABASE_SERVICE_ROLE_KEY. Set it directly or authenticate Supabase CLI with SUPABASE_ACCESS_TOKEN.");
}

const variables = [
  { name: "SUPABASE_URL", value: supabaseUrl, publicValue: true },
  { name: "NEXT_PUBLIC_SUPABASE_URL", value: supabaseUrl, publicValue: true },
  { name: "SUPABASE_ANON_KEY", value: anonKey, publicValue: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: anonKey, publicValue: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", value: serviceRoleKey, publicValue: false },
];

console.log(`Syncing Supabase env for ${projectRef} to Vercel environments: ${targetEnvironments.join(", ")}`);

for (const environment of targetEnvironments) {
  for (const variable of variables) {
    setVercelEnv(variable, environment);
  }
}

console.log("Vercel Supabase env sync complete.");

function fetchSupabaseApiKeys(ref) {
  const result = run(
    "supabase",
    ["projects", "api-keys", "--project-ref", ref, "--output", "json"],
    { env: { SUPABASE_TELEMETRY_DISABLED: "1" }, capture: true },
  );

  if (!result.ok) {
    fail(`Could not list Supabase API keys: ${firstLine(result.output)}`);
  }

  try {
    const json = JSON.parse(stripAnsi(result.stdout));
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.api_keys)) return json.api_keys;
    if (Array.isArray(json.keys)) return json.keys;
    if (Array.isArray(json.data)) return json.data;
  } catch (error) {
    fail(`Could not parse Supabase API key output: ${error instanceof Error ? error.message : "invalid JSON"}`);
  }

  fail("Supabase API key output did not contain a recognizable key list.");
}

function findApiKey(keys, labels) {
  for (const item of keys) {
    const searchable = JSON.stringify(item).toLowerCase();
    if (!labels.some((label) => searchable.includes(label))) continue;
    const value = item.api_key || item.apiKey || item.key || item.value || item.token;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function setVercelEnv(variable, environment) {
  const args = ["--yes", "vercel", "env", "add", variable.name, environment, "--force", "--yes"];
  if (vercelTeam) args.push("--scope", vercelTeam);
  if (vercelToken) args.push("--token", vercelToken);
  if (variable.publicValue) {
    args.push("--no-sensitive");
  } else if (environment !== "development") {
    args.push("--sensitive");
  }

  const result = spawnSync("npx", args, {
    cwd: process.cwd(),
    env: process.env,
    input: variable.value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (result.status !== 0) {
    fail(`Vercel env add failed for ${variable.name} (${environment}): ${firstLine(output)}`);
  }

  console.log(`OK ${variable.name} -> ${environment}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    ok: result.status === 0,
    stdout,
    stderr,
    output: [stdout, stderr].filter(Boolean).join("\n").trim(),
  };
}

function firstLine(value) {
  return String(value).split(/\r?\n/).find(Boolean) ?? "no output";
}

function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, "");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
