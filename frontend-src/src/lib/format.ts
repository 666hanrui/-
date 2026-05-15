import type { AssetBundle, ProjectRecord, PromptResult, ScriptTask, StepVersion } from "../types/tudou";

export function formatDate(value?: string) {
  if (!value) return "刚刚";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function getActiveVersion(project: ProjectRecord | null | undefined, stepNumber: number): StepVersion | null {
  const bucket = project?.steps?.[String(stepNumber)];
  if (!bucket?.versions?.length) return null;
  return bucket.versions.find((v) => v.isActive || v.is_active) || bucket.versions[bucket.versions.length - 1];
}

export function getScriptText(task: ScriptTask | null | undefined) {
  return task?.scriptBody || task?.script_body || task?.body || task?.text || task?.output || "";
}

export function promptSections(result: PromptResult | null | undefined) {
  const sections = result?.sections || result?.groups || [];
  if (!Array.isArray(sections) || sections.length === 0) {
    const raw = result?.text || result?.prompt || result?.raw || "";
    return raw ? [{ title: "生成结果", lines: [raw] }] : [];
  }
  return sections.map((s: any, index) => ({
    title: s.title || s.name || s.heading || `片段 ${String(index + 1).padStart(2, "0")}`,
    lines: Array.isArray(s.lines) ? s.lines : [s.content || s.prompt || s.text || ""].filter(Boolean),
  }));
}

export function normalizeAssets(rowsOrPayload: any): AssetBundle {
  if (!rowsOrPayload) return { characters: [], scenes: [], props: [] };
  if (rowsOrPayload.characters || rowsOrPayload.scenes || rowsOrPayload.props) {
    return {
      characters: rowsOrPayload.characters || [],
      scenes: rowsOrPayload.scenes || [],
      props: rowsOrPayload.props || [],
    };
  }
  const result: AssetBundle = { characters: [], scenes: [], props: [] };
  for (const row of rowsOrPayload || []) {
    const data = typeof row.assetDataJson === "string" ? readInlineJson(row.assetDataJson) : row.assetData || row;
    if (row.assetType === "character") result.characters.push(data);
    if (row.assetType === "scene") result.scenes.push(data);
    if (row.assetType === "prop") result.props.push(data);
  }
  return result;
}

function readInlineJson(raw: string) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}
