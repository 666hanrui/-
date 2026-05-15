import { motion } from "framer-motion";
import { Activity, Film, Image as ImageIcon, Loader2, RefreshCw, Save, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ScriptSelector from "../components/ScriptSelector";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate, getTaskId, promptSections } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { PromptResult, ReviewResult, ScriptTask } from "../types/tudou";

interface PromptLabProps {
  kind: "image" | "video";
}

export default function PromptLab({ kind }: PromptLabProps) {
  const { invoke } = useTudouBridge();
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setRealm = useAppStore((state) => state.setRealm);
  const showToast = useAppStore((state) => state.showToast);

  const [task, setTask] = useState<ScriptTask | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [style, setStyle] = useState(kind === "image" ? "电影感、写实、低饱和霓虹、强视觉锚点" : "电影分镜、真实摄影机运动、节奏清晰");
  const [goal, setGoal] = useState(kind === "image" ? "输出可直接用于图像模型的分镜提示词" : "输出可直接用于视频模型的镜头提示词");
  const [result, setResult] = useState<PromptResult | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [busy, setBusy] = useState<"generate" | "review" | "history" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRealm(kind === "image" ? "samurai" : "valley");
    loadRecentTasks();
  }, [kind, setRealm]);

  const sections = useMemo(() => promptSections(result), [result]);
  const title = kind === "image" ? "图像提示词锻造" : "视频提示词锻造";
  const Icon = kind === "image" ? ImageIcon : Film;

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

  const onSelectScript = (nextTask: ScriptTask, text: string) => {
    setTask(nextTask);
    setSourceText(text);
    const taskId = getTaskId(nextTask);
    if (taskId) setCurrentTaskId(taskId);
    setReview(null);
  };

  const generate = async () => {
    if (!sourceText.trim()) return;
    setBusy("generate");
    setError("");
    setReview(null);
    try {
      const payload =
        kind === "image"
          ? { mode: "single", sourceScript: sourceText, visualStyle: style, imageGoal: goal, existingTaskId: result?.taskId || result?.task_id }
          : { mode: "beat", scriptBeats: sourceText, videoStyle: style, motionFocus: goal, existingTaskId: result?.taskId || result?.task_id };
      const next = await invoke<PromptResult>(kind === "image" ? "prompt/image" : "prompt/video", payload, { timeout: 900_000 });
      setResult(next);
      await loadRecentTasks();
      showToast(`${kind === "image" ? "图像" : "视频"}提示词已生成`);
    } catch (err: any) {
      setError(err.message || "提示词生成失败");
    } finally {
      setBusy("");
    }
  };

  const runReview = async () => {
    const taskId = result?.taskId || result?.task_id;
    if (!taskId) return;
    setBusy("review");
    setError("");
    try {
      const next = await invoke<ReviewResult>(kind === "image" ? "prompt/image-review" : "prompt/video-review", { taskId }, { timeout: 900_000 });
      setReview(next);
      showToast("提示词审核完成");
    } catch (err: any) {
      setError(err.message || "审核失败");
    } finally {
      setBusy("");
    }
  };

  const loadHistoryTask = (item: any) => {
    setResult({ taskId: item.taskId || item.task_id, projectId: item.projectId || item.project_id, sections: [], raw: JSON.stringify(item, null, 2) });
    setReview(null);
  };

  return (
    <div className="split">
      <aside className="side-panel">
        <ScriptSelector selectedTaskId={currentTaskId} onSelect={onSelectScript} />
        <div className="card">
          <div className="section-head">
            <div><p className="eyebrow">Recent {kind} tasks</p><h3>历史任务</h3></div>
            <button className="btn ghost" onClick={loadRecentTasks}>{busy === "history" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}</button>
          </div>
          <div className="table-list">
            {recentTasks.length === 0 && <div className="empty">暂无历史任务</div>}
            {recentTasks.map((item) => <button key={item.taskId || item.task_id} className="row-card select-row" onClick={() => loadHistoryTask(item)}>
              <span><span className="row-title">{item.mode || kind} · {(item.taskId || item.task_id || "").slice(0, 8)}</span><span className="row-meta">{item.stage || "ready"} · {formatDate(item.updatedAt || item.updated_at)}</span></span>
            </button>)}
          </div>
        </div>
        <div className="card">
          <p className="eyebrow">Source Script</p>
          <textarea className="textarea script-input" value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="选择剧本后会自动填入，也可以手动粘贴。" />
        </div>
      </aside>

      <main className="main-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">{kind === "image" ? "Image Prompt" : "Video Prompt"}</p>
            <h2><Icon size={24} /> {title}</h2>
          </div>
          <div className="top-actions">
            <button className="btn primary" onClick={generate} disabled={busy === "generate" || !sourceText.trim()}>
              {busy === "generate" ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
              生成提示词
            </button>
            <button className="btn cyan" onClick={runReview} disabled={busy === "review" || !(result?.taskId || result?.task_id)}>
              {busy === "review" ? <Loader2 size={16} className="spin" /> : <Activity size={16} />}
              审核
            </button>
          </div>
        </div>

        <div className="grid two">
          <label className="field"><span className="label">{kind === "image" ? "Visual Style" : "Video Style"}</span><input className="input" value={style} onChange={(event) => setStyle(event.target.value)} /></label>
          <label className="field"><span className="label">{kind === "image" ? "Image Goal" : "Motion Focus"}</span><input className="input" value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
        </div>

        {!task && <div className="notice warn">请选择剧本/项目。没有剧本时不会黑屏，后续可从项目库或剧本任务页进入。</div>}
        {error && <div className="error">{error}</div>}
        {review && <div className={`notice ${review.status === "failed" ? "warn" : ""}`}>审核分数：{review.score ?? "N/A"} · {review.status || "done"}<br />{review.summary}</div>}

        <div className="prompt-output">
          {busy === "generate" && <div className="empty"><Loader2 size={26} className="spin" /> 本地提示词引擎正在工作...</div>}
          {!busy && sections.length === 0 && <div className="empty"><Save size={28} /> 等待生成结果</div>}
          {sections.map((section, index) => <motion.article key={`${section.title}-${index}`} className="card prompt-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}><p className="eyebrow">Segment {index + 1}</p><h3>{section.title}</h3><pre>{section.lines.join("\n")}</pre></motion.article>)}
        </div>
      </main>
    </div>
  );
}