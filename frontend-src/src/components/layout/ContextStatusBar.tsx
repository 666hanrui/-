import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { FolderKanban } from 'lucide-react';

export default function ContextStatusBar() {
  const { language, themeMode } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isZh = language === 'zh';
  const isLight = themeMode === 'light';

  const routeNameMap: Record<string, string> = {
    '/': isZh ? '灵感枢纽' : 'Inspiration Hub',
    '/workflow': isZh ? '工作流演推' : 'Workflow Valley',
    '/scripts': isZh ? '剧本任务库' : 'Script Tasks',
    '/assets': isZh ? '资产矩阵' : 'Assets Forge',
    '/image': isZh ? '图像工作台' : 'Image PromptLab',
    '/video': isZh ? '视频工作台' : 'Video PromptLab',
    '/frame-prompt': isZh ? '逐镜提示词' : 'Frame PromptLab',
    '/seedance': isZh ? 'Seedance V5' : 'Seedance',
    '/projects': isZh ? '项目控制台' : 'Project Console',
    '/settings': isZh ? '核心设置' : 'Settings',
  };

  const currentRouteName = routeNameMap[location.pathname] || (isZh ? '工作空间' : 'Workspace');

  return (
    <header className={`h-14 w-full flex items-center justify-between px-5 absolute top-0 left-0 z-40 border-b backdrop-blur-xl pointer-events-none ${
      isLight ? 'bg-white/42 border-slate-900/10' : 'bg-[#050505]/82 border-white/[0.06]'
    }`}>
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border shadow-[0_2px_10px_rgba(0,0,0,0.08)] ${
          isLight ? 'bg-white/62 border-slate-900/10' : 'bg-white/[0.04] border-white/[0.07]'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" />
          <span className="text-white/70 text-[10px] font-bold tracking-widest uppercase truncate max-w-[120px]">{currentRouteName}</span>
        </div>
      </div>

      <div className="pointer-events-auto">
        <button
          onClick={() => navigate('/projects')}
          className={`flex items-center gap-2 px-4 py-1.5 border rounded-lg text-xs font-semibold transition-all backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.08)] active:scale-95 ${
            isLight ? 'bg-white/62 hover:bg-white/80 border-slate-900/10 text-slate-700 hover:text-slate-950' : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white/60 hover:text-white'
          }`}
        >
          <FolderKanban size={14} className="text-white/40" /> {isZh ? '项目库' : 'Projects'}
        </button>
      </div>
    </header>
  );
}
