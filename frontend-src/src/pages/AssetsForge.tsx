import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Box, Clapperboard, FileText, Film, FolderKanban, Image as ImageIcon, Loader2, Map, RefreshCw, Save, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ScriptSelector from "../components/ScriptSelector";
import { useAppStore } from "../store/useAppStore";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { normalizeAssets } from "../lib/format";
import type { AssetBundle, ScriptTask } from "../types/tudou";

type AssetTab = "characters" | "scenes" | "props";

const FIELD_MAP: Record<AssetTab, string[]> = {
  characters: ["name", "appearance", "clothing", "personality", "visualAnchor", "aiPrompt"],
  scenes: ["name", "atmosphere", "materials", "landmarks", "colorTemperature", "aiPrompt"],
  props: ["name", "dramaticFunction", "form", "material", "surfaceState", "aiPrompt"],
};

const EMPTY: AssetBundle = { characters: [], scenes: [], props: [] };
const arr = (v: any) => (Array.isArray(v) ? v : []);
const pickTaskId = (task: ScriptTask) => task.taskId || task.task_id || task.task?.taskId || task.task?.task_id || "";

function eventLine(eventName: string, payload: any) {
  const count = payload?.count !== undefined ? ` count=${payload.count}` : "";
  const model = payload?.fallbackUsed ? " fallback=true" : "";
  const msg = payload?.message || payload?.error || payload?.stage || payload?.assetType || "";
  return `${eventName}:${count}${model}${msg ? ` ${msg}` : ""}`;
}

