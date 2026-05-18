import React from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import GlobalSidebar from '../components/layout/GlobalSidebar';
import ContextStatusBar from '../components/layout/ContextStatusBar';
import GlobalErrorCard from '../components/layout/GlobalErrorCard';

import bgCloudcity from '../../assets/home-bg-cloudcity-D5U4Xepb.jpg';
import bgValley from '../../assets/home-bg-valley-B7cqOehM.jpg';
import bgSamurai from '../../assets/home-bg-samurai-DTWq3wRp.jpg';

const bgMap: Record<string, string> = {
  cloudcity: bgCloudcity,
  valley: bgValley,
  samurai: bgSamurai,
};

export default function MainLayout() {
  const { currentRealm, themeMode, accentColor } = useAppStore();

  const isLight = themeMode === 'light';
  const sceneFilter = isLight
    ? 'saturate(1.12) contrast(1.02) brightness(1.08)'
    : 'saturate(1.16) contrast(1.08) brightness(0.82)';
  const sceneOpacity = isLight ? 0.62 : 0.52;
  const mainSurfaceClass = isLight
    ? 'border-slate-900/10 bg-white/[0.46] text-slate-950 shadow-[inset_1px_0_0_rgba(255,255,255,0.42)]'
    : 'border-white/[0.05] bg-[#050505]/54 text-white shadow-[inset_1px_0_0_rgba(255,255,255,0.02)]';

  return (
    <div
      data-theme={themeMode}
      className={`scriptstack-root relative w-screen h-screen overflow-hidden bg-[var(--bg-primary)] flex font-sans ${isLight ? 'light text-slate-950' : 'text-white'}`}
      style={{ '--accent': accentColor } as React.CSSProperties}
    >

      <AnimatePresence mode="wait">
        <motion.div
          key={currentRealm}
          initial={{ opacity: 0, scale: 1.08, filter: `${sceneFilter} blur(18px)` }}
          animate={{ opacity: sceneOpacity, scale: 1, filter: `${sceneFilter} blur(0px)` }}
          exit={{ opacity: 0, scale: 0.98, filter: `${sceneFilter} blur(18px)` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="scriptstack-scene absolute -inset-[3%] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgMap[currentRealm]})` }}
        />
      </AnimatePresence>
      <div
        className={`absolute inset-0 pointer-events-none ${
          isLight
            ? 'bg-[linear-gradient(135deg,rgba(255,255,255,0.58),rgba(245,247,255,0.34)_44%,rgba(255,255,255,0.52))]'
            : 'bg-[linear-gradient(135deg,rgba(0,0,0,0.54),rgba(0,0,0,0.24)_46%,rgba(0,0,0,0.58))]'
        }`}
      />
      <div
        className={`scriptstack-ambient absolute inset-0 pointer-events-none ${
          isLight
            ? 'opacity-70 mix-blend-soft-light'
            : 'opacity-90 mix-blend-screen'
        }`}
        style={{
          background: `linear-gradient(115deg, transparent 0%, ${accentColor}24 28%, transparent 50%, ${accentColor}18 72%, transparent 100%)`,
        }}
      />
      <div
        className={`absolute inset-0 pointer-events-none ${
          isLight
            ? 'bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.48),transparent_46%),radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.16),transparent_52%)]'
            : 'bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.24),transparent_48%),radial-gradient(ellipse_at_bottom_left,_rgba(34,211,238,0.10),transparent_52%)]'
        }`}
      />
      <div className="scriptstack-grain absolute inset-0 pointer-events-none opacity-[0.075]" />

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className={`scriptstack-breath absolute inset-[-12%] ${isLight ? 'opacity-35 mix-blend-multiply' : 'opacity-45 mix-blend-screen'}`}
          style={{
            background: `linear-gradient(135deg, transparent 10%, ${accentColor}18 36%, transparent 62%, ${accentColor}12 88%)`,
          }}
        />
        <div
          className={`scriptstack-breath-reverse absolute inset-[-10%] ${isLight ? 'opacity-25 mix-blend-multiply' : 'opacity-30 mix-blend-screen'}`}
          style={{
            background: `linear-gradient(35deg, ${accentColor}10 0%, transparent 34%, rgba(34,211,238,0.12) 62%, transparent 100%)`,
          }}
        />
      </div>

      <GlobalErrorCard />
      <GlobalSidebar />

      <main className={`relative z-10 flex-1 h-full min-w-0 overflow-hidden border-l backdrop-blur-xl ${mainSurfaceClass}`}>
        <ContextStatusBar />
        <div className="absolute inset-0 z-10 pt-14">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
