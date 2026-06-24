import { spawnSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";

const checks = [];

checks.push(check("Supabase CLI is installed", () => run("supabase", ["--version"]).ok));
checks.push(check("Local migrations exist", () => migrationFiles().length >= 7));
checks.push(check("Local project is initialized", () => existsSync("supabase/config.toml")));
checks.push(check("Hosted project is linked", () => existsSync("supabase/.temp/project-ref")));

const projects = run("supabase", ["projects", "list"]);
checks.push({
  name: "Supabase CLI can list hosted projects",
  ok: projects.ok,
  detail: projects.ok ? "authenticated" : firstLine(projects.stderr || projects.stdout),
});

const localDb = run("npm", ["run", "verify:db"]);
checks.push({
  name: "Local Supabase migrations and DB lint pass",
  ok: localDb.ok,
  detail: localDb.ok ? "verified" : firstLine(localDb.stderr || localDb.stdout),
});

const linkedProjectRef = existsSync("supabase/.temp/project-ref")
  ? readFileSync("supabase/.temp/project-ref", "utf8").trim()
  : "";

console.log("Supabase deployment readiness");
for (const item of checks) {
  console.log(`${item.ok ? "OK " : "NO "} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
}
if (linkedProjectRef) {
  console.log(`Linked project ref: ${linkedProjectRef}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  process.exitCode = 1;
}

function check(name, fn) {
  try {
    return { name, ok: Boolean(fn()) };
  } catch (error) {
    return { name, ok: false, detail: error instanceof Error ? error.message : "failed" };
  }
}

function migrationFiles() {
  const dir = join(process.cwd(), "supabase/migrations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function firstLine(value) {
  return value.split(/\r?\n/).find(Boolean) ?? "no output";
}
