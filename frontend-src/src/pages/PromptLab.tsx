import { motion } from "framer-motion";
import { Activity, Film, Image as ImageIcon, Loader2, Save, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ScriptSelector from "../components/ScriptSelector";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { getTaskId, promptSections } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { PromptResult, ReviewResult, ScriptTask } from "../types/tudou";

interface PromptLabProps {
  kind: "image" | "video";
}

function resultTaskId(result: any) {
  return result?.taskId || result?.task_id || result?.id || "";
}

export default function PromptLab({ kind }: PromptLabProps) {
  const { invoke } = useTudouBridge();
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const setRealm = useAppStore((state) => state.setRealm);
  const showToast = useAppStore((state) => state.showToast);

  const [task, setTask] = useState<ScriptTask | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [style, setStyle] = useState(kind === "image" ? "电影感、写实、低饱和霓虹、强视觉锚点" : "电影分镜、真实摄影机运动、节奏清晰");
  const [goal, setGoal] = useState(kind === "image" ? "输出可直接用于图像模型的分镜提示词" : "输出可直接用于视频模型的镜头提示词");
  const [result, setResult] = useState<PromptResult | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [busy, setBusy] = useState<"generate" | "review" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRealm(kind === "image" ? "samurai" : "valley");
    setStyle(kind === "image" ? "电影感、写实、低饱和霓虹、强视觉锚点" : "电影分镜、真实摄影机运动、节奏清晰");
    setGoal(kind === "image" ? "输出可直接用于图像模型的分镜提示词" : "输出可直接用于视频模型的镜头提示词");
    setResult(null);
    setReview(null);
    setError("");
  }, [kind, setRealm]);

  const sections = useMemo(() => promptSections(result), [result]);
  const title = kind === "image" ? "图像提示词锻造" : "视频提示词锻造";
  const Icon = kind === "image" ? ImageIcon : Film;
  const sourceScriptTaskId = getTaskId(task) || currentTaskId || "";
  const generatedPromptTaskId = resultTaskId(result);

  const onSelectScript = (nextTask: ScriptTask, text: string) => {
    const nextTaskId = getTaskId(nextTask);
    const projectId = nextTask.projectId || nextTask.project_id || nextTask.task?.projectId || nextTask.task?.project_id || "";
    setTask(nextTask);
    setSourceText(text);
    if (nextTaskId) setCurrentTaskId(nextTaskId);
    if (projectId) setCurrentProjectId(projectId);
    setResult(null);
    setReview(null);
    setError("");
  };

  const generate = async () => {
    if (!sourceText.trim()) return;
    setBusy("generate");
    setError("");
    setReview(null);
    try {
      const payload =
        kind === "image"
          ? {
              mode: "single",
              sourceScript: sourceText,
              visualStyle: style,
              imageGoal: goal,
              existingTaskId: generatedPromptTaskId || undefined,
              existingProjectId: undefined,
              sourceScriptTaskId,
            }
          : {
              mode: "beat",
              scriptBeats: sourceText,
              videoStyle: style,
              motionFocus: goal,
              existingTaskId: generatedPromptTaskId || undefined,
              existingProjectId: undefined,
              sourceScriptTaskId,
            };
      const next = await invoke<PromptResult>(kind === "image" ? "prompt/image" : "prompt/video", payload, { timeout: 900_000 });
      setResult(next);
      showToast(`${kind === "image" ? "图像" : "视频"}提示词已生成`);
    } catch (err: any) {
      setError(err.message || "提示词生成失败");
    } finally {
      setBusy("");
    }
  };

  const runReview = async () => {
    if (!generatedPromptTaskId) return;
    setBusy("review");
    setError("");
    try {
      const next = await invoke<ReviewResult>(kind === "image" ? "prompt/image-review" : "prompt/video-review", { taskId: generatedPromptTaskId }, { timeout: 900_000 });
      setReview(next);
      showToast("提示词审核完成");
    } catch (err: any) {
      setError(err.message || "审核失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="split">
      <aside className="side-panel">
        <ScriptSelector selectedTaskId={sourceScriptTaskId} onSelect={onSelectScript} />
        <div className="card">
          <p className="eyebrow">Source Script</p>
          <textarea className="textarea script-input" value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="选择剧本后会自动填入，也可以手动粘贴。" />
        </div>
      </aside>

      <main className="main-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">{kind === "image" ? "Image Prompt" : "Video Prompt"}</p>
            <h2>
              <Icon size={24} /> {title}
            </h2>
          </div>
          <div className="top-actions">
            <button className="btn primary" onClick={generate} disabled={busy === "generate" || !sourceText.trim()}>
              {busy === "generate" ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
              生成提示词
            </button>
            <button className="btn cyan" onClick={runReview} disabled={busy === "review" || !generatedPromptTaskId}>
              {busy === "review" ? <Loader2 size={16} className="spin" /> : <Activity size={16} />}
              审核
            </button>
          </div>
        </div>

        <div className="notice">
          当前是旧独立流程：{kind === "image" ? "prompt/image → run_image_generation → slug_image_prompt_generation.txt" : "prompt/video → run_video_generation → slug_video_prompt_generation.txt"}
        </div>

        <div className="grid two">
          <label className="field">
            <span className="label">{kind === "image" ? "Visual Style" : "Video Style"}</span>
            <input className="input" value={style} onChange={(event) => setStyle(event.target.value)} />
          </label>
          <label className="field">
            <span className="label">{kind === "image" ? "Image Goal" : "Motion Focus"}</span>
            <input className="input" value={goal} onChange={(event) => setGoal(event.target.value)} />
          </label>
        </div>

        {error && <div className="error">{error}</div>}
        {review && (
          <div className={`notice ${review.status === "failed" ? "warn" : ""}`}>
            审核分数：{review.score ?? "N/A"} · {review.status || "done"}
            <br />
            {review.summary}
          </div>
        )}

        <div className="prompt-output">
          {busy === "generate" && <div className="empty"><Loader2 size={26} className="spin" /> 本地提示词引擎正在工作...</div>}
          {!busy && sections.length === 0 && <div className="empty"><Save size={28} /> 等待生成结果</div>}
          {sections.map((section, index) => (
            <motion.article key={`${section.title}-${index}`} className="card prompt-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <p className="eyebrow">Segment {index + 1}</p>
              <h3>{section.title}</h3>
              <pre>{section.lines.join("\n")}</pre>
            </motion.article>
          ))}
        </div>
      </main>
    </div>
  );
}
