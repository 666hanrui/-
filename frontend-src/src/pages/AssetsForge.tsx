import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { useTudouBridge } from "../hooks/useTudouBridge";
import {
  Users,
  Map,
  Box,
  Wand2,
  Image as ImageIcon,
  Film,
  Save,
  Fingerprint,
  Loader2,
} from "lucide-react";

type AssetTab = "roles" | "scenes" | "props";

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export default function AssetsForge() {
  const { setRealm, currentTaskId } = useAppStore();
  const { invoke } = useTudouBridge();

  const [activeTab, setActiveTab] = useState<AssetTab>("roles");
  const [assets, setAssets] = useState<any>({
    roles: [],
    scenes: [],
    props: [],
  });
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isForging, setIsForging] = useState(false);

  useEffect(() => {
    setRealm("samurai");
    fetchAssets();
  }, [setRealm]);

  const fetchAssets = async () => {
    if (!currentTaskId) return;
    try {
      const res = await invoke<any[]>(
        "asset/get-all",
        { taskId: currentTaskId },
        { silent: true }
      );
      if (Array.isArray(res)) {
        const grouped: any = { roles: [], scenes: [], props: [] };
        res.forEach((item) => {
          const data =
            typeof item.assetDataJson === "string"
              ? JSON.parse(item.assetDataJson)
              : item.assetDataJson || {};
          const assetObj = { id: item.id, ...data };
          if (item.assetType === "character" || item.assetType === "role")
            grouped.roles.push(assetObj);
          else if (item.assetType === "scene") grouped.scenes.push(assetObj);
          else if (item.assetType === "prop") grouped.props.push(assetObj);
        });
        setAssets(grouped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExtract = async () => {
    if (!currentTaskId) return alert("缺少 Task ID");
    setIsExtracting(true);
    try {
      await invoke("asset/extract", { taskId: currentTaskId });
      await fetchAssets();
    } catch (err) {
      console.warn("提取完成");
    } finally {
      setTimeout(() => setIsExtracting(false), 1500);
    }
  };

  const handleForgePrompt = async (type: "image" | "video") => {
    if (!selectedAsset) return;
    setIsForging(true);
    setPromptDraft("");
    try {
      const res = await invoke(`prompt/${type}`, {
        assetId: selectedAsset.id,
      });
      setPromptDraft(
        res.prompt ||
          `(masterpiece, highly detailed), ${selectedAsset.name}, ${selectedAsset.desc}`
      );
    } catch (err) {
      setPromptDraft(`[ERROR] 锻造失败: ${err}`);
    } finally {
      setTimeout(() => setIsForging(false), 800);
    }
  };

  return (
    <div className="w-full h-full flex overflow-hidden p-6 gap-6 relative z-10">
      <div className="w-[45%] h-full flex flex-col bg-[#050505]/60 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-widest">
              ASSET_MATRIX
            </h2>
            <p className="text-[10px] text-white/30 font-mono mt-1 uppercase">
              Entity Extraction Engine
            </p>
          </div>
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all disabled:opacity-50 border border-white/10"
          >
            {isExtracting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Fingerprint size={16} />
            )}
            {isExtracting ? "深度扫描中..." : "启动剧本扫描"}
          </button>
        </div>
        <div className="flex px-6 py-4 border-b border-white/[0.02] gap-6">
          <Tab
            active={activeTab === "roles"}
            onClick={() => setActiveTab("roles")}
            icon={<Users size={16} />}
            label="ROLES"
          />
          <Tab
            active={activeTab === "scenes"}
            onClick={() => setActiveTab("scenes")}
            icon={<Map size={16} />}
            label="SCENES"
          />
          <Tab
            active={activeTab === "props"}
            onClick={() => setActiveTab("props")}
            icon={<Box size={16} />}
            label="PROPS"
          />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-4"
          >
            {assets[activeTab]?.map((item: any) => {
              const isSelected = selectedAsset?.id === item.id;
              return (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  onClick={() => setSelectedAsset(item)}
                  className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-500 overflow-hidden group ${
                    isSelected
                      ? "bg-indigo-900/40 border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]"
                      : "bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08]"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  )}
                  <div className="relative z-10">
                    <h3
                      className={`text-lg font-bold mb-2 transition-colors ${
                        isSelected ? "text-indigo-100" : "text-white"
                      }`}
                    >
                      {item.name}
                    </h3>
                    <p className="text-white/50 text-sm leading-relaxed line-clamp-2 font-serif">
                      {item.desc}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-white/20 uppercase">
                      <span>ID: ASSET-{item.id}</span>
                      {isSelected && (
                        <span className="text-indigo-400 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />{" "}
                          ENGAGED
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <div className="w-[55%] h-full bg-[#050505]/60 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent pointer-events-none" />
        {!selectedAsset ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <div className="w-24 h-24 mb-6 rounded-3xl border border-white/10 flex items-center justify-center bg-white/5 shadow-inner">
              <Wand2 size={40} className="opacity-50" />
            </div>
            <p className="tracking-widest uppercase font-mono text-sm">
              Awaiting Asset Selection
            </p>
          </div>
        ) : (
          <motion.div
            key={selectedAsset.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col p-8"
          >
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-white mb-4 tracking-wide drop-shadow-md">
                {selectedAsset.name}
              </h3>
              <p className="text-white/60 text-lg leading-relaxed font-serif bg-white/5 p-4 rounded-xl border border-white/5">
                {selectedAsset.desc}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleForgePrompt("image")}
                disabled={isForging}
                className="relative overflow-hidden group flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-b from-purple-900/50 to-pink-900/50 border border-pink-500/30 hover:border-pink-400/80 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <ImageIcon size={20} className="text-pink-300" />
                <span className="text-pink-100 font-bold tracking-widest text-sm">
                  视觉咏唱 (IMAGE)
                </span>
              </button>
              <button
                onClick={() => handleForgePrompt("video")}
                disabled={isForging}
                className="relative overflow-hidden group flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-b from-blue-900/50 to-cyan-900/50 border border-cyan-500/30 hover:border-cyan-400/80 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Film size={20} className="text-cyan-300" />
                <span className="text-cyan-100 font-bold tracking-widest text-sm">
                  动态推演 (VIDEO)
                </span>
              </button>
            </div>
            <div className="flex-1 relative group flex flex-col">
              <div
                className={`absolute -inset-1 rounded-2xl blur-xl transition-all duration-700 pointer-events-none ${
                  isForging ? "bg-indigo-500/40 animate-pulse" : "bg-transparent"
                }`}
              />
              <div className="relative flex-1 bg-[#020202] border border-white/10 rounded-2xl p-5 flex flex-col shadow-inner overflow-hidden">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/[0.05]">
                  <span className="text-indigo-400/70 text-xs font-mono tracking-widest flex items-center gap-2">
                    <TerminalIcon isGenerating={isForging} /> PROMPT_TERMINAL
                  </span>
                  {promptDraft && !isForging && (
                    <button className="text-white/40 hover:text-white flex items-center gap-1 transition-colors text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                      <Save size={14} /> 保存预设
                    </button>
                  )}
                </div>
                {isForging ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 gap-4">
                    <Loader2 size={32} className="animate-spin opacity-50" />
                    <span className="text-xs font-mono uppercase tracking-[0.3em] opacity-70">
                      Synthesizing Vector Data...
                    </span>
                  </div>
                ) : (
                  <textarea
                    value={promptDraft}
                    onChange={(e) => setPromptDraft(e.target.value)}
                    placeholder="等待引擎铸造指令..."
                    className="flex-1 w-full bg-transparent text-green-400/90 placeholder-white/10 resize-none focus:outline-none font-mono text-sm leading-relaxed custom-scrollbar selection:bg-green-900/50"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Tab({ active, onClick, icon, label }: any) {
  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <div
        className={`flex items-center gap-2 px-2 py-1 text-sm font-mono tracking-widest transition-colors ${
          active ? "text-white" : "text-white/40 hover:text-white/70"
        }`}
      >
        {icon} {label}
      </div>
      {active && (
        <motion.div
          layoutId="assetTabIndicator"
          className="absolute -bottom-4 left-0 right-0 h-[2px] bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
        />
      )}
    </div>
  );
}

function TerminalIcon({ isGenerating }: { isGenerating: boolean }) {
  return (
    <div className="flex gap-1">
      <div className="w-2 h-2 rounded-full bg-red-500/50" />
      <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
      <div
        className={`w-2 h-2 rounded-full ${
          isGenerating ? "bg-green-400 animate-ping" : "bg-green-500/50"
        }`}
      />
    </div>
  );
}
