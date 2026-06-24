import { spawn } from "child_process";

const env = { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" };

try {
  await run("docker", ["info"], {
    quiet: true,
    failureMessage: "Docker daemon is not running. Start Docker Desktop, then rerun `npm run verify:db`.",
  });

  await run("supabase", ["db", "reset", "--local", "--no-seed"], {
    env,
    failureMessage: "Supabase local database reset failed.",
  });

  await run("supabase", ["db", "lint", "--local", "--fail-on", "error"], {
    env,
    failureMessage: "Supabase local database lint failed.",
  });

  console.log("Verified Supabase local migrations and database lint.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database verification failed.");
  process.exit(1);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (!options.quiet) process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
      if (!options.quiet) process.stderr.write(chunk);
    });
    child.once("error", (error) => {
      reject(new Error(`${options.failureMessage ?? `${command} failed`}\n${error.message}`));
    });
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const details = options.quiet ? "" : `\n${output}`;
        reject(new Error(`${options.failureMessage ?? `${command} failed`} Exit code: ${code}${details}`));
      }
    });
  });
}
