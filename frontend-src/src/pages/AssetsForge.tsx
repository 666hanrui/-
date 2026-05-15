import { useEffect, useState } from "react";
import { Box, Loader2, Map, Save, Users } from "lucide-react";
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

export default function AssetsForge() {
  const { setRealm, currentTaskId, setCurrentTaskId } = useAppStore();
  const { invoke } = useTudouBridge();
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

  async function loadAssets(taskId = currentTaskId || "") {
    if (!taskId) return;
    setBusy("load");
    setError("");
    try {
      const rows = await invoke<any[]>("asset/get-all", { task_id: taskId, taskId }, { silent: true });
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
      setError("缺少 currentTaskId。请从项目 finalize，或选择已有 script task。");
      return;
    }
    setBusy("extract");
    setError("");
    setProgress(["asset scan started"]);
    try {
      await invoke("asset/extract", { task_id: currentTaskId, taskId: currentTaskId }, { timeout: 900000 });
      setProgress((prev) => ["asset scan done", ...prev]);
      await loadAssets(currentTaskId);
    } catch (err: any) {
      setError(err.message || "资产扫描失败");
      setProgress((prev) => [`asset scan error: ${err.message || err}`, ...prev]);
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
        task_id: currentTaskId,
        taskId: currentTaskId,
        characters: JSON.stringify(assets.characters || []),
        scenes: JSON.stringify(assets.scenes || []),
        props: JSON.stringify(assets.props || []),
      });
      setProgress((prev) => ["assets saved", ...prev]);
    } catch (err: any) {
      setError(err.message || "保存资产失败");
    } finally {
      setBusy("");
    }
  }

  const items = arr(assets[activeTab]);

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <aside className="space-y-6">
          <ScriptSelector selectedTaskId={currentTaskId} onSelect={selectScript} />
          <section className="card">
            <p className="eyebrow">Asset Matrix</p>
            {!currentTaskId && <div className="notice warn">没有 currentTaskId。请从项目 finalize，或选择已有 script task。</div>}
            {error && <div className="error">{error}</div>}
            <button className="btn primary w-full" onClick={extractAssets} disabled={!currentTaskId || busy === "extract"}>
              {busy === "extract" ? <Loader2 size={16} className="spin" /> : null} 扫描剧本资产
            </button>
            <div className="json-box mt-4 max-h-64 overflow-y-auto custom-scrollbar">{progress.length ? progress.join("\n") : "等待资产扫描。"}</div>
          </section>
        </aside>

        <main className="space-y-6">
          <section className="card">
            <div className="section-head">
              <div><p className="eyebrow">Asset Editor</p><h2>资产矩阵</h2></div>
              <button className="btn cyan" onClick={saveAssets} disabled={!currentTaskId || busy === "save"}>{busy === "save" ? <Loader2 size={16} className="spin" /> : <Save size={16} />} 保存资产</button>
            </div>
            <div className="top-actions">
              <Tab active={activeTab === "characters"} onClick={() => setActiveTab("characters")} icon={<Users size={16} />} label={`角色 ${assets.characters.length}`} />
              <Tab active={activeTab === "scenes"} onClick={() => setActiveTab("scenes")} icon={<Map size={16} />} label={`场景 ${assets.scenes.length}`} />
              <Tab active={activeTab === "props"} onClick={() => setActiveTab("props")} icon={<Box size={16} />} label={`道具 ${assets.props.length}`} />
            </div>
          </section>

          {items.length === 0 ? <div className="empty">当前分类暂无资产。</div> : <div className="grid two">
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
  );
}

function Tab({ active, onClick, icon, label }: any) {
  return <button className={`btn ${active ? "primary" : "ghost"}`} onClick={onClick}>{icon} {label}</button>;
}