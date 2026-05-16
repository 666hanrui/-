import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, CheckCircle2, FileText, Film, Image as ImageIcon, Loader2, RefreshCw, Save, SearchCheck, Upload, Wand2 } from "lucide-react";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate, getProjectId, getProjectName, getScriptText, getTaskId, getUpdatedAt } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { ReviewResult, ScriptTask } from "../types/tudou";

function parseList(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [value];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return Object.entries(parsed).map(([key, val]) => ({ key, value: val }));
    return [parsed];
  } catch {
    return value.trim() ? [value] : [];
  }
}

function normalizeReview(raw: any): ReviewResult | null {
  if (!raw) return null;
  return {
    ...raw,
    issues: raw.issues || parseList(raw.issuesJson || raw.issues_json),
    suggestions: raw.suggestions || parseList(raw.suggestionsJson || raw.suggestions_json),
    dimensions: raw.dimensions || parseList(raw.dimensionsJson || raw.dimensions_json),
  };
}

function resultTaskId(result: any) {
  return result?.taskId || result?.task_id || result?.scriptTaskId || result?.script_task_id || "";
}

function resultProjectId(result: any) {
  return result?.projectId || result?.project_id || "";
}

function itemText(item: any) {
  if (typeof item === "string") return item;
  if (item?.key) return `${item.key}: ${typeof item.value === "string" ? item.value : JSON.stringify(item.value)}`;
  if (item?.title && item?.content) return `${item.title}: ${item.content}`;
  if (item?.name && item?.score !== undefined) return `${item.name}: ${item.score} ${item.comment || item.reason || ""}`;
  return JSON.stringify(item, null, 2);
}

function ReviewList({ title, items }: { title: string; items?: any[] }) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div className="card inner">
      <p className="eyebrow">{title}</p>
      {rows.length === 0 ? <div className="empty">暂无内容</div> : <div className="space-y-2">{rows.map((item, index) => <div key={index} className="notice">{itemText(item)}</div>)}</div>}
    </div>
  );
}

