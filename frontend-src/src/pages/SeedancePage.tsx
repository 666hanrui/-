import { Clapperboard, Loader2, Play, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import ScriptSelector from "../components/ScriptSelector";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { useAppStore } from "../store/useAppStore";
import type { ScriptTask } from "../types/tudou";

export default function SeedancePage() {
  const { invoke } = useTudouBridge();
  const selectedScriptTaskId = useAppStore((state) => state.selectedScriptTaskId);
  const setSelectedScriptTaskId = useAppStore((state) => state.setSelectedScriptTaskId);
  const setRealm = useAppStore((state) => state.setRealm);
  const showToast = useAppStore((state) => state.showToast);

  const [task, setTask] = useState<ScriptTask | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [busy, setBusy] = useState<"analysis" | "unit" | "all" | "load" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRealm("valley");
  }, [setRealm]);

  const loadUnits = async (taskId: string) => {
    setBusy("load");
    try {
      const rows = await invoke<any[]>("seedance.listUnits", [{ taskId }], { silent: true });
      setUnits(Array.isArray(rows) ? rows : []);
      const cached = await invoke<any>("seedance.getAnalysis", [{ taskId }], { silent: true }).catch(() => null);
      setAnalysis(cached);
    } catch (err: any) {
      setError(err.message || "读取 Seedance 单元失败");
    } finally {
      setBusy("");
    }
  };

  const onSelectScript = (nextTask: ScriptTask, text: string) => {
    setTask(nextTask);
    setScriptText(text);
    setSelectedScriptTaskId(nextTask.taskId);
    loadUnits(nextTask.taskId);
  };

  const runAnalysis = async () => {
    if (!task?.taskId) return;
    setBusy("analysis");
    setError("");
    try {
      const result = await invoke<any>("seedance.runPhaseAD", [{ taskId: task.taskId }], { timeout: 900_000 });
      setAnalysis(result);
      await loadUnits(task.taskId);
      showToast("Seedance A-D 分析完成");
    } catch (err: any) {
      setError(err.message || "Seedance 分析失败");
    } finally {
      setBusy("");
    }
  };

  const runUnit = async (unitIndex: number) => {
    if (!task?.taskId) return;
    setBusy("unit");
    try {
      await invoke<any>("seedance.runUnit", [{ taskId: task.taskId, unitIndex }], { timeout: 900_000 });
      await loadUnits(task.taskId);
      showToast(`镜头单元 ${unitIndex + 1} 已生成`);
    } catch (err: any) {
      setError(err.message || "单元生成失败");
    } finally {
      setBusy("");
    }
  };

  const runAll = async () => {
    if (!task?.taskId) return;
    setBusy("all");
    try {
      await invoke<any>("seedance.runAll", [{ taskId: task.taskId }], { timeout: 1_800_000 });
      await loadUnits(task.taskId);
      showToast("全部镜头单元已生成");
    } catch (err: any) {
      setError(err.message || "批量生成失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="split">
      <aside className="side-panel">
        <ScriptSelector selectedTaskId={selectedScriptTaskId} onSelect={onSelectScript} />
        <div className="card">
          <p className="eyebrow">Script Preview</p>
          <div className="script-preview scroll">{scriptText || "请选择一个剧本任务。"}</div>
        </div>
      </aside>

      <main className="main-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Seedance Shot Units</p>
            <h2>
              <Clapperboard size={24} /> 镜头单元生成
            </h2>
          </div>
          <div className="top-actions">
            <button className="btn primary" onClick={runAnalysis} disabled={!task || busy === "analysis"}>
              {busy === "analysis" ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              运行 A-D 分析
            </button>
            <button className="btn cyan" onClick={runAll} disabled={!task || units.length === 0 || busy === "all"}>
              {busy === "all" ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
              全部生成
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="grid two">
          <section className="card">
            <p className="eyebrow">Phase A-D</p>
            <pre className="json-box">{analysis ? JSON.stringify(analysis, null, 2) : "等待分析结果。"}</pre>
          </section>
          <section className="card">
            <p className="eyebrow">Units</p>
            <div className="table-list">
              {busy === "load" && <div className="notice"><Loader2 size={14} className="spin" /> 正在读取...</div>}
              {units.length === 0 && <div className="empty">完成 A-D 分析后会出现镜头单元。</div>}
              {units.map((unit, index) => (
                <div className="row-card" key={unit.id || unit.unitIndex || index}>
                  <span>
                    <span className="row-title">Unit {Number(unit.unitIndex ?? index) + 1}</span>
                    <span className="row-meta">{unit.status || unit.stage || "pending"}</span>
                  </span>
                  <button className="btn" onClick={() => runUnit(Number(unit.unitIndex ?? index))} disabled={busy === "unit"}>
                    {busy === "unit" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                    生成
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
