import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useAnimation } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { Wand2, CornerDownLeft, Loader2 } from "lucide-react";

export default function InspirationHub() {
  const { setRealm, setScriptSeed, setCurrentProjectId } = useAppStore();
  const { invoke, isLoading } = useTudouBridge();
  const navigate = useNavigate();

  const [localSeed, setLocalSeed] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    setRealm("cloudcity");
    setTimeout(() => textareaRef.current?.focus(), 500);
  }, [setRealm]);

  const handleIgnite = async () => {
    if (!localSeed.trim()) return;
    try {
      const project = await invoke<{ projectId: string }>("project/create", {
        concept: localSeed,
      });
      setCurrentProjectId(project.projectId);
      setScriptSeed(localSeed);

      await controls.start({
        scale: 0.9,
        opacity: 0,
        filter: "blur(20px)",
        transition: { duration: 0.6, ease: "easeInOut" },
      });
      navigate("/workflow");
    } catch (err: any) {
      alert(`创世引擎点火失败: ${err.message}`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-8">
      <motion.div
        animate={controls}
        className="w-full max-w-3xl flex flex-col items-center relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tighter">
            定义你的
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300 ml-2 italic font-serif">
              宇宙参数
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full relative group"
        >
          <div
            className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/50 via-cyan-500/50 to-indigo-500/50 rounded-3xl blur-2xl transition-all duration-700 ${
              isFocused ? "opacity-40 scale-105" : "opacity-10 scale-100"
            }`}
          />
          <div
            className={`relative w-full bg-black/40 backdrop-blur-2xl border transition-colors duration-500 rounded-3xl p-3 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${
              isFocused ? "border-white/20" : "border-white/5"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={localSeed}
              onChange={(e) => setLocalSeed(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                  handleIgnite();
              }}
              placeholder="例如：一个在赛博朋克废墟中寻找旧时代黑胶唱片的失明武士..."
              className="w-full bg-transparent text-white/90 placeholder-white/20 p-5 min-h-[160px] text-lg leading-relaxed focus:outline-none resize-none custom-scrollbar font-serif"
            />
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 mt-2">
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-white/30 font-mono tracking-widest bg-white/5 px-2 py-1 rounded">
                <span>⌘</span>/<span>Ctrl</span> + <span>Enter</span> 发射
              </kbd>
              <button
                onClick={handleIgnite}
                disabled={!localSeed.trim() || isLoading}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  localSeed.trim() && !isLoading
                    ? "bg-white text-black hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "开始推演"
                )}
                {!isLoading &&
                  (localSeed.trim() ? (
                    <CornerDownLeft size={16} />
                  ) : (
                    <Wand2 size={16} />
                  ))}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
