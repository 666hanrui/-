import React, { useRef, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import {
  Sparkles,
  Route as RouteIcon,
  Library,
  Settings,
  Command,
} from "lucide-react";

import bgCloudcity from "../../assets/home-bg-cloudcity-D5U4Xepb.jpg";
import bgValley from "../../assets/home-bg-valley-B7cqOehM.jpg";
import bgSamurai from "../../assets/home-bg-samurai-DTWq3wRp.jpg";

const bgMap = {
  cloudcity: bgCloudcity,
  valley: bgValley,
  samurai: bgSamurai,
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20, filter: "blur(10px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { type: "spring", damping: 20 },
  },
};

export default function MainLayout() {
  const { currentRealm, user } = useAppStore();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!navRef.current) return;
    const rect = navRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505] text-white flex select-none font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRealm}
          initial={{
            opacity: 0,
            scale: 1.1,
            filter: "saturate(0%) blur(20px)",
          }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: "saturate(100%) blur(0px)",
          }}
          exit={{
            opacity: 0,
            scale: 0.95,
            filter: "saturate(0%) blur(20px)",
          }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60 mix-blend-screen"
          style={{ backgroundImage: `url(${bgMap[currentRealm]})` }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-soft-light pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#050505]/80 to-[#050505] pointer-events-none" />

      <motion.aside
        ref={navRef}
        onMouseMove={handleMouseMove}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-50 h-full w-24 flex flex-col items-center py-8 border-r border-white/[0.05] bg-black/20 backdrop-blur-3xl overflow-hidden"
      >
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,255,255,0.06), transparent 40%)`,
          }}
        />

        <motion.div
          variants={itemVariants}
          className="mb-10 w-12 h-12 rounded-[18px] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
        >
          <Command className="text-white" size={20} />
        </motion.div>

        <nav className="flex flex-col gap-3 relative z-10 w-full px-4">
          <NavItem icon={<Sparkles size={20} />} path="/" currentPath={location.pathname} tooltip="枢纽" variants={itemVariants} />
          <NavItem icon={<RouteIcon size={20} />} path="/workflow" currentPath={location.pathname} tooltip="山谷" variants={itemVariants} />
          <NavItem icon={<Library size={20} />} path="/assets" currentPath={location.pathname} tooltip="锻造" variants={itemVariants} />
          <motion.div variants={itemVariants} className="w-8 h-[1px] bg-white/[0.08] my-3 mx-auto" />
          <NavItem icon={<Settings size={20} />} path="/settings" currentPath={location.pathname} tooltip="系统" variants={itemVariants} />
        </nav>

        <motion.div
          variants={itemVariants}
          className="mt-auto relative group cursor-pointer"
        >
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-20 group-hover:opacity-60 transition-opacity duration-500" />
          <div className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md transition-transform duration-300 hover:scale-105">
            <span className="text-indigo-200 text-sm font-medium tracking-widest drop-shadow-md">
              {user ? user.username.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
        </motion.div>
      </motion.aside>

      <main className="relative z-10 flex-1 h-full p-4 pl-0">
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full relative overflow-hidden rounded-[2.5rem] bg-white/[0.015] backdrop-blur-[40px] border border-white/[0.06] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col"
        >
          <header className="h-16 w-full flex items-center justify-between px-8 absolute top-0 left-0 z-20 pointer-events-none">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
                <span className="text-white/40 text-[10px] font-mono tracking-widest uppercase">
                  Engine Online
                </span>
              </div>
              <div className="text-white/20 text-xs tracking-widest font-mono uppercase">
                Realm // {currentRealm}
              </div>
            </div>
          </header>
          <div className="flex-1 w-full h-full relative z-10 pt-16">
            <Outlet />
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function NavItem({ icon, path, currentPath, tooltip, variants }: any) {
  const navigate = useNavigate();
  const isActive =
    currentPath === path || (path !== "/" && currentPath.startsWith(path));
  return (
    <motion.div
      variants={variants}
      className="relative group w-full flex justify-center"
    >
      {isActive && (
        <motion.div
          layoutId="navGlow"
          className="absolute inset-0 bg-white/10 rounded-xl border border-white/10"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <button
        onClick={() => navigate(path)}
        className={`relative z-10 w-full py-3 flex justify-center rounded-xl transition-all duration-300 ${
          isActive
            ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            : "text-white/30 hover:text-white/70 hover:bg-white/[0.03]"
        }`}
      >
        {icon}
      </button>
      <div className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#111] border border-white/10 text-white/90 text-xs tracking-widest rounded-lg opacity-0 translate-x-[-8px] pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 shadow-2xl z-50">
        {tooltip}
      </div>
    </motion.div>
  );
}
