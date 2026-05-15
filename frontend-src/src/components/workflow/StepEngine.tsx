import React, { useState, useRef, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTudouBridge } from "../../hooks/useTudouBridge";
import { useAppStore } from "../../store/useAppStore";
import type { ProjectRecord, StepVersion } from "../../types/tudou";
import {
  Play,
  Edit3,
  Save,
  RefreshCw,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StepEngineProps {
  stepConfig: any;
  isLastStep: boolean;
  activeVersion?: StepVersion | null;
  project?: ProjectRecord | null;
  onProjectChanged?: (project?: ProjectRecord | null) => void;
  onNext: () => void;
}

export default function StepEngine({
  stepConfig,
  isLastStep,
  activeVersion,
  project,
  onProjectChanged,
  onNext,
}: StepEngineProps) {
  const { invoke } = useTudouBridge();
  const { currentProjectId } = useAppStore();

  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(activeVersion?.output || activeVersion?.text || "");
    setIsEditing(false);
    setError("");
  }, [activeVersion?.id, stepConfig.id]);

  useEffect(() => {
    if (isGenerating)
      contentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [content, isGenerating]);

  const handleIgnite = async () => {
    if (!currentProjectId) return alert("致命错误：缺失 ProjectID");
    setIsGenerating(true);
    setContent("");
    setError("");
    setIsEditing(false);

    let streamed = "";
    let unlistenFn: (() => void) | null = null;
    try {
      unlistenFn = await listen("screenplay:stream-chunk", (event: any) => {
        const payload = event.payload || {};
        if (
          payload.projectId === currentProjectId &&
          payload.stepNumber === stepConfig.id
        ) {
          streamed += payload.chunk || "";
          setContent((prev) => prev + (payload.chunk || ""));
        }
      });

      const result = await invoke<any>(
        "workflow/generate",
        {
          projectId: currentProjectId,
          stepNumber: stepConfig.id,
        },
        { timeout: 300000 }
      );

      const finalText = result?.text || streamed;
      if (finalText) setContent(finalText);
      onProjectChanged?.();
    } catch (error: any) {
      const message = error.message || "生成失败";
      setError(message);
      setContent(streamed || `\n\n[CRITICAL ERROR] 引擎推演阻断：${message}`);
    } finally {
      if (unlistenFn) unlistenFn();
      setIsGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!currentProjectId) return alert("致命错误：缺失 ProjectID");
    if (!content.trim()) return;
    setIsApproving(true);
    setError("");
    try {
      const nextStep = isLastStep ? stepConfig.id : stepConfig.id + 1;
      const nextProject = await invoke<ProjectRecord>(
        "workflow/approve",
        {
          projectId: currentProjectId,
          stepNumber: stepConfig.id,
          nextStep,
        },
        { timeout: 120000 }
      );
      onProjectChanged?.(nextProject);
      if (!isLastStep) onNext();
    } catch (err: any) {
      setError(err.message || "批准本步失败");
    } finally {
      setIsApproving(false);
    }
  };

  const doneSteps = project?.doneSteps || project?.done_steps || [];
  const isApproved = doneSteps.includes(stepConfig.id);

  return (
    <div className="w-full h-full flex flex-col bg-[#080808]/80 backdrop-blur-2xl rounded-[2rem] border border-white/[0.08] shadow-[0_30px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group">
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 blur-[100px] transition-all duration-1000 pointer-events-none ${
          isGenerating
            ? "bg-indigo-600/30 animate-pulse"
            : "bg-indigo-900/10"
        }`}
      />

      <header className="flex items-center justify-between px-8 py-6 border-b border-white/[0.05] relative z-10">
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold text-white tracking-widest flex items-center gap-3">
            {stepConfig.title}
            {isApproved && <CheckCircle2 size={20} className="text-green-400" />}
          </h3>
          <span className="text-[10px] font-mono text-white/30 uppercase mt-1">
            Step Module ID: {stepConfig.id} {activeVersion?.id ? `· Version ${activeVersion.id}` : ""}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleIgnite}
            disabled={isGenerating || isApproving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all duration-300 disabled:opacity-50 active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={16} />
            ) : content ? (
              <RefreshCw size={16} />
            ) : (
              <Play size={16} className="fill-white" />
            )}
            {isGenerating
              ? "流式解算中..."
              : content
              ? "重新推演"
              : "生成"}
          </button>
          <AnimatePresence>
            {content && !isGenerating && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  isEditing
                    ? "bg-white text-black"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                {isEditing ? <Save size={16} /> : <Edit3 size={16} />}
                {isEditing ? "保存覆写" : "介入编辑"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative z-10">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
        {!content && !isGenerating ? (
          <div className="h-full flex flex-col items-center justify-center text-white/20">
            <Play size={48} className="mb-4 opacity-30" />
            <p className="tracking-widest uppercase font-mono text-sm">
              Awaiting Engine Ignition
            </p>
            <p className="text-xs text-white/30 mt-2">
              若这是旧项目，当前步骤还没有 active version 输出。
            </p>
          </div>
        ) : isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-transparent text-white/90 text-lg leading-loose p-4 focus:outline-none resize-none font-serif custom-scrollbar"
            autoFocus
          />
        ) : (
          <div className="prose prose-invert max-w-none font-serif text-lg leading-loose text-white/80 whitespace-pre-wrap">
            {content}
            {isGenerating && (
              <span className="inline-block w-[0.6em] h-[1.2em] bg-white/80 align-middle ml-1 animate-[pulse_0.8s_infinite]" />
            )}
            <div ref={contentEndRef} className="h-10" />
          </div>
        )}
      </div>

      <div className="px-8 py-5 border-t border-white/[0.05] flex justify-between items-center bg-black/20 relative z-10">
        <div className="text-white/30 text-xs font-mono flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isGenerating
                ? "bg-yellow-400 animate-ping"
                : content
                ? isApproved
                  ? "bg-green-400"
                  : "bg-cyan-400"
                : "bg-white/20"
            }`}
          />
          {isGenerating
            ? "STREAMING DATA..."
            : isApproved
            ? "STEP APPROVED"
            : content
            ? "MODULE READY"
            : "STANDBY"}
        </div>
        <button
          onClick={handleApprove}
          disabled={!content || isGenerating || isApproving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm transition-all duration-300 disabled:opacity-20 disabled:scale-100 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] group"
        >
          {isApproving ? <Loader2 size={16} className="animate-spin" /> : null}
          {isLastStep ? "批准并进入资产锻造" : "批准本步并进入下一步"}
          <ArrowRight
            size={16}
            className="group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
}