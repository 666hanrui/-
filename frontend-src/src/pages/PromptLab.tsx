import { motion } from "framer-motion";
import { Activity, Boxes, Clapperboard, FileText, Film, FolderKanban, Image as ImageIcon, Loader2, Route, Save, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
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
  const title = kind === "image" ? "图像提示词 / 验收工作台" : "视频提示词 / 验收工作台";
  const Icon = kind === "image" ? ImageIcon : Film;
  const sourceScriptTaskId = getTaskId(task) || currentTaskId || "";
  const generatedPromptTaskId = resultTaskId(result);
  const flowLabel = kind === "image" ? "prompt/image → run_image_generation" : "prompt/video → run_video_generation";
  const promptFile = kind === "image" ? "slug_image_prompt_generation.txt" : "slug_video_prompt_generation.txt";
  const reviewLabel = kind === "image" ? "prompt/image-review" : "prompt/video-review";
  const reviewStatus = review ? `${review.score ?? "N/A"} · ${review.status || "done"}` : "未审核";
  const sourceLength = sourceText.trim().length;
  const outputStatus = busy === "generate" ? "生成中" : generatedPromptTaskId ? "已有提示词结果" : "待生成";

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
    if (!sourceText.trim()) return setError("请先选择 script task 或粘贴源剧本正文。 ");
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
              existingProjectId: currentProjectId || undefined,
              sourceScriptTaskId,
            }
          : {
              mode: "beat",
              scriptBeats: sourceText,
              videoStyle: style,
              motionFocus: goal,
              existingTaskId: generatedPromptTaskId || undefined,
              existingProjectId: currentProjectId || undefined,
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
    if (!generatedPromptTaskId) return setError("请先生成提示词，再运行审核。 ");
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
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Prompt Recovery Console</p>
              <h2><Icon size={24} /> {title}</h2>
              <p className="row-meta mt-1">{outputStatus}</p>
            </div>
            <div className="top-actions flex-wrap">
              <button className="btn ghost" onClick={() => navigate("/projects")}><FolderKanban size={16} /> 项目库</button>
              <button className="btn ghost" onClick={() => navigate("/scripts")}><FileText size={16} /> 剧本</button>
              <button className="btn ghost" onClick={() => navigate("/assets")} disabled={!sourceScriptTaskId}><Boxes size={16} /> 资产</button>
              <button className="btn ghost" onClick={() => navigate(kind === "image" ? "/video" : "/image")} disabled={!sourceScriptTaskId}>{kind === "image" ? <Film size={16} /> : <ImageIcon size={16} />} {kind === "image" ? "视频" : "图像"}</button>
              <button className="btn ghost" onClick={() => navigate("/seedance")} disabled={!sourceScriptTaskId}><Clapperboard size={16} /> Seedance</button>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-3 mt-4">
            <InfoCard label="Project" value={currentProjectId || "未绑定"} />
            <InfoCard label="Source Script Task" value={sourceScriptTaskId || "未选择"} />
            <InfoCard label="Prompt Task" value={generatedPromptTaskId || "未生成"} />
            <InfoCard label="审核状态" value={reviewStatus} />
          </div>
          <div className="notice mt-4"><Route size={15} /> 当前为旧独立流程：{flowLabel} → {promptFile}。审核入口：{reviewLabel}。逐镜分镜链路仍保留在后端，后续单独整理为分镜工作台。</div>
          {error && <div className="error mt-4">{error}</div>}
          {review && <div className={`notice mt-4 ${review.status === "failed" ? "warn" : ""}`}>审核分数：{review.score ?? "N/A"} · {review.status || "done"}<br />{review.summary}</div>}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <aside className="space-y-6">
            <ScriptSelector selectedTaskId={sourceScriptTaskId} onSelect={onSelectScript} />
            <section className="card">
              <p className="eyebrow">Source Script</p>
              <div className="grid two mb-3">
                <MiniStat label="源文本长度" value={sourceLength} />
                <MiniStat label="结果段落" value={sections.length} />
              </div>
              <textarea className="textarea script-input" value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder="选择剧本后会自动填入，也可以手动粘贴。" />
            </section>
          </aside>

          <main className="space-y-6">
            <section className="card">
              <div className="section-head">
                <div><p className="eyebrow">Generation Controls</p><h3>{kind === "image" ? "独立图像提示词" : "独立视频提示词"}</h3></div>
                <div className="top-actions">
                  <button className="btn primary" onClick={generate} disabled={busy === "generate" || !sourceText.trim()}>{busy === "generate" ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />} 生成提示词</button>
                  <button className="btn cyan" onClick={runReview} disabled={busy === "review" || !generatedPromptTaskId}>{busy === "review" ? <Loader2 size={16} className="spin" /> : <Activity size={16} />} 审核</button>
                </div>
              </div>
              <div className="grid two">
                <label className="field"><span className="label">{kind === "image" ? "Visual Style" : "Video Style"}</span><input className="input" value={style} onChange={(event) => setStyle(event.target.value)} /></label>
                <label className="field"><span className="label">{kind === "image" ? "Image Goal" : "Motion Focus"}</span><input className="input" value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
              </div>
            </section>

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
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 min-w-0"><div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">{label}</div><div className="text-white/85 text-xs font-mono truncate" title={value}>{value}</div></div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"><div className="text-white text-lg font-black">{value}</div><div className="text-white/40 text-xs">{label}</div></div>;
}
