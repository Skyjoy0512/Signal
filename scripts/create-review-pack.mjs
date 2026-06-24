import { spawnSync } from "child_process";
import { copyFileSync, existsSync, readdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

const reviewDir = "docs/reviews/gpt-pro";
const date = process.env.REVIEW_DATE || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
const promptPath = join(reviewDir, `${date}-multidimensional-review-prompt.txt`);
const manifestPath = join(reviewDir, "review-pack-manifest.json");
const zipPath = join(reviewDir, `signal-gpt-pro-review-pack-${date}.zip`);

ensureDatedPrompt();
writeManifest();
createZip();
testZip();

console.log(`Review pack ready: ${zipPath}`);

function ensureDatedPrompt() {
  if (existsSync(promptPath)) return;
  const latestPrompt = latestFile("-multidimensional-review-prompt.txt");
  if (!latestPrompt) {
    throw new Error(`No source review prompt found in ${reviewDir}`);
  }
  copyFileSync(join(reviewDir, latestPrompt), promptPath);
  console.log(`Created dated prompt: ${promptPath}`);
}

function writeManifest() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    reviewDate: date,
    prompt: promptPath,
    outputTemplate: join(reviewDir, `${date}-gpt-pro-review-output.md`),
    implementationInstructionsTemplate: join(reviewDir, `${date}-codex-implementation-instructions.md`),
    zip: zipPath,
    includedPaths: includedPaths(),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function createZip() {
  rmSync(zipPath, { force: true });
  const args = ["-r", zipPath, ...includedPaths(), "-x", `${reviewDir}/*.zip`];
  const result = spawnSync("zip", args, { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`zip failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function testZip() {
  const result = spawnSync("unzip", ["-t", zipPath], { cwd: process.cwd(), encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`zip integrity check failed:\n${result.stdout}\n${result.stderr}`);
  }
}

function includedPaths() {
  return [
    reviewDir,
    "docs/signal_review_docs",
    "docs/data",
    "docs/deployment-production.md",
    ".github/workflows",
    "package.json",
    "scripts/bootstrap-hosting.mjs",
    "scripts/check-production-env.mjs",
    "scripts/check-supabase-hosted.mjs",
    "scripts/create-review-pack.mjs",
    "scripts/smoke-production.mjs",
    "scripts/sync-vercel-supabase-env.mjs",
    "scripts/verify-api.mjs",
    "scripts/verify-db.mjs",
    "scripts/verify-ui.mjs",
  ];
}

function latestFile(suffix) {
  return readdirSync(reviewDir)
    .filter((file) => file.endsWith(suffix))
    .sort()
    .at(-1);
}
