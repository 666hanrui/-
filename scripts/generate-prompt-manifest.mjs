import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(__dirname, "..");
const promptsDir = join(repoRoot, "src-tauri", "src", "llm", "prompts");
const manifestPath = join(promptsDir, "manifest.json");

const PROMPT_FILES = [
  { file: "step1.txt", usage: "workflow step 1 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step2.txt", usage: "workflow step 2 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step3.txt", usage: "workflow step 3 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step4.txt", usage: "workflow step 4 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step5.txt", usage: "workflow step 5 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step6.txt", usage: "workflow step 6 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step7.txt", usage: "workflow step 7 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "step8.txt", usage: "workflow step 8 generation", contextType: "screenplay_step", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "selfcheck.txt", usage: "workflow selfcheck", contextType: "screenplay_selfcheck", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "checkpoint.txt", usage: "workflow after-step-6 checkpoint", contextType: "screenplay_checkpoint", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_script_planning.txt", usage: "script planning", contextType: null, promptSlug: "script_planning", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_script_writing.txt", usage: "script writing", contextType: null, promptSlug: "script_writing", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_script_review.txt", usage: "script review", contextType: null, promptSlug: "script_review", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_asset_character.txt", usage: "asset extraction - character", contextType: null, promptSlug: "asset_character", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file; literal \\n newlines restored to real line breaks", exactMatch: "unknown", diffReason: "format normalization applied; original reference hash not supplied" },
  { file: "slug_asset_scene.txt", usage: "asset extraction - scene", contextType: null, promptSlug: "asset_scene", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file; literal \\n newlines restored to real line breaks", exactMatch: "unknown", diffReason: "format normalization applied; original reference hash not supplied" },
  { file: "slug_asset_prop.txt", usage: "asset extraction - prop", contextType: null, promptSlug: "asset_prop", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file; literal \\n newlines restored to real line breaks", exactMatch: "unknown", diffReason: "format normalization applied; original reference hash not supplied" },
  { file: "slug_prompt_segment_planning.txt", usage: "prompt segment planning", contextType: null, promptSlug: "prompt_segment_planning", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_prompt_seedance_scene.txt", usage: "prompt seedance scene", contextType: null, promptSlug: "prompt_seedance_scene", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_image_prompt_generation.txt", usage: "image prompt generation", contextType: null, promptSlug: "image_prompt_generation", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_video_prompt_generation.txt", usage: "video prompt generation", contextType: null, promptSlug: "video_prompt_generation", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "slug_prompt_review.txt", usage: "prompt quality review", contextType: null, promptSlug: "prompt_review", callEntry: "request_prompt_llm", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "ctx_seedance_phase_ad.txt", usage: "Seedance V5 Phase A-D", contextType: "seedance_phase_ad", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" },
  { file: "ctx_seedance_unit_efg.txt", usage: "Seedance V5 Unit E/F/G", contextType: "seedance_unit_efg", promptSlug: null, callEntry: "request_contextual_llm_stream", originalSource: "restored repository prompt file", exactMatch: "unknown", diffReason: "original reference hash not supplied" }
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function countLiteralNewlines(text) {
  return (text.match(/\\n/g) || []).length;
}

const files = PROMPT_FILES.map((entry) => {
  const fullPath = join(promptsDir, entry.file);
  const exists = existsSync(fullPath);
  const bytes = exists ? readFileSync(fullPath) : Buffer.alloc(0);
  const text = bytes.toString("utf8");
  const literalNewlineCount = countLiteralNewlines(text);
  const empty = bytes.length === 0;
  return {
    ...entry,
    path: relative(repoRoot, fullPath).replaceAll("\\", "/"),
    exists,
    empty,
    byteSize: bytes.length,
    sha256: exists ? sha256(bytes) : null,
    lineCount: exists ? text.split(/\r?\n/).length : 0,
    literalNewlineCount,
    auditStatus: exists && !empty && literalNewlineCount < 5 ? "ok" : "needs_review"
  };
});

const manifest = {
  version: 2,
  generatedBy: "scripts/generate-prompt-manifest.mjs",
  generatedAt: new Date().toISOString(),
  promptDir: "src-tauri/src/llm/prompts",
  note: "byteSize and sha256 are generated from local repository bytes. exactMatch remains unknown until an original reference hash/source is supplied.",
  files
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const failed = files.filter((file) => !file.exists || file.empty || file.literalNewlineCount >= 5);
console.log(`prompt manifest written: ${relative(repoRoot, manifestPath)}`);
console.log(`files: ${files.length}, needs_review: ${failed.length}`);
if (failed.length) {
  for (const file of failed) {
    console.log(`needs_review ${file.file}: exists=${file.exists} empty=${file.empty} literalNewlineCount=${file.literalNewlineCount}`);
  }
  process.exitCode = 1;
}
