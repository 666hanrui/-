import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { HardDrive, Cpu, ShieldAlert, CheckCircle2, Link, Key, Loader2, Database, TestTube2 } from "lucide-react";

export default function Settings() {
  const { invoke, isLoading } = useTudouBridge();

  const [config, setConfig] = useState({
    textEndpoint: "",
    textKey: "",
    textModel: "deepseek-reasoner",
    textMode: "openai",
    imageEndpoint: "",
    imageKey: "",
    imageModel: "",
    reviewThreshold: 90,
    enableLocalSave: true,
  });
  const [appVersion, setAppVersion] = useState("");
  const [dbMeta, setDbMeta] = useState<{ dbPath?: string; dataDir?: string }>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [res, version, meta] = await Promise.all([
          invoke<any>("config/get", {}, { silent: true }).catch(() => null),
          invoke<string>("app/version", {}, { silent: true }).catch(() => ""),
          invoke<any>("database/meta", {}, { silent: true }).catch(() => null),
        ]);
        if (res) setConfig((prev) => ({ ...prev, ...res }));
        if (version) setAppVersion(version);
        if (meta) setDbMeta(meta);
      } catch {}
    };
    fetchConfig();
  }, [invoke]);

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleDeploy = async () => {
    try {
      await invoke("config/set", config);
      setIsDirty(false);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    } catch (err) {
      alert("参数覆写失败");
    }
  };

  const testTextConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await invoke("config/test", {
        endpoint: config.textEndpoint,
        key: config.textKey,
        model: config.textModel,
        mode: config.textMode,
      }, { timeout: 30000 });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message || "连接测试失败" });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-8 overflow-y-auto custom-scrollbar relative z-10 pb-32">
      <div className="mb-10">
        <h2 className="text-4xl font-black text-white tracking-tighter mb-2 flex items-center gap-3">
          <Cpu className="text-indigo-500" size={36} /> CORE_SETTINGS
        </h2>
        <div className="text-white/35 font-mono text-xs">version: {appVersion || "unknown"}</div>
      </div>
      <div className="max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[2rem] bg-[#050505]/80 backdrop-blur-3xl border border-white/5 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400"><ShieldAlert size={16} /></div>
            <h3 className="text-lg font-bold text-white tracking-widest">文本模型配置</h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <label className="block text-xs font-bold text-white/70 tracking-widest uppercase">Text Generation (LLM)</label>
              <div className="relative group"><Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input type="text" value={config.textEndpoint} onChange={(e) => updateConfig("textEndpoint", e.target.value)} placeholder="Endpoint URL" className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 pl-9 text-white/90 text-sm focus:outline-none focus:border-rose-500/50 font-mono" /></div>
              <div className="relative group"><Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input type="password" value={config.textKey} onChange={(e) => updateConfig("textKey", e.target.value)} placeholder="Access Key" className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 pl-9 text-white/90 text-sm focus:outline-none focus:border-rose-500/50 font-mono" /></div>
              <div className="flex gap-4">
                <input type="text" value={config.textModel} onChange={(e) => updateConfig("textModel", e.target.value)} placeholder="Model" className="flex-1 bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-rose-500/50 font-mono" />
                <input type="text" value={config.textMode} onChange={(e) => updateConfig("textMode", e.target.value)} placeholder="Mode" className="w-32 bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-rose-500/50 font-mono" />
              </div>
              <button className="btn cyan" onClick={testTextConnection} disabled={isTesting}>{isTesting ? <Loader2 size={16} className="spin" /> : <TestTube2 size={16} />} 测试文本模型连接</button>
              {testResult && <pre className="json-box">{JSON.stringify(testResult, null, 2)}</pre>}
            </div>
            <div className="space-y-3 bg-white/[0.02] p-4 rounded-xl border border-white/5">
              <label className="block text-xs font-bold text-white/70 tracking-widest uppercase">Visual Generation</label>
              <div className="relative group"><Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input type="text" value={config.imageEndpoint} onChange={(e) => updateConfig("imageEndpoint", e.target.value)} placeholder="Endpoint URL" className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 pl-9 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 font-mono" /></div>
              <div className="relative group"><Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" /><input type="password" value={config.imageKey} onChange={(e) => updateConfig("imageKey", e.target.value)} placeholder="Access Key" className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 pl-9 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 font-mono" /></div>
              <input type="text" value={config.imageModel} onChange={(e) => updateConfig("imageModel", e.target.value)} placeholder="Image Model" className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-2.5 text-white/90 text-sm focus:outline-none focus:border-indigo-500/50 font-mono" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-8 rounded-[2rem] bg-[#050505]/80 backdrop-blur-3xl border border-white/5 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400"><HardDrive size={16} /></div>
            <h3 className="text-lg font-bold text-white tracking-widest">本地持久化与诊断</h3>
          </div>
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div className="flex items-center gap-2 text-white font-bold"><Database size={16} /> 数据库路径</div>
            <pre className="json-box mt-3">{JSON.stringify(dbMeta, null, 2)}</pre>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <div><div className="text-white text-sm font-bold tracking-wide">强制实体化保存 (enableLocalSave)</div><div className="text-white/30 text-xs mt-1">触发 SQLite 引擎写入磁盘。</div></div>
            <div onClick={() => updateConfig("enableLocalSave", !config.enableLocalSave)} className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${config.enableLocalSave ? "bg-cyan-500" : "bg-white/10"}`}>
              <motion.div layout className="w-6 h-6 bg-white rounded-full shadow-sm" animate={{ x: config.enableLocalSave ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </div>
          </div>
          <label className="field"><span className="label">审核阈值 reviewThreshold</span><input className="input" type="number" value={config.reviewThreshold} onChange={(e) => updateConfig("reviewThreshold", Number(e.target.value))} /></label>
        </motion.div>
      </div>

      <AnimatePresence>
        {(isDirty || savedStatus) && <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center p-2 pl-6 bg-[#111]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.8)]"><span className="text-sm font-mono text-white/50 tracking-widest mr-6">{savedStatus ? "SYS.DEPLOYED" : "AWAITING.DEPLOY"}</span><button onClick={handleDeploy} disabled={isLoading || savedStatus} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${savedStatus ? "bg-green-500 text-black" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]"}`}>{isLoading ? <Loader2 size={16} className="animate-spin" /> : savedStatus ? <CheckCircle2 size={16} /> : <Cpu size={16} />}{savedStatus ? "核心配置已写入" : "部署覆写"}</button></motion.div>}
      </AnimatePresence>
    </div>
  );
}
