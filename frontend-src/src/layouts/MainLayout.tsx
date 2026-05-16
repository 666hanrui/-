import React from "react";
import { Outlet } from "react-router-dom";
import GlobalSidebar from "../components/layout/GlobalSidebar";
import ContextStatusBar from "../components/layout/ContextStatusBar";
import GlobalErrorCard from "../components/layout/GlobalErrorCard";

export default function MainLayout() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050505] text-white flex select-none font-sans">
      <GlobalErrorCard />
      <GlobalSidebar />
      <main className="relative z-10 flex-1 h-full p-4 pl-0">
        <div className="w-full h-full relative overflow-hidden rounded-[2.5rem] bg-white/[0.025] backdrop-blur-[30px] border border-white/[0.06] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col">
          <ContextStatusBar />
          <div className="flex-1 w-full h-full relative z-10 pt-16 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
