import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

const routeNames: Record<string, string> = {
  "/": "灵感枢纽",
  "/workflow": "工作流",
  "/scripts": "剧本任务",
  "/assets": "资产矩阵",
  "/image": "图像提示词",
  "/video": "视频提示词",
  "/seedance": "Seedance",
  "/projects": "项目库",
  "/settings": "设置",
};

function shortId(id: string | null) {
  if (!id) return "未绑定";
  return `${id.slice(0, 8)}...`;
}

export default function ContextStatusBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProjectId, currentTaskId } = useAppStore();
  const routeName = routeNames[location.pathname] || "工作空间";

  return (
    <header className="h-16 w-full flex items-center justify-between px-6 absolute top-0 left-0 z-40 bg-black/50 border-b border-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-3 text-xs">
        <span className="px-3 py-1 rounded-lg bg-white/10 text-white/80">{routeName}</span>
        <span title={currentProjectId || ""} className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-200 border border-indigo-500/20">PID: {shortId(currentProjectId)}</span>
        <span title={currentTaskId || ""} className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-200 border border-cyan-500/20">TID: {shortId(currentTaskId)}</span>
      </div>
      <button onClick={() => navigate("/projects")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-bold">
        <FolderKanban size={14} /> 返回项目库
      </button>
    </header>
  );
}
