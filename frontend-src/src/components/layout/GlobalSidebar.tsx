import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, Route as RouteIcon, FileText, Library, Image as ImageIcon, Film, Layers3, Clapperboard, FolderKanban, Settings, Command, User as UserIcon, LogOut } from 'lucide-react';
import { useTudouBridge } from '../../hooks/useTudouBridge';

export default function GlobalSidebar() {
  const { user, setUser, language, themeMode } = useAppStore();
  const { invoke } = useTudouBridge();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isZh = language === 'zh';
  const isLight = themeMode === 'light';

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleLogout = async () => {
    await invoke('auth/set-token', { token: '', refreshToken: '' }, { silent: true, hideGlobalError: true }).catch(() => undefined);
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
    window.location.reload();
  };

  return (
    <motion.aside
      ref={navRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`relative z-50 h-full w-[76px] flex flex-col items-center py-4 border-r backdrop-blur-xl overflow-visible flex-shrink-0 ${
        isLight
          ? 'border-slate-900/10 bg-white/42 shadow-[inset_-1px_0_0_rgba(255,255,255,0.48)]'
          : 'border-white/[0.06] bg-[#050505]/88 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)]'
      }`}
    >
      <div className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 hover:opacity-100" style={{ background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, ${isLight ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)'}, transparent 40%)` }} />

      <div className="mb-5 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 border border-white/[0.08] flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)]">
        <Command className="text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.6)]" size={20} />
      </div>

      <nav className="flex flex-col gap-1 relative z-10 w-full px-2 mb-4">
        <NavItem icon={<Sparkles size={18} />} path="/" currentPath={location.pathname} tooltip={isZh ? '灵感枢纽' : 'Hub'} isLight={isLight} />
        <NavItem icon={<RouteIcon size={18} />} path="/workflow" currentPath={location.pathname} tooltip={isZh ? '工作流' : 'Workflow'} isLight={isLight} />
        <NavItem icon={<FileText size={18} />} path="/scripts" currentPath={location.pathname} tooltip={isZh ? '剧本任务' : 'Scripts'} isLight={isLight} />
        <NavItem icon={<Library size={18} />} path="/assets" currentPath={location.pathname} tooltip={isZh ? '资产矩阵' : 'Assets'} isLight={isLight} />

        <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent my-1 mx-auto" />

        <NavItem icon={<ImageIcon size={18} />} path="/image" currentPath={location.pathname} tooltip={isZh ? '图像提示词' : 'Image Prompt'} isLight={isLight} />
        <NavItem icon={<Film size={18} />} path="/video" currentPath={location.pathname} tooltip={isZh ? '视频提示词' : 'Video Prompt'} isLight={isLight} />
        <NavItem icon={<Layers3 size={18} />} path="/frame-prompt" currentPath={location.pathname} tooltip={isZh ? '逐镜提示词' : 'Frame Prompt'} isLight={isLight} />
        <NavItem icon={<Clapperboard size={18} />} path="/seedance" currentPath={location.pathname} tooltip="Seedance" isLight={isLight} />

        <div className="w-6 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent my-1 mx-auto" />

        <NavItem icon={<FolderKanban size={18} />} path="/projects" currentPath={location.pathname} tooltip={isZh ? '项目库' : 'Projects'} isLight={isLight} />
        <NavItem icon={<Settings size={18} />} path="/settings" currentPath={location.pathname} tooltip={isZh ? '设置' : 'Settings'} isLight={isLight} />
      </nav>

      <div className="mt-auto relative cursor-pointer pt-2 group" onClick={() => setIsMenuOpen(!isMenuOpen)}>
        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-60 transition-opacity duration-500 mt-2" />
        <div className="relative w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center backdrop-blur-md transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-400/30 group-hover:bg-indigo-500/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          <span className="text-indigo-200 text-sm font-medium tracking-widest drop-shadow-md">
            {user ? user.username.charAt(0).toUpperCase() : 'U'}
          </span>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 10, y: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 10, y: 10 }}
              className="absolute bottom-[110%] left-full mb-1 w-44 bg-[#0d0d0d]/95 backdrop-blur-3xl border border-white/[0.08] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col p-1.5 z-50 origin-bottom-left"
            >
              <button className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.06] rounded-xl text-white/80 text-xs font-medium transition-colors text-left group/btn">
                <UserIcon size={14} className="text-white/40 group-hover/btn:text-white/80 transition-colors" /> {isZh ? '个人中心' : 'Profile'}
              </button>
              <div className="w-full h-px bg-white/[0.04] my-1" />
              <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-rose-500/10 text-rose-400 rounded-xl text-xs font-medium transition-colors text-left group/btn">
                <LogOut size={14} className="text-rose-500/50 group-hover/btn:text-rose-400 transition-colors" /> {isZh ? '退出登录' : 'Logout'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

function NavItem({ icon, path, currentPath, tooltip, isLight }: { icon: React.ReactNode; path: string; currentPath: string; tooltip: string; isLight: boolean }) {
  const navigate = useNavigate();
  const isActive = currentPath === path || (path !== '/' && currentPath.startsWith(path));
  return (
    <div className="relative group w-full flex justify-center">
      {isActive && (
        <motion.div
          layoutId="navGlow"
          className={`absolute inset-0 rounded-[14px] border shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ${
            isLight ? 'bg-indigo-500/10 border-indigo-500/25' : 'bg-gradient-to-br from-indigo-500/10 to-transparent border-indigo-500/20'
          }`}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
        />
      )}
      <button
        onClick={() => navigate(path)}
        className={`relative z-10 w-full h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
          isActive
            ? 'text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.4)]'
            : isLight ? 'text-slate-700/55 hover:text-slate-950 hover:bg-slate-900/[0.05]' : 'text-white/40 hover:text-white/90 hover:bg-white/[0.04]'
        }`}
      >
        {icon}
      </button>
      <div className={`absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-3 py-1.5 border text-[11px] font-medium tracking-widest rounded-lg opacity-0 translate-x-[-4px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 z-50 whitespace-nowrap ${
        isLight
          ? 'bg-white/92 border-slate-900/10 text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
          : 'bg-[#141414] border-white/[0.08] text-white/90 shadow-[0_10px_20px_rgba(0,0,0,0.4)]'
      }`}>
        {tooltip}
      </div>
    </div>
  );
}
