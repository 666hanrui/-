import { motion } from "framer-motion";
import { Activity, CheckCircle2, Film, Image as ImageIcon, Loader2, RefreshCw, Save, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ScriptSelector from "../components/ScriptSelector";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate, getTaskId } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { ReviewResult, ScriptTask } from "../types/tudou";

interface PromptLabProps {
  kind: "image" | "video";
}

type BusyState = "history" | "output" | "outline" | "confirm" | "generate" | "group" | "review" | "";

function parseMaybeJson(value: any, fallback: any = null) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeOutput(raw: any) {
  const grid = parseMaybeJson(raw?.gridGroupsJson || raw?.grid_groups_json, null);
  const seedance = parseMaybeJson(raw?.seedanceGroupsJson || raw?.seedance_groups_json, []);
  const outline = raw?.outline || (grid?.shots ? grid : null);
  const groups = raw?.seedanceGroups || raw?.groups || (Array.isArray(seedance) ? seedance : []);
  return {
    raw,
    outline,
    groups,
    generationModel: raw?.generationModel || raw?.generation_model || "",
    createdAt: raw?.createdAt || raw?.created_at || "",
  };
}

function getOutlineShots(outline: any): any[] {
  if (!outline) return [];
  return Array.isArray(outline.shots) ? outline.shots : [];
}

function getGroupIndex(group: any, fallback: number) {
  const n = group?.sceneIndex ?? group?.scene_index ?? group?.shotNumber ?? group?.shot_number;
  return Number.isFinite(Number(n)) ? Number(n) : fallback;
}

function groupTitle(group: any, index: number) {
  return group?.titleBar || group?.title_bar || group?.title || `分镜 ${index + 1}`;
}

function groupText(group: any) {
  const fields = [
    ["titleBar", group?.titleBar || group?.title_bar],
    ["mount", group?.mount],
    ["camera", group?.camera],
    ["openingFrame", group?.openingFrame || group?.opening_frame],
    ["closingFrame", group?.closingFrame || group?.closing_frame],
    ["connection", group?.connection],
    ["transition", group?.transition],
    ["dualAnchor", group?.dualAnchor || group?.dual_anchor],
    ["mainPrompt", group?.mainPrompt || group?.main_prompt],
    ["mustShow", group?.mustShow || group?.must_show],
    ["qualityRoute", group?.qualityRoute || group?.quality_route],
    ["imagingStyle", group?.imagingStyle || group?.imaging_style],
    ["qualityBaseline", group?.qualityBaseline || group?.quality_baseline],
    ["reference", group?.reference],
    ["microExpressions", group?.microExpressions || group?.micro_expressions],
    ["nailLines", group?.nailLines || group?.nail_lines],
    ["e15", group?.e15],
  ];
  return fields.filter(([, value]) => value).map(([key, value]) => `【${key}】\n${value}`).join("\n\n");
}

function reviewList(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const parsed = parseMaybeJson(value, null);
    if (Array.isArray(parsed)) return parsed;
    return value ? [value] : [];
  }
  return [value];
}