export default function ScriptTasksPage() {
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const setRealm = useAppStore((state) => state.setRealm);
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const showToast = useAppStore((state) => state.showToast);

  const [tasks, setTasks] = useState<ScriptTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScriptTask | null>(null);
  const [scriptBody, setScriptBody] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const [mode, setMode] = useState("plot");
  const [inputSummary, setInputSummary] = useState("");
  const [genre, setGenre] = useState("短剧 / 反转 / 情绪冲突");
  const [style, setStyle] = useState("强钩子、快节奏、适合短视频连续剧");
  const [duration, setDuration] = useState("2分钟");
  const [audience, setAudience] = useState("短视频观众");
  const [tone, setTone] = useState("强冲突、强反转、强情绪");
  const [ending, setEnding] = useState("结尾反转并留下下一集钩子");
  const [outputMode, setOutputMode] = useState("full_script");
  const [episodes, setEpisodes] = useState("1");
  const [customStyle, setCustomStyle] = useState("");
  const [importBody, setImportBody] = useState("");

  const selectedTaskId = getTaskId(selectedTask);

  useEffect(() => {
    setRealm("valley");
    loadTasks(currentTaskId || undefined);
  }, [setRealm]);

  useEffect(() => {
    if (currentTaskId && currentTaskId !== selectedTaskId) {
      const hit = tasks.find((task) => getTaskId(task) === currentTaskId);
      if (hit) selectTask(hit);
    }
  }, [currentTaskId, tasks.length]);

  async function loadTasks(selectId?: string) {
    setBusy("load");
    setError("");
    try {
      const rows = await invoke<ScriptTask[]>("script/recent", {}, { silent: true });
      const list = Array.isArray(rows) ? rows : [];
      setTasks(list);
      const targetId = selectId || currentTaskId || "";
      if (targetId) {
        const hit = list.find((item) => getTaskId(item) === targetId);
        if (hit) await selectTask(hit);
      }
    } catch (err: any) {
      setError(err.message || "读取剧本任务失败");
    } finally {
      setBusy("");
    }
  }

  async function selectTask(task: ScriptTask) {
    const taskId = getTaskId(task);
    if (!taskId) return;
    setBusy("load");
    setError("");
    try {
      const full = await invoke<ScriptTask>("script/load", { taskId }, { silent: true });
      const merged = { ...task, ...full };
      setSelectedTask(merged);
      setScriptBody(getScriptText(merged));
      setReview(normalizeReview((merged as any).review));
      setCurrentTaskId(taskId);
      const projectId = getProjectId(merged) || getProjectId(task);
      if (projectId) setCurrentProjectId(projectId);
    } catch (err: any) {
      setError(err.message || "读取剧本详情失败");
    } finally {
      setBusy("");
    }
  }

  async function selectCreatedResult(result: ScriptTask | any, fallbackBody = "") {
    const taskId = resultTaskId(result) || getTaskId(result);
    const projectId = resultProjectId(result) || getProjectId(result);
    if (taskId) setCurrentTaskId(taskId);
    if (projectId) setCurrentProjectId(projectId);
    await loadTasks(taskId);
    if (taskId) {
      setSelectedTask(result);
      setScriptBody(getScriptText(result) || fallbackBody);
    }
  }

  async function saveDraft() {
    setBusy("draft");
    setError("");
    try {
      const result = await invoke<any>("script/save-draft", { mode, input_summary: inputSummary, genre, style, duration });
      await selectCreatedResult(result);
      showToast("剧本草稿已保存");
    } catch (err: any) {
      setError(err.message || "保存草稿失败");
    } finally {
      setBusy("");
    }
  }

  async function generateScript() {
    if (!inputSummary.trim()) return setError("请先填写剧情描述");
    setBusy("generate");
    setError("");
    try {
      const result = await invoke<ScriptTask>("script/generate", {
        mode,
        duration,
        inputSummary,
        stylePreset: style,
        genres: genre,
        audience,
        tone,
        ending,
        outputMode,
        episodes,
        customStyle,
        existingProjectId: selectedTask ? getProjectId(selectedTask) : undefined,
        existingTaskId: selectedTask ? getTaskId(selectedTask) : undefined,
      }, { timeout: 900000 });
      const body = getScriptText(result) || (result.sections || []).map((s: any) => s.content || "").join("\n\n");
      await selectCreatedResult(result, body);
      setReview(null);
      showToast("剧本生成完成");
    } catch (err: any) {
      setError(err.message || "生成剧本失败");
    } finally {
      setBusy("");
    }
  }

  async function importScript() {
    if (!importBody.trim()) return setError("请先粘贴剧本正文");
    setBusy("import");
    setError("");
    try {
      const result = await invoke<ScriptTask>("script/import", { script_body: importBody, input_summary: inputSummary || importBody.slice(0, 180), duration });
      await selectCreatedResult(result, getScriptText(result) || importBody);
      setReview(null);
      setImportBody("");
      showToast("剧本已导入");
    } catch (err: any) {
      setError(err.message || "导入剧本失败");
    } finally {
      setBusy("");
    }
  }

  async function saveBody() {
    if (!selectedTaskId) return;
    setBusy("save");
    setError("");
    try {
      await invoke("script/update-body", { taskId: selectedTaskId, newBody: scriptBody }, { silent: true });
      showToast("剧本正文已保存");
      await loadTasks(selectedTaskId);
    } catch (err: any) {
      setError(err.message || "保存正文失败");
    } finally {
      setBusy("");
    }
  }

  async function runReview() {
    if (!selectedTaskId) return;
    setBusy("review");
    setError("");
    try {
      await invoke("script/update-body", { taskId: selectedTaskId, newBody: scriptBody }, { silent: true });
      const result = await invoke<ReviewResult>("script/review", { taskId: selectedTaskId }, { timeout: 900000 });
      setReview(normalizeReview(result));
      showToast("剧本审核完成");
      await loadTasks(selectedTaskId);
    } catch (err: any) {
      setError(err.message || "剧本审核失败");
    } finally {
      setBusy("");
    }
  }

  function goNext(path: string) {
    if (!selectedTaskId) return setError("请先选择、生成或导入一个 script task");
    setCurrentTaskId(selectedTaskId);
    const projectId = getProjectId(selectedTask || undefined);
    if (projectId) setCurrentProjectId(projectId);
    navigate(path);
  }

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <aside className="space-y-6">
          <section className="card">
            <div className="section-head">
              <div><p className="eyebrow">Unified Script Tasks</p><h3>剧本任务统一入口</h3></div>
              <button className="btn ghost" onClick={() => loadTasks(selectedTaskId)} disabled={busy === "load"}>{busy === "load" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}</button>
            </div>
            <div className="table-list">
              {tasks.length === 0 && <div className="empty">暂无剧本任务</div>}
              {tasks.map((task) => {
                const taskId = getTaskId(task);
                return <button key={taskId} className={`row-card select-row ${selectedTaskId === taskId ? "active" : ""}`} onClick={() => selectTask(task)}>
                  <span><span className="row-title"><FileText size={15} /> {getProjectName(task)}</span><span className="row-meta">{task.mode || "plot"} · {task.stage || "idle"} · {formatDate(getUpdatedAt(task))}</span></span>
                </button>;
              })}
            </div>
          </section>
          <section className="card">
            <p className="eyebrow">进入后续模块</p>
            <div className="grid two">
              <button className="btn" onClick={() => goNext("/assets")}><Boxes size={16} /> 资产</button>
              <button className="btn" onClick={() => goNext("/image")}><ImageIcon size={16} /> 图像</button>
              <button className="btn" onClick={() => goNext("/video")}><Film size={16} /> 视频</button>
              <button className="btn" onClick={() => goNext("/seedance")}><Wand2 size={16} /> Seedance</button>
            </div>
          </section>
        </aside>
        <main className="space-y-6">
          <section className="card">
            <div className="section-head"><div><p className="eyebrow">Planning → Writing</p><h2><FileText size={24} /> 剧本任务体系</h2></div>{selectedTaskId && <span className="tag">Task: {selectedTaskId.slice(0, 8)}</span>}</div>
            {error && <div className="error">{error}</div>}
            <div className="grid two">
              <label className="field"><span className="label">Mode</span><input className="input" value={mode} onChange={(e) => setMode(e.target.value)} /></label>
              <label className="field"><span className="label">Duration</span><input className="input" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
              <label className="field"><span className="label">Genre</span><input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} /></label>
              <label className="field"><span className="label">Style</span><input className="input" value={style} onChange={(e) => setStyle(e.target.value)} /></label>
              <label className="field"><span className="label">Audience</span><input className="input" value={audience} onChange={(e) => setAudience(e.target.value)} /></label>
              <label className="field"><span className="label">Tone</span><input className="input" value={tone} onChange={(e) => setTone(e.target.value)} /></label>
              <label className="field"><span className="label">Ending</span><input className="input" value={ending} onChange={(e) => setEnding(e.target.value)} /></label>
              <label className="field"><span className="label">Episodes</span><input className="input" value={episodes} onChange={(e) => setEpisodes(e.target.value)} /></label>
            </div>
            <label className="field mt-4"><span className="label">剧情描述</span><textarea className="textarea" value={inputSummary} onChange={(e) => setInputSummary(e.target.value)} placeholder="不走八步，直接输入剧情概念、人物冲突、目标平台和风格要求。" /></label>
            <label className="field mt-4"><span className="label">Custom Style</span><textarea className="textarea small" value={customStyle} onChange={(e) => setCustomStyle(e.target.value)} placeholder="可选：补充结构、禁忌、语言、平台规则。" /></label>
            <div className="top-actions mt-4">
              <button className="btn" onClick={saveDraft} disabled={busy === "draft"}><Save size={16} /> 新建草稿</button>
              <button className="btn primary" onClick={generateScript} disabled={busy === "generate"}>{busy === "generate" ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />} 生成剧本</button>
            </div>
          </section>
          <section className="card">
            <div className="section-head"><div><p className="eyebrow">Import Existing Script</p><h3><Upload size={20} /> 导入已有剧本</h3></div><button className="btn" onClick={importScript} disabled={busy === "import"}>导入</button></div>
            <textarea className="textarea script-input" value={importBody} onChange={(e) => setImportBody(e.target.value)} placeholder="粘贴已有剧本正文，导入后会生成同一种 script_task + script_output。" />
          </section>
          <section className="card">
            <div className="section-head"><div><p className="eyebrow">Script Output</p><h3>正文编辑</h3></div><div className="top-actions"><button className="btn" onClick={saveBody} disabled={!selectedTaskId || busy === "save"}>保存修改</button><button className="btn cyan" onClick={runReview} disabled={!selectedTaskId || busy === "review"}><SearchCheck size={16} /> 运行审核</button></div></div>
            <textarea className="textarea script-editor" value={scriptBody} onChange={(e) => setScriptBody(e.target.value)} placeholder="选择、生成或导入剧本后，可在这里编辑正文。" />
          </section>
          {review && <section className="card"><div className="section-head"><div><p className="eyebrow">Review Result</p><h3><CheckCircle2 size={20} /> 审核结果</h3></div><span className="tag">Score: {review.score ?? "N/A"} · {review.status || "done"}</span></div>{review.summary && <div className="notice">{review.summary}</div>}<div className="grid two mt-4"><ReviewList title="维度评分" items={review.dimensions} /><ReviewList title="问题" items={review.issues} /><ReviewList title="建议" items={review.suggestions} /></div></section>}
        </main>
      </div>
    </div>
  );
}
