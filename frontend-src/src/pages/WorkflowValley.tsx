import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import StepEngine from "../components/workflow/StepEngine";
import AiDoctorPanel from "../components/workflow/AiDoctorPanel";
import { WORKFLOW_STEPS } from "../constants";
import { getActiveVersion } from "../lib/format";
import type { ProjectRecord } from "../types/tudou";
import {
  CheckCircle2,
  Circle,
  Activity,
  ChevronRight,
  Wand2,
  Loader2,
  AlertTriangle,
  FolderKanban,
  FileText,
  Boxes,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTudouBridge } from "../hooks/useTudouBridge";

export default function WorkflowValley() {
  const {
    setRealm,
    currentStep,
    setCurrentStep,
    scriptSeed,
    setScriptSeed,
    currentProjectId,
    setCurrentProjectId,
    currentTaskId,
    setCurrentTaskId,
    isDoctorPanelOpen,
    setDoctorPanelOpen,
    showToast,
  } = useAppStore();
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const [direction, setDirection] = useState(1);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [error, setError] = useState("");
  const [staleProjectId, setStaleProjectId] = useState<string | null>(null);

  useEffect(() => {
    setRealm("valley");
  }, [setRealm]);

  const clearStaleWorkflow = (projectId: string, message: string) => {
    setProject(null);
    setStaleProjectId(projectId);
    setCurrentProjectId(null);
    setError(message);
    showToast(message);
  };

  const reloadProject = async () => {
    if (!currentProjectId) return;
    const requestedProjectId = currentProjectId;
    setIsLoadingProject(true);
    setError("");
    try {
      const next = await invoke<ProjectRecord | null>("screenplay/get", { projectId: requestedProjectId }, { silent: true });
      if (!next) {
        clearStaleWorkflow(requestedProjectId, "未找到该工作流项目。已清除失效的工作流选择，请从项目库重新选择，或继续使用已有剧本任务进入资产/Prompt 页面。");
        return;
      }
      setStaleProjectId(null);
      setProject(next);
      const init = next.init || {};
      setScriptSeed(String(init.concept || init.name || scriptSeed || ""));
      setCurrentProjectId(next.projectId || next.project_id || requestedProjectId);
      setCurrentTaskId(next.linkedScriptTaskId || next.linked_script_task_id || currentTaskId || null);
      const backendStep = Number(next.currentStep || next.current_step || 1);
      const nextIndex = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, backendStep - 1));
      setCurrentStep(nextIndex);
    } catch (err: any) {
      setError(err.message || "恢复工作流项目失败");
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    reloadProject();
  }, [currentProjectId]);

  const activeStep = WORKFLOW_STEPS[currentStep] || WORKFLOW_STEPS[0];
  const activeVersion = useMemo(() => getActiveVersion(project, activeStep.id), [project, activeStep.id]);
  const doneSteps = project?.doneSteps || project?.done_steps || [];

  if (!currentProjectId && !scriptSeed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 backdrop-blur-md p-8">
        <Wand2 size={48} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">引擎缺少初始参数</h2>
        <p className="text-white/50 mb-6 text-sm text-center">请返回灵感枢纽输入宇宙碎片，或从项目库打开已有项目。</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => navigate("/")} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all">返回枢纽</button>
          <button onClick={() => navigate("/projects")} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all">打开项目库</button>
          {currentTaskId && <button onClick={() => navigate("/assets")} className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all">进入资产矩阵</button>}
        </div>
      </div>
    );
  }

  if (!currentProjectId && staleProjectId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/20 backdrop-blur-md p-8">
        <div className="max-w-3xl w-full rounded-[2rem] border border-red-500/20 bg-black/55 p-8 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-300 flex items-center justify-center"><AlertTriangle size={24} /></div>
            <div>
              <p className="eyebrow">Workflow Recovery</p>
              <h2 className="text-2xl font-black text-white mb-2">当前工作流项目锚点已失效</h2>
              <p className="text-white/60 text-sm leading-6">前端保存的工作流项目 ID 在当前本地项目文件目录中找不到。资产、剧本任务、Prompt 记录可能仍在 SQLite 中，不代表数据全部丢失。</p>
            </div>
          </div>
          <div className="notice warn mb-6">失效 Project ID：<span className="font-mono">{staleProjectId}</span></div>
          <div className="grid md:grid-cols-2 gap-3">
            <button className="btn primary justify-start" onClick={() => navigate("/projects")}><FolderKanban size={16} /> 从项目库重新选择</button>
            <button className="btn justify-start" onClick={() => navigate("/")}><Wand2 size={16} /> 返回灵感枢纽新建项目</button>
            <button className="btn cyan justify-start" onClick={() => navigate("/scripts")}><FileText size={16} /> 进入剧本任务页</button>
            <button className="btn cyan justify-start" onClick={() => navigate("/assets")} disabled={!currentTaskId}><Boxes size={16} /> 使用当前剧本任务进入资产矩阵</button>
          </div>
          {!currentTaskId && <p className="text-white/35 text-xs mt-4">当前没有有效 script task 选择，建议先从项目库重新选择项目或进入剧本任务页。</p>}
        </div>
      </div>
    );
  }

  const handleStepChange = (newStep: number) => {
    const safeStep = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, newStep));
    setDirection(safeStep > currentStep ? 1 : -1);
    setCurrentStep(safeStep);
  };

  const handleProjectChanged = (nextProject?: ProjectRecord | null) => {
    if (nextProject) {
      setProject(nextProject);
      const backendStep = Number(nextProject.currentStep || nextProject.current_step || activeStep.id);
      const nextIndex = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, backendStep - 1));
      setCurrentStep(nextIndex);
      if (nextProject.linkedScriptTaskId || nextProject.linked_script_task_id) {
        setCurrentTaskId(nextProject.linkedScriptTaskId || nextProject.linked_script_task_id || null);
      }
      return;
    }
    reloadProject();
  };

  return (
    <div className="w-full h-full flex relative overflow-hidden">
      <div className="w-72 h-full flex flex-col p-6 relative z-10 border-r border-white/5 bg-black/20 backdrop-blur-xl shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="mb-10 px-2">
          <h2 className="text-xs tracking-[0.2em] font-mono text-white/40 uppercase mb-2">Workflow Sequence</h2>
          <div className="w-full h-[1px] bg-gradient-to-r from-indigo-500/50 to-transparent" />
        </div>
        <div className="flex-1 flex flex-col gap-6 relative px-2 custom-scrollbar overflow-y-auto">
          <div className="absolute left-[17px] top-4 bottom-8 w-[1px] bg-white/5 z-0" />
          <motion.div className="absolute left-[17px] top-4 w-[2px] bg-indigo-500 z-0 shadow-[0_0_10px_rgba(99,102,241,0.8)]" animate={{ height: `${(currentStep / (WORKFLOW_STEPS.length - 1)) * 100}%` }} transition={{ type: "spring" as const, stiffness: 100, damping: 20 }} />
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = doneSteps.includes(step.id);
            return (
              <div key={step.id} onClick={() => handleStepChange(index)} className={`relative z-10 flex items-start gap-4 cursor-pointer group ${isActive ? "opacity-100" : "opacity-40 hover:opacity-80 transition-opacity"}`}>
                <div className="mt-1 relative bg-[#050505] rounded-full">
                  {isActive && <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-60 animate-pulse" />}
                  {isCompleted ? <CheckCircle2 size={20} className="text-indigo-400 relative z-10" /> : <Circle size={20} className={`relative z-10 ${isActive ? "text-indigo-400 fill-indigo-500/20" : "text-white/30"}`} />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm tracking-widest transition-all duration-300 ${isActive ? "font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-105 origin-left" : "font-medium text-white/70"}`}>{step.title}</span>
                  <span className="text-[10px] text-white/30 font-mono mt-1">{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setDoctorPanelOpen(!isDoctorPanelOpen)} className="mt-6 w-full flex items-center justify-between p-4 rounded-2xl bg-cyan-900/20 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-500/40 transition-all group overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          <div className="flex items-center gap-3 relative z-10"><Activity size={18} className="group-hover:animate-pulse" /><span className="text-sm font-bold tracking-widest">剧本诊断 HUD</span></div>
          <ChevronRight size={16} className="text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all relative z-10" />
        </button>
      </div>

      <div className="flex-1 h-full relative p-6 overflow-hidden flex flex-col perspective-1000">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-6 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3 max-w-2xl w-max shadow-2xl">
          <Wand2 size={14} className="text-indigo-400" /><span className="text-xs text-white/50 font-mono truncate">GENESIS SEED:</span><span className="text-sm text-white/90 truncate max-w-md italic">{scriptSeed || project?.init?.concept || project?.init?.name || "未命名项目"}</span>
        </div>

        {isLoadingProject && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm"><div className="flex items-center gap-3 text-white/70 bg-black/60 border border-white/10 px-5 py-3 rounded-2xl"><Loader2 size={18} className="animate-spin" /> 正在恢复工作流状态...</div></div>}
        {error && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-red-950/80 border border-red-500/30 text-red-100 px-4 py-2 rounded-2xl text-sm"><AlertTriangle size={16} /> {error}</div>}

        <div className="flex-1 w-full h-full relative mt-14">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} variants={{ enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 60 : -60, scale: 0.98, filter: "blur(10px)" }), center: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }, exit: (dir: number) => ({ opacity: 0, y: dir > 0 ? -60 : 60, scale: 0.98, filter: "blur(10px)" }) }} initial="enter" animate="center" exit="exit" transition={{ type: "spring" as const, stiffness: 300, damping: 30 }} className="absolute inset-0 w-full h-full">
              <StepEngine stepConfig={activeStep} isLastStep={currentStep === WORKFLOW_STEPS.length - 1} activeVersion={activeVersion} project={project} onProjectChanged={handleProjectChanged} onNext={() => handleStepChange(currentStep + 1)} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <AiDoctorPanel />
    </div>
  );
}
