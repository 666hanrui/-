import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");

const INCLUDED_ROOTS = [
  "frontend-src/src",
  "src-tauri/src",
  "scripts",
  "docs",
];

const EXCLUDED_PATH_PARTS = [
  "node_modules",
  "dist",
  "target",
  ".git",
  "original-prompt-archive",
  "data/debug-prompts",
];

const ALLOWED_ENDPOINT_PATTERNS = [
  "api.openai.com",
  "generativelanguage.googleapis.com",
  "anthropic.com",
  "api.deepseek.com",
];

const HARD_CODED_ENDPOINT_RE = /https?:\/\/[^\s"'`<>]+/g;
const SECRET_RE = /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{8,}["']/i;
const PROMPT_FALLBACK_RE = /你是专业助手|professional assistant|generic assistant/i;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    const rel = relative(repoRoot, full).replaceAll("\\", "/");
    if (EXCLUDED_PATH_PARTS.some((part) => rel.includes(part))) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|rs|mjs|js|json|md|txt)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function lineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

const files = INCLUDED_ROOTS.flatMap((root) => walk(join(repoRoot, root)));
const findings = [];

for (const file of files) {
  const rel = relative(repoRoot, file).replaceAll("\\", "/");
  const text = readFileSync(file, "utf8");

  for (const match of text.matchAll(HARD_CODED_ENDPOINT_RE)) {
    const url = match[0];
    const isAllowedDocOrTest = rel.startsWith("docs/") || rel.endsWith("server_proxy.rs") || ALLOWED_ENDPOINT_PATTERNS.some((allowed) => url.includes(allowed));
    if (!isAllowedDocOrTest) {
      findings.push({ type: "hardcoded_endpoint", file: rel, line: lineNumber(text, match.index ?? 0), value: url });
    }
  }

  const secret = SECRET_RE.exec(text);
  if (secret && !rel.endsWith("audit-local-only.mjs")) {
    findings.push({ type: "possible_secret_literal", file: rel, line: lineNumber(text, secret.index ?? 0), value: secret[0].slice(0, 120) });
  }

  const fallback = PROMPT_FALLBACK_RE.exec(text);
  if (fallback && rel.includes("prompts")) {
    findings.push({ type: "generic_prompt_fallback", file: rel, line: lineNumber(text, fallback.index ?? 0), value: fallback[0] });
  }
}

console.log(`local-only audit scanned ${files.length} files`);
if (findings.length) {
  console.error("local-only audit failed:");
  for (const item of findings) console.error(JSON.stringify(item));
  process.exit(1);
}
console.log("local-only audit passed: no disallowed hardcoded endpoints, obvious secrets, or generic prompt fallback detected");
