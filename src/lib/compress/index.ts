/**
 * Headroom context compression integration.
 * Calls headroom Python library for compressing large text payloads.
 * Falls back to identity (no compression) if headroom is unavailable.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const VENV_PYTHON = ".venv/bin/python";

function headroomAvailable(): boolean {
  try {
    execSync(`${VENV_PYTHON} -c "import headroom"`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compress text using headroom Python library.
 * Falls back to original text if headroom unavailable or compression fails.
 */
export async function compress(text: string, contentType: string = "auto"): Promise<string> {
  if (!headroomAvailable() || text.length < 200) return text;

  // Write to temp file to avoid shell escaping issues
  const tmpIn = join(tmpdir(), `hr-in-${Date.now()}.txt`);
  const tmpOut = join(tmpdir(), `hr-out-${Date.now()}.txt`);
  writeFileSync(tmpIn, text, "utf-8");

  try {
    const script = `
import headroom, json
with open('${tmpIn}', 'r') as f:
    text = f.read()
result = headroom.compress(text, content_type='${contentType}')
with open('${tmpOut}', 'w') as f:
    f.write(result.messages)
`;
    execSync(`${VENV_PYTHON} -c "${script.replace(/\n/g, '; ')}"`, {
      timeout: 30000,
      stdio: "pipe",
    });

    if (existsSync(tmpOut)) {
      return readFileSync(tmpOut, "utf-8");
    }
    return text;
  } catch {
    return text;
  } finally {
    try { unlinkSync(tmpIn); } catch {}
    try { unlinkSync(tmpOut); } catch {}
  }
}

export async function compressCode(code: string): Promise<string> {
  return compress(code, "code");
}

export async function compressJson(obj: unknown): Promise<string> {
  return compress(JSON.stringify(obj), "json");
}
