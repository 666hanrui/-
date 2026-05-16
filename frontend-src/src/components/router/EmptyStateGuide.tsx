import React from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Sparkles, AlertCircle, FileText } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

interface EmptyStateProps {
  type: "project" | "task";
}

export default function EmptyStateGuide({ type }: EmptyStateProps) {
  const navigate = useNavigate();
  const isZh = useAppStore((state) => state.language) === "zh";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-black/20 backdrop-blur-md rounded-[2.5rem]">
      <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        {type === "project"
          ? isZh ? "缺失工作流上下文" : "Missing Workflow Context"
          : isZh ? "缺失剧本任务上下文" : "Missing Script Task Context"}
      </h2>
      <p className="text-white/50 text-sm max-w-md text-center leading-relaxed mb-8">
        {type === "project"
          ? isZh ? "当前页面需要正在进行中的 Workflow Project。可以从项目库恢复，或新建一个项目。" : "This page requires an active Workflow Project. Please restore or create a new one."
          : isZh ? "当前操作需要绑定一个 Script Task。请先完成工作流并 Finalize，或者前往剧本任务页导入或选择任务。" : "This action requires a Script Task. Please finalize a workflow or select a script."}
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button onClick={() => navigate("/projects")} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all">
          <FolderKanban size={16} /> {isZh ? "前往项目库" : "Projects Library"}
        </button>
        <button onClick={() => navigate("/scripts")} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)]">
          <FileText size={16} /> {isZh ? "去剧本任务页选择" : "Select Script Task"}
        </button>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all">
          <Sparkles size={16} /> {type === "project" ? isZh ? "返回枢纽新建" : "New Workflow" : isZh ? "返回枢纽" : "Go to Hub"}
        </button>
      </div>
    </div>
  );
}
