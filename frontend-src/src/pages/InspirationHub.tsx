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
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("2分钟");
  const [format, setFormat] = useState("short_drama");
  const [ultrashortMode, setUltrashortMode] = useState("vertical_short");
  const [genresText, setGenresText] = useState("短剧, 悬念, 反转");
  const [chinese, setChinese] = useState(true);
  const [master, setMaster] = useState("");
  const [importedScript, setImportedScript] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    setRealm("cloudcity");
    setTimeout(() => textareaRef.current?.focus(), 500);
  }, [setRealm]);

  const handleIgnite = async () => {
    if (!localSeed.trim() && !importedScript.trim()) return;
    const concept = localSeed.trim() || importedScript.slice(0, 300);
    const init = {
      name: name.trim() || concept.slice(0, 30),
      concept,
      duration,
      format,
      ultrashortMode,
      genres: genresText.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
      chinese,
      master: master.trim() || undefined,
      importedScript: importedScript.trim() || undefined,
      path: importedScript.trim() ? "import" : "new",
    };

    try {
      const project = await invoke<{ projectId?: string; project_id?: string }>("project/create", init);
      const projectId = project.projectId || project.project_id || "";
      setCurrentProjectId(projectId);
      setScriptSeed(concept);

      await controls.start({ scale: 0.9, opacity: 0, filter: "blur(20px)", transition: { duration: 0.6, ease: "easeInOut" } });
      navigate("/workflow");
    } catch (err: any) {
      alert(`创世引擎点火失败: ${err.message}`);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      <motion.div animate={controls} className="w-full max-w-5xl mx-auto flex flex-col items-center relative z-10 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tighter">
            定义你的<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300 ml-2 italic font-serif">宇宙参数</span>
          </h1>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full relative group">
          <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500/50 via-cyan-500/50 to-indigo-500/50 rounded-3xl blur-2xl transition-all duration-700 ${isFocused ? "opacity-40 scale-105" : "opacity-10 scale-100"}`} />
          <div className={`relative w-full bg-black/40 backdrop-blur-2xl border transition-colors duration-500 rounded-3xl p-5 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${isFocused ? "border-white/20" : "border-white/5"}`}>
            <div className="grid two mb-4">
              <label className="field"><span className="label">项目名称</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="可选，不填则自动从概念生成" /></label>
              <label className="field"><span className="label">时长</span><input className="input" value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
              <label className="field"><span className="label">格式</span><input className="input" value={format} onChange={(e) => setFormat(e.target.value)} /></label>
              <label className="field"><span className="label">短片模式</span><input className="input" value={ultrashortMode} onChange={(e) => setUltrashortMode(e.target.value)} /></label>
              <label className="field"><span className="label">题材 genres</span><input className="input" value={genresText} onChange={(e) => setGenresText(e.target.value)} /></label>
              <label className="field"><span className="label">大师模板 master</span><input className="input" value={master} onChange={(e) => setMaster(e.target.value)} placeholder="可选" /></label>
            </div>
            <label className="field mb-4">
              <span className="label">核心概念</span>
              <textarea ref={textareaRef} value={localSeed} onChange={(e) => setLocalSeed(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleIgnite(); }} placeholder="例如：一个在赛博朋克废墟中寻找旧时代黑胶唱片的失明武士..." className="textarea script-input" />
            </label>
            <label className="field mb-4">
              <span className="label">导入已有剧本 importedScript</span>
              <textarea value={importedScript} onChange={(e) => setImportedScript(e.target.value)} placeholder="可选：粘贴已有剧本，项目会以 import 路径启动。" className="textarea script-input" />
            </label>
            <label className="flex items-center gap-3 text-white/60 text-sm mb-4">
              <input type="checkbox" checked={chinese} onChange={(e) => setChinese(e.target.checked)} />
              中文叙事 chinese
            </label>
            <div className="flex items-center justify-between px-2 py-3 border-t border-white/5 mt-2">
              <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-white/30 font-mono tracking-widest bg-white/5 px-2 py-1 rounded"><span>⌘</span>/<span>Ctrl</span> + <span>Enter</span> 发射</kbd>
              <button onClick={handleIgnite} disabled={(!localSeed.trim() && !importedScript.trim()) || isLoading} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${(localSeed.trim() || importedScript.trim()) && !isLoading ? "bg-white text-black hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]" : "bg-white/5 text-white/20 cursor-not-allowed"}`}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : "开始推演"}
                {!isLoading && ((localSeed.trim() || importedScript.trim()) ? <CornerDownLeft size={16} /> : <Wand2 size={16} />)}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}