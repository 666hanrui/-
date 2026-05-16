import React from "react";
import { NavLink } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";

const links = [
  ["/", "灵感"],
  ["/workflow", "工作流"],
  ["/scripts", "剧本"],
  ["/assets", "资产"],
  ["/image", "图像"],
  ["/video", "视频"],
  ["/seedance", "SD"],
  ["/projects", "项目"],
  ["/settings", "设置"],
];

export default function GlobalSidebar() {
  const { user } = useAppStore();
  return (
    <aside className="relative z-50 h-full w-24 flex flex-col items-center py-6 border-r border-white/[0.05] bg-black/40 backdrop-blur-3xl overflow-y-auto custom-scrollbar flex-shrink-0">
      <div className="mb-6 w-12 h-12 rounded-2xl bg-indigo-500/10 border border-white/10 flex items-center justify-center text-indigo-200 font-black">栈</div>
      <nav className="flex flex-col gap-2 w-full px-3">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} title={label} className={({ isActive }) => `w-full py-2 rounded-xl text-center text-xs transition-all ${isActive ? "bg-white/10 text-white border border-white/10" : "text-white/40 hover:text-white hover:bg-white/[0.04]"}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-indigo-200 text-sm font-medium">
        {user ? user.username.charAt(0).toUpperCase() : "U"}
      </div>
    </aside>
  );
}
