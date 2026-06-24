import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { existsSync } from "fs";

const apply = process.env.DEPLOY_APPLY === "1";
const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN;
let supabaseProjectRef = process.env.SUPABASE_PROJECT_REF;
const supabaseCreateProject = process.env.SUPABASE_CREATE_PROJECT === "1";
const supabaseOrgIdInput = process.env.SUPABASE_ORG_ID;
const supabaseProjectName = process.env.SUPABASE_PROJECT_NAME || "signal";
const supabaseRegion = process.env.SUPABASE_REGION || "ap-northeast-1";
const supabaseSize = process.env.SUPABASE_SIZE || "nano";
const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD || (supabaseCreateProject ? randomPassword() : "");
const vercelToken = process.env.VERCEL_TOKEN;
const vercelProject = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME;
const vercelTeam = process.env.VERCEL_TEAM_ID || process.env.VERCEL_TEAM_SLUG;
const vercelLinkedProject = existsSync(".vercel/project.json");

const steps = [];

step("Local verification", "npm", ["run", "verify"]);
step("Local Supabase verification", "npm", ["run", "verify:db"]);

if (supabaseToken) {
  step("Supabase login", "supabase", ["login", "--token", supabaseToken, "--name", "signal-deploy"]);
} else {
  note("SUPABASE_ACCESS_TOKEN is missing; hosted Supabase login skipped.");
}

if (supabaseToken && !supabaseProjectRef && supabaseCreateProject) {
  const orgId = supabaseOrgIdInput || resolveSingleSupabaseOrgId();
  if (!orgId) {
    note("SUPABASE_ORG_ID is missing and a single organization could not be resolved; Supabase project creation skipped.");
  } else {
    const create = step("Supabase project create", "supabase", [
      "projects",
      "create",
      supabaseProjectName,
      "--org-id",
      orgId,
      "--db-password",
      supabaseDbPassword,
      "--region",
      supabaseRegion,
      "--size",
      supabaseSize,
      "--output-format",
      "json",
    ]);
    if (create.ok) {
      supabaseProjectRef = extractProjectRef(create.stdout);
      if (supabaseProjectRef) {
        process.env.SUPABASE_PROJECT_REF = supabaseProjectRef;
        process.env.SUPABASE_DB_PASSWORD = supabaseDbPassword;
        note(`Created Supabase project ref ${supabaseProjectRef}. Database password is held only in this process.`);
      } else {
        note("Supabase project was created but project ref could not be parsed; set SUPABASE_PROJECT_REF and rerun bootstrap.");
      }
    }
  }
}

if (supabaseToken && supabaseProjectRef) {
  const linkArgs = ["link", "--project-ref", supabaseProjectRef];
  if (supabaseDbPassword) linkArgs.push("--password", supabaseDbPassword);
  step("Supabase link", "supabase", linkArgs);
  const pushArgs = ["db", "push", "--linked"];
  if (supabaseDbPassword) pushArgs.push("--password", supabaseDbPassword);
  if (!apply) pushArgs.push("--dry-run");
  step(apply ? "Supabase db push" : "Supabase db push dry-run", "supabase", pushArgs);
  step("Supabase migration list", "supabase", ["migration", "list"]);
  if (vercelToken || vercelProject || vercelLinkedProject) {
    step("Vercel Supabase env sync", "npm", ["run", "deploy:sync-supabase-env"]);
  } else {
    note("Vercel project is not linked; Supabase env sync skipped.");
  }
} else if (supabaseToken) {
  note("SUPABASE_PROJECT_REF is missing; hosted Supabase link skipped.");
}

if (vercelToken) {
  step("Vercel whoami", "npx", ["--yes", "vercel", "whoami", "--token", vercelToken]);
  if (vercelProject) {
    const linkArgs = ["--yes", "vercel", "link", "--yes", "--project", vercelProject, "--token", vercelToken];
    if (vercelTeam) linkArgs.splice(linkArgs.length - 2, 0, "--team", vercelTeam);
    step("Vercel link", "npx", linkArgs);
    if (apply) {
      const deployArgs = ["--yes", "vercel", "deploy", "--prod", "--yes", "--token", vercelToken];
      if (vercelTeam) deployArgs.splice(deployArgs.length - 2, 0, "--scope", vercelTeam);
      step("Vercel production deploy", "npx", deployArgs);
    } else {
      note("DEPLOY_APPLY is not 1; Vercel deploy skipped.");
    }
  } else {
    note("VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME is missing; Vercel link skipped.");
  }
} else {
  note("VERCEL_TOKEN is missing; Vercel login/link/deploy skipped.");
}

console.log("\nBootstrap summary");
for (const item of steps) {
  console.log(`${item.ok ? "OK " : "NO "} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
}

const failed = steps.filter((item) => !item.ok);
if (failed.length > 0) process.exit(1);

function step(name, command, args) {
  const env = { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" };
  const maskedArgs = args.map(mask);
  console.log(`\n> ${command} ${maskedArgs.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (output) console.log(mask(output));
  const item = {
    name,
    ok: result.status === 0,
    detail: result.status === 0 ? "" : firstLine(output),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
  steps.push(item);
  return item;
}

function note(message) {
  console.log(`\n- ${message}`);
  steps.push({ name: message, ok: true });
}

function firstLine(value) {
  return value.split(/\r?\n/).find(Boolean) ?? "no output";
}

function mask(value) {
  let masked = String(value);
  for (const secret of [supabaseToken, supabaseDbPassword, vercelToken]) {
    if (secret) masked = masked.split(secret).join("<redacted>");
  }
  return masked;
}

function resolveSingleSupabaseOrgId() {
  const orgs = step("Supabase org list", "supabase", ["orgs", "list", "--output-format", "json"]);
  if (!orgs.ok) return "";
  const list = parseJsonList(orgs.stdout);
  if (list.length !== 1) {
    note(`Supabase org auto-selection skipped because ${list.length} organizations were returned.`);
    return "";
  }
  return String(list[0].id || list[0].slug || list[0].organization_id || "").trim();
}

function extractProjectRef(value) {
  const parsed = parseJsonValue(value);
  const candidates = Array.isArray(parsed) ? parsed : [parsed];
  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;
    const ref = item.ref || item.project_ref || item.id;
    if (typeof ref === "string" && ref.trim()) return ref.trim();
  }
  const match = String(value).match(/[a-z]{20}/);
  return match?.[0] ?? "";
}

function parseJsonList(value) {
  const parsed = parseJsonValue(value);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.organizations)) return parsed.organizations;
  if (Array.isArray(parsed?.data)) return parsed.data;
  return [];
}

function parseJsonValue(value) {
  try {
    return JSON.parse(stripAnsi(value));
  } catch {
    return null;
  }
}

function stripAnsi(value) {
  return String(value).replace(/\u001b\[[0-9;]*m/g, "");
}

function randomPassword() {
  return `${randomBytes(24).toString("base64url")}Aa1!`;
}