export default function PromptLab({ kind }: PromptLabProps) {
  const { invoke } = useTudouBridge();
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setRealm = useAppStore((state) => state.setRealm);
  const showToast = useAppStore((state) => state.showToast);

  const [task, setTask] = useState<ScriptTask | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [outline, setOutline] = useState<any>(null);
  const [outlineDraft, setOutlineDraft] = useState("");
  const [groups, setGroups] = useState<any[]>([]);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [activeGroup, setActiveGroup] = useState(0);
  const [quality, setQuality] = useState<any>(null);
  const [outputMeta, setOutputMeta] = useState<any>(null);
  const [busy, setBusy] = useState<BusyState>("");
  const [error, setError] = useState("");

  const title = kind === "image" ? "图像提示词 · 旧分镜链路" : "视频提示词 · 旧分镜链路";
  const Icon = kind === "image" ? ImageIcon : Film;
  const selectedTaskId = getTaskId(task) || currentTaskId || "";
  const shots = useMemo(() => getOutlineShots(outline), [outline]);

  useEffect(() => {
    setRealm(kind === "image" ? "samurai" : "valley");
    loadRecentTasks();
    if (currentTaskId) loadPromptOutput(currentTaskId, true);
  }, [kind, setRealm]);

  const loadRecentTasks = async () => {
    setBusy("history");
    try {
      const rows = await invoke<any[]>(kind === "image" ? "image/recent" : "video/recent", {}, { silent: true });
      setRecentTasks(Array.isArray(rows) ? rows : []);
    } catch {
      setRecentTasks([]);
    } finally {
      setBusy("");
    }
  };

  const loadPromptOutput = async (taskId: string, silent = false) => {
    if (!taskId) return;
    if (!silent) setBusy("output");
    setError("");
    try {
      const raw = await invoke<any>("prompt/get-output", { taskId }, { silent: true });
      if (!raw) {
        setOutputMeta(null);
        setOutline(null);
        setOutlineDraft("");
        setGroups([]);
        return;
      }
      const normalized = normalizeOutput(raw);
      setOutputMeta(normalized);
      setOutline(normalized.outline);
      setOutlineDraft(normalized.outline ? JSON.stringify(normalized.outline, null, 2) : "");
      setGroups(Array.isArray(normalized.groups) ? normalized.groups : []);
    } catch (err: any) {
      setError(err.message || "读取提示词结果失败");
    } finally {
      if (!silent) setBusy("");
    }
  };

  const onSelectScript = async (nextTask: ScriptTask, text: string) => {
    const taskId = getTaskId(nextTask);
    setTask(nextTask);
    setScriptText(text);
    setReview(null);
    setQuality(null);
    if (taskId) {
      setCurrentTaskId(taskId);
      await loadPromptOutput(taskId, true);
    }
  };

  const generateOutline = async () => {
    if (!selectedTaskId) return setError("请先选择 script task");
    setBusy("outline");
    setError("");
    setReview(null);
    try {
      const result = await invoke<any>("prompt/generate-outline", { taskId: selectedTaskId }, { timeout: 900000 });
      const nextOutline = result?.outline || result;
      setOutline(nextOutline);
      setOutlineDraft(JSON.stringify(nextOutline, null, 2));
      await loadPromptOutput(selectedTaskId, true);
      showToast("分镜大纲已生成");
    } catch (err: any) {
      setError(err.message || "分镜大纲生成失败");
    } finally {
      setBusy("");
    }
  };

  const confirmOutline = async () => {
    if (!selectedTaskId) return setError("请先选择 script task");
    setBusy("confirm");
    setError("");
    try {
      const parsed = parseMaybeJson(outlineDraft, null);
      if (!parsed) throw new Error("大纲 JSON 无法解析");
      await invoke("prompt/confirm-outline", { taskId: selectedTaskId, outline: parsed }, { timeout: 120000 });
      setOutline(parsed);
      await loadPromptOutput(selectedTaskId, true);
      showToast("分镜大纲已确认");
    } catch (err: any) {
      setError(err.message || "确认大纲失败");
    } finally {
      setBusy("");
    }
  };

  const generateAllPrompts = async () => {
    if (!selectedTaskId) return setError("请先选择 script task");
    setBusy("generate");
    setError("");
    setReview(null);
    try {
      const result = await invoke<any>("prompt/run-generation", { taskId: selectedTaskId, kind }, { timeout: 1800000 });
      const nextGroups = result?.seedanceGroups || result?.groups || [];
      setGroups(Array.isArray(nextGroups) ? nextGroups : []);
      await loadPromptOutput(selectedTaskId, true);
      showToast("逐镜提示词已生成");
    } catch (err: any) {
      setError(err.message || "逐镜提示词生成失败");
    } finally {
      setBusy("");
    }
  };

  const regenerateGroup = async (sceneIndex = activeGroup) => {
    if (!selectedTaskId) return setError("请先选择 script task");
    setBusy("group");
    setError("");
    try {
      const originalSeedance = groups.find((group, idx) => getGroupIndex(group, idx) === sceneIndex) || null;
      const result = await invoke<any>("prompt/run-group-generation", { taskId: selectedTaskId, sceneIndex, reviewFeedback, originalSeedance }, { timeout: 900000 });
      const next = result?.seedanceGroups || [];
      if (Array.isArray(next) && next.length > 0) {
        const regenerated = next[0];
        setGroups((prev) => {
          const merged = [...prev.filter((group, idx) => getGroupIndex(group, idx) !== sceneIndex), regenerated];
          return merged.sort((a, b) => getGroupIndex(a, 0) - getGroupIndex(b, 0));
        });
      }
      await loadPromptOutput(selectedTaskId, true);
      showToast(`分镜 ${sceneIndex + 1} 已重新生成`);
    } catch (err: any) {
      setError(err.message || "单镜重跑失败");
    } finally {
      setBusy("");
    }
  };

  const runQualityCheck = async () => {
    if (!selectedTaskId) return setError("请先选择 script task");
    setBusy("review");
    setError("");
    try {
      const result = await invoke<any>("prompt/quality-check", { taskId: selectedTaskId }, { timeout: 300000 });
      setQuality(result);
      setReview(result as ReviewResult);
      showToast("提示词质量检查完成");
    } catch (err: any) {
      setError(err.message || "质量检查失败");
    } finally {
      setBusy("");
    }
  };

  const loadHistoryTask = async (item: any) => {
    const taskId = item.taskId || item.task_id || "";
    if (!taskId) return;
    setCurrentTaskId(taskId);
    await loadPromptOutput(taskId);
  };

  return (
    <div className="split">
      <aside className="side-panel">
        <ScriptSelector selectedTaskId={currentTaskId} onSelect={onSelectScript} />
        <div className="card">
          <div className="section-head">
            <div><p className="eyebrow">Recent {kind} tasks</p><h3>历史入口</h3></div>
            <button className="btn ghost" onClick={loadRecentTasks}>{busy === "history" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}</button>
          </div>
          <div className="table-list">
            {recentTasks.length === 0 && <div className="empty">暂无历史任务。优先从左侧选择 script task 恢复 prompt_output_records。</div>}
            {recentTasks.map((item) => <button key={item.taskId || item.task_id} className="row-card select-row" onClick={() => loadHistoryTask(item)}>
              <span><span className="row-title">{item.mode || kind} · {(item.taskId || item.task_id || "").slice(0, 8)}</span><span className="row-meta">{item.stage || "ready"} · {formatDate(item.updatedAt || item.updated_at)}</span></span>
            </button>)}
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Script Preview</p>
          <div className="script-preview scroll">{scriptText || "请选择一个剧本任务。"}</div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="section-head">
          <div><p className="eyebrow">Outline → Confirm → Shot Prompts</p><h2><Icon size={24} /> {title}</h2></div>
          <div className="top-actions">
            <button className="btn" onClick={() => selectedTaskId && loadPromptOutput(selectedTaskId)} disabled={!selectedTaskId || busy === "output"}>{busy === "output" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}恢复结果</button>
            <button className="btn primary" onClick={generateOutline} disabled={!selectedTaskId || busy === "outline"}>{busy === "outline" ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}生成大纲</button>
            <button className="btn cyan" onClick={generateAllPrompts} disabled={!selectedTaskId || !outline || busy === "generate"}>{busy === "generate" ? <Loader2 size={16} className="spin" /> : <Activity size={16} />}逐镜生成</button>
          </div>
        </div>

        {!selectedTaskId && <div className="notice warn">请选择 script task。旧提示词链路以 script task 作为主键。</div>}
        {error && <div className="error">{error}</div>}
        {outputMeta?.generationModel && <div className="notice">已恢复 prompt_output_records · {outputMeta.generationModel} · {formatDate(outputMeta.createdAt)}</div>}

        <section className="card">
          <div className="section-head">
            <div><p className="eyebrow">Step 1</p><h3>分镜大纲</h3></div>
            <button className="btn" onClick={confirmOutline} disabled={!outlineDraft.trim() || busy === "confirm"}>{busy === "confirm" ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}确认大纲</button>
          </div>
          {outline && <div className="grid two mb-4"><div className="notice">分镜数量：{shots.length}</div><div className="notice">核心冲突：{outline.coreConflict || "未填写"}</div></div>}
          <textarea className="textarea script-input" value={outlineDraft} onChange={(event) => setOutlineDraft(event.target.value)} placeholder="生成大纲后可在这里编辑 JSON，然后点击确认大纲。" />
          {shots.length > 0 && <div className="table-list mt-4">{shots.map((shot, index) => <div className="row-card" key={shot.index ?? index}><span><span className="row-title">#{index + 1} {shot.title || shot.summary || "未命名分镜"}</span><span className="row-meta">{shot.shotType || shot.type || "D"} · {(shot.scriptContent || shot.script_content || "").slice(0, 80)}</span></span></div>)}</div>}
        </section>

        <section className="card">
          <div className="section-head">
            <div><p className="eyebrow">Step 2</p><h3>逐镜提示词</h3></div>
            <div className="top-actions"><button className="btn" onClick={runQualityCheck} disabled={!selectedTaskId || groups.length === 0 || busy === "review"}>{busy === "review" ? <Loader2 size={16} className="spin" /> : <Activity size={16} />}质量检查</button></div>
          </div>
          {groups.length === 0 ? <div className="empty">确认大纲后点击“逐镜生成”。</div> : <div className="grid two">
            <div className="table-list">
              {groups.map((group, index) => {
                const sceneIndex = getGroupIndex(group, index);
                return <button key={`${sceneIndex}-${index}`} className={`row-card select-row ${activeGroup === sceneIndex ? "active" : ""}`} onClick={() => setActiveGroup(sceneIndex)}><span><span className="row-title">#{sceneIndex + 1} {groupTitle(group, index)}</span><span className="row-meta">{group?.shotType || group?.shot_type || "shot"}</span></span></button>;
              })}
            </div>
            <div className="card inner">
              <p className="eyebrow">当前分镜 #{activeGroup + 1}</p>
              <textarea className="textarea small" value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} placeholder="可选：输入审核反馈或修改要求，然后单镜重跑。" />
              <button className="btn primary mt-3" onClick={() => regenerateGroup(activeGroup)} disabled={busy === "group"}>{busy === "group" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}重新生成单镜</button>
              <pre className="json-box mt-4">{groupText(groups.find((group, idx) => getGroupIndex(group, idx) === activeGroup) || groups[0] || {}) || "暂无内容"}</pre>
            </div>
          </div>}
        </section>

        {(quality || review) && <section className="card"><div className="section-head"><div><p className="eyebrow">Quality Check</p><h3>质量检查结果</h3></div><span className="tag">Score: {(quality || review)?.score ?? "N/A"}</span></div><pre className="json-box">{JSON.stringify({ passed: quality?.passed, issues: reviewList(quality?.issues || review?.issues), suggestions: reviewList(quality?.suggestions || review?.suggestions), raw: quality || review }, null, 2)}</pre></section>}
      </main>
    </div>
  );
}
