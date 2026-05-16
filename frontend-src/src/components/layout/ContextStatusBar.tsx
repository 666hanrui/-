import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { FolderKanban, Info, Copy } from 'lucide-react';

export default function ContextStatusBar() {
  const { currentProjectId, currentTaskId, language, showToast } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isZh = language === 'zh';

  const routeNameMap: Record<string, string> = {
    '/': isZh ? '灵感枢纽' : 'Inspiration Hub',
    '/workflow': isZh ? '工作流演推' : 'Workflow Valley',
    '/scripts': isZh ? '剧本任务库' : 'Script Tasks',
    '/assets': isZh ? '资产矩阵' : 'Assets Forge',
    '/image': isZh ? '图像工作台' : 'Image PromptLab',
    '/video': isZh ? '视频工作台' : 'Video PromptLab',
    '/seedance': isZh ? 'Seedance V5' : 'Seedance',
    '/projects': isZh ? '项目控制台' : 'Project Console',
    '/settings': isZh ? '核心设置' : 'Settings',
  };

  const currentRouteName = routeNameMap[location.pathname] || (isZh ? '工作空间' : 'Workspace');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast({ message: `${label} 已复制`, type: 'success' });
  };

  return (
    <header className="h-[60px] w-full flex items-center justify-between px-6 absolute top-0 left-0 z-40 bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" />
          <span className="text-white/70 text-[10px] font-bold tracking-widest uppercase truncate max-w-[120px]">{currentRouteName}</span>
        </div>

        <div className="flex items-center gap-2">
          {currentProjectId ? (
            <div
              title={`完整 PID: ${currentProjectId}\n点击复制`}
              onClick={() => handleCopy(currentProjectId, 'Project ID')}
              className="group cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all text-[10px] font-mono tracking-wider backdrop-blur-sm"
            >
              PID: <span className="truncate max-w-[60px]">{currentProjectId.split('-')[0]}</span>...
              <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </div>
          ) : currentTaskId ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/80 text-[10px] font-mono tracking-wider backdrop-blur-sm">
              <Info size={12} /> <span className="truncate max-w-[80px]">{isZh ? '任务接管' : 'Task Override'}</span>
            </div>
          ) : null}

          {currentTaskId && (
            <div
              title={`完整 TID: ${currentTaskId}\n点击复制`}
              onClick={() => handleCopy(currentTaskId, 'Task ID')}
              className="group cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20 transition-all text-[10px] font-mono tracking-wider backdrop-blur-sm"
            >
              TID: <span className="truncate max-w-[60px]">{currentTaskId.split('-')[0]}</span>...
              <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-auto">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs font-semibold text-white/60 hover:text-white transition-all backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.1)] active:scale-95"
        >
          <FolderKanban size={14} className="text-white/40" /> {isZh ? '项目库' : 'Projects'}
        </button>
      </div>
    </header>
  );
}