export default function AssetsForge() {
  const { setRealm, currentTaskId, setCurrentTaskId, currentProjectId } = useAppStore();
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AssetTab>("characters");
  const [assets, setAssets] = useState<AssetBundle>(EMPTY);
  const [progress, setProgress] = useState<string[]>([]);
  const [busy, setBusy] = useState<"load" | "extract" | "save" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRealm("samurai");
  }, [setRealm]);

  useEffect(() => {
    if (currentTaskId) loadAssets(currentTaskId);
  }, [currentTaskId]);

  useEffect(() => {
    const names = ["asset:scan-start", "asset:scan-character", "asset:scan-scene", "asset:scan-prop", "asset:scan-done", "asset:scan-error"];
    let unlisteners: Array<() => void> = [];
    Promise.all(names.map((name) => listen(name, (event: any) => {
      const payload = event.payload || {};
      const taskId = payload.taskId || payload.task_id;
      if (taskId && currentTaskId && taskId !== currentTaskId) return;
      setProgress((prev) => [eventLine(name, payload), ...prev].slice(0, 100));
      if (name === "asset:scan-error") {
        setError(payload.error || payload.message || "资产扫描失败");
        setBusy("");
      }
      if (name === "asset:scan-done") {
        setBusy("");
        const doneTaskId = taskId || currentTaskId || "";
        if (doneTaskId) loadAssets(doneTaskId);
      }
    }))).then((items) => { unlisteners = items; });
    return () => unlisteners.forEach((unlisten) => unlisten());
  }, [currentTaskId]);

  const counts = useMemo(() => ({
    characters: arr(assets.characters).length,
    scenes: arr(assets.scenes).length,
    props: arr(assets.props).length,
  }), [assets]);

  const totalAssets = counts.characters + counts.scenes + counts.props;
  const currentStatus = busy === "extract" ? "扫描中" : busy === "save" ? "保存中" : busy === "load" ? "读取中" : totalAssets > 0 ? "已有资产" : "待扫描";

  async function loadAssets(taskId = currentTaskId || "") {
    if (!taskId) return;
    setBusy("load");
    setError("");
    try {
      const rows = await invoke<any[]>("asset/get-all", { taskId }, { silent: true });
      setAssets(normalizeAssets(rows));
    } catch (err: any) {
      setError(err.message || "读取资产失败");
    } finally {
      setBusy("");
    }
  }

  async function selectScript(task: ScriptTask) {
    const taskId = pickTaskId(task);
    if (!taskId) return;
    setCurrentTaskId(taskId);
    await loadAssets(taskId);
  }

  async function extractAssets() {
    if (!currentTaskId) {
      setError("缺少 currentTaskId。请从项目库选择已成稿的 script task，或先在工作流 Step 8 finalize。");
      return;
    }
    setBusy("extract");
    setError("");
    setProgress(["asset:scan-start pending"]);
    try {
      const result = await invoke<any>("asset/extract", { taskId: currentTaskId }, { timeout: 900000 });
      if (result?.characters || result?.scenes || result?.props) setAssets(normalizeAssets(result));
      await loadAssets(currentTaskId);
    } catch (err: any) {
      setError(err.message || "资产扫描失败");
      setProgress((prev) => [`asset:scan-error ${err.message || err}`, ...prev]);
    } finally {
      setBusy("");
    }
  }

  function updateField(tab: AssetTab, index: number, field: string, value: string) {
    setAssets((prev) => {
      const next: AssetBundle = { characters: [...arr(prev.characters)], scenes: [...arr(prev.scenes)], props: [...arr(prev.props)] };
      next[tab][index] = { ...next[tab][index], [field]: value };
      return next;
    });
  }

  async function saveAssets() {
    if (!currentTaskId) return;
    setBusy("save");
    setError("");
    try {
      await invoke("asset/update", {
        taskId: currentTaskId,
        characters: JSON.stringify(assets.characters || []),
        scenes: JSON.stringify(assets.scenes || []),
        props: JSON.stringify(assets.props || []),
      });
      setProgress((prev) => ["asset:update saved", ...prev]);
      await loadAssets(currentTaskId);
    } catch (err: any) {
      setError(err.message || "保存资产失败");
    } finally {
      setBusy("");
    }
  }

  const items = arr(assets[activeTab]);

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Asset Recovery Console</p>
              <h2>资产矩阵 / 验收工作台</h2>
              <p className="row-meta mt-1">当前状态：{currentStatus}</p>
            </div>
            <div className="top-actions flex-wrap">
              <button className="btn ghost" onClick={() => navigate("/projects")}><FolderKanban size={16} /> 项目库</button>
              <button className="btn ghost" onClick={() => navigate("/scripts")}><FileText size={16} /> 剧本</button>
              <button className="btn ghost" onClick={() => navigate("/image")} disabled={!currentTaskId}><ImageIcon size={16} /> 图像</button>
              <button className="btn ghost" onClick={() => navigate("/video")} disabled={!currentTaskId}><Film size={16} /> 视频</button>
              <button className="btn ghost" onClick={() => navigate("/seedance")} disabled={!currentTaskId}><Clapperboard size={16} /> Seedance</button>
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-3 mt-4">
            <InfoCard label="Project" value={currentProjectId || "未绑定"} />
            <InfoCard label="Script Task" value={currentTaskId || "未选择"} />
            <InfoCard label="资产总数" value={`${totalAssets}`} />
            <InfoCard label="当前分类" value={activeTab} />
          </div>
          {!currentTaskId && <div className="notice warn mt-4">没有有效 script task。请从项目库选择已成稿任务，或先在工作流 Step 8 finalize。资产页不依赖 workflow project，但必须依赖 script task。</div>}
          {error && <div className="error mt-4">{error}</div>}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <aside className="space-y-6">
            <ScriptSelector selectedTaskId={currentTaskId} onSelect={selectScript} />
            <section className="card">
              <p className="eyebrow">Scan Controls</p>
              <div className="grid grid-cols-3 gap-2 my-4">
                <MiniStat label="角色" value={counts.characters} />
                <MiniStat label="场景" value={counts.scenes} />
                <MiniStat label="道具" value={counts.props} />
              </div>
              <div className="top-actions flex-col items-stretch">
                <button className="btn primary w-full" onClick={extractAssets} disabled={!currentTaskId || busy === "extract"}>
                  {busy === "extract" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 扫描剧本资产
                </button>
                <button className="btn w-full" onClick={() => currentTaskId && loadAssets(currentTaskId)} disabled={!currentTaskId || busy === "load"}>
                  {busy === "load" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />} 重新读取资产
                </button>
                <button className="btn cyan w-full" onClick={saveAssets} disabled={!currentTaskId || busy === "save"}>{busy === "save" ? <Loader2 size={16} className="spin" /> : <Save size={16} />} 保存资产修改</button>
              </div>
              <div className="json-box mt-4 max-h-64 overflow-y-auto custom-scrollbar">{progress.length ? progress.join("\n") : "等待真实资产扫描事件。"}</div>
            </section>
          </aside>

          <main className="space-y-6">
            <section className="card">
              <div className="section-head">
                <div><p className="eyebrow">Asset Editor</p><h2>资产卡片编辑</h2></div>
                <button className="btn cyan" onClick={saveAssets} disabled={!currentTaskId || busy === "save"}>{busy === "save" ? <Loader2 size={16} className="spin" /> : <Save size={16} />} 保存</button>
              </div>
              <div className="top-actions flex-wrap">
                <Tab active={activeTab === "characters"} onClick={() => setActiveTab("characters")} icon={<Users size={16} />} label={`角色 ${counts.characters}`} />
                <Tab active={activeTab === "scenes"} onClick={() => setActiveTab("scenes")} icon={<Map size={16} />} label={`场景 ${counts.scenes}`} />
                <Tab active={activeTab === "props"} onClick={() => setActiveTab("props")} icon={<Box size={16} />} label={`道具 ${counts.props}`} />
              </div>
            </section>

            {items.length === 0 ? <div className="empty">当前分类暂无资产。先点击“扫描剧本资产”，或从左侧选择已有 script task。</div> : <div className="grid two">
              {items.map((item: any, index: number) => <section className="card" key={item.id || `${activeTab}-${index}`}>
                <p className="eyebrow">{activeTab} #{index + 1}</p>
                {FIELD_MAP[activeTab].map((field) => <label className="field mt-3" key={field}>
                  <span className="label">{field}</span>
                  {field === "aiPrompt" ? <textarea className="textarea small" value={item[field] || ""} onChange={(e) => updateField(activeTab, index, field, e.target.value)} /> : <input className="input" value={item[field] || ""} onChange={(e) => updateField(activeTab, index, field, e.target.value)} />}
                </label>)}
              </section>)}
            </div>}
          </main>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, icon, label }: any) {
  return <button className={`btn ${active ? "primary" : "ghost"}`} onClick={onClick}>{icon} {label}</button>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 min-w-0"><div className="text-white/35 text-[10px] uppercase tracking-[0.18em] mb-1">{label}</div><div className="text-white/85 text-xs font-mono truncate" title={value}>{value}</div></div>;
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center"><div className="text-white text-lg font-black">{value}</div><div className="text-white/40 text-xs">{label}</div></div>;
}
