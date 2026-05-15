import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import StepEngine from "../components/workflow/StepEngine";
import AiDoctorPanel from "../components/workflow/AiDoctorPanel";
import {
  CheckCircle2,
  Circle,
  Activity,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const WORKFLOW_STEPS = [
  { id: 1, title: "概念与动机", desc: "确立故事内核" },
  { id: 2, title: "故事大纲", desc: "三幕结构骨架" },
  { id: 3, title: "角色图谱", desc: "核心人物档案" },
  { id: 4, title: "世界观构建", desc: "规则与环境设定" },
  { id: 5, title: "分场事件", desc: "场景节拍表" },
  { id: 6, title: "对白精修", desc: "角色声音区分" },
  { id: 7, title: "情绪曲线检查", desc: "张力与节奏" },
  { id: 8, title: "终稿格式化", desc: "好莱坞标准排版" },
];

export default function WorkflowValley() {
  const {
    setRealm,
    currentStep,
    setCurrentStep,
    scriptSeed,
    isDoctorPanelOpen,
    setDoctorPanelOpen,
  } = useAppStore();
  const navigate = useNavigate();
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    setRealm("valley");
  }, [setRealm]);

  if (!scriptSeed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 backdrop-blur-md">
        <Wand2 size={48} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">
          引擎缺少初始参数
        </h2>
        <p className="text-white/50 mb-6 text-sm">
          请返回灵感枢纽输入宇宙碎片
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
        >
          返回枢纽
        </button>
      </div>
    );
  }

  const handleStepChange = (newStep: number) => {
    setDirection(newStep > currentStep ? 1 : -1);
    setCurrentStep(newStep);
  };

  return (
    <div className="w-full h-full flex relative overflow-hidden">
      <div className="w-72 h-full flex flex-col p-6 relative z-10 border-r border-white/5 bg-black/20 backdrop-blur-xl shadow-[20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="mb-10 px-2">
          <h2 className="text-xs tracking-[0.2em] font-mono text-white/40 uppercase mb-2">
            Workflow Sequence
          </h2>
          <div className="w-full h-[1px] bg-gradient-to-r from-indigo-500/50 to-transparent" />
        </div>
        <div className="flex-1 flex flex-col gap-6 relative px-2 custom-scrollbar overflow-y-auto">
          <div className="absolute left-[17px] top-4 bottom-8 w-[1px] bg-white/5 z-0" />
          <motion.div
            className="absolute left-[17px] top-4 w-[2px] bg-indigo-500 z-0 shadow-[0_0_10px_rgba(99,102,241,0.8)]"
            animate={{
              height: `${
                (currentStep / (WORKFLOW_STEPS.length - 1)) * 100
              }%`,
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = currentStep > index;
            return (
              <div
                key={step.id}
                onClick={() => handleStepChange(index)}
                className={`relative z-10 flex items-start gap-4 cursor-pointer group ${
                  isActive
                    ? "opacity-100"
                    : "opacity-40 hover:opacity-80 transition-opacity"
                }`}
              >
                <div className="mt-1 relative bg-[#050505] rounded-full">
                  {isActive && (
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-md opacity-60 animate-pulse" />
                  )}
                  {isCompleted ? (
                    <CheckCircle2
                      size={20}
                      className="text-indigo-400 relative z-10"
                    />
                  ) : (
                    <Circle
                      size={20}
                      className={`relative z-10 ${
                        isActive
                          ? "text-indigo-400 fill-indigo-500/20"
                          : "text-white/30"
                      }`}
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`text-sm tracking-widest transition-all duration-300 ${
                      isActive
                        ? "font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-105 origin-left"
                        : "font-medium text-white/70"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono mt-1">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => setDoctorPanelOpen(!isDoctorPanelOpen)}
          className="mt-6 w-full flex items-center justify-between p-4 rounded-2xl bg-cyan-900/20 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-500/40 transition-all group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
          <div className="flex items-center gap-3 relative z-10">
            <Activity size={18} className="group-hover:animate-pulse" />
            <span className="text-sm font-bold tracking-widest">
              剧本诊断 HUD
            </span>
          </div>
          <ChevronRight
            size={16}
            className="text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all relative z-10"
          />
        </button>
      </div>

      <div className="flex-1 h-full relative p-6 overflow-hidden flex flex-col perspective-1000">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-6 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md flex items-center gap-3 max-w-2xl w-max shadow-2xl">
          <Wand2 size={14} className="text-indigo-400" />
          <span className="text-xs text-white/50 font-mono truncate">
            GENESIS SEED:
          </span>
          <span className="text-sm text-white/90 truncate max-w-md italic">
            {scriptSeed}
          </span>
        </div>
        <div className="flex-1 w-full h-full relative mt-14">
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={{
                enter: (dir: number) => ({
                  opacity: 0,
                  y: dir > 0 ? 60 : -60,
                  scale: 0.98,
                  filter: "blur(10px)",
                }),
                center: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                },
                exit: (dir: number) => ({
                  opacity: 0,
                  y: dir > 0 ? -60 : 60,
                  scale: 0.98,
                  filter: "blur(10px)",
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="absolute inset-0 w-full h-full"
            >
              <StepEngine
                stepConfig={WORKFLOW_STEPS[currentStep]}
                isLastStep={currentStep === WORKFLOW_STEPS.length - 1}
                onNext={() => handleStepChange(currentStep + 1)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <AiDoctorPanel />
    </div>
  );
}
