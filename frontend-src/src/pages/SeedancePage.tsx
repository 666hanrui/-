import { listen } from "@tauri-apps/api/event";
import { AlertTriangle, CheckCircle2, Clapperboard, Copy, Loader2, Play, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ScriptSelector from "../components/ScriptSelector";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { getTaskId } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { ScriptTask } from "../types/tudou";

type BusyState = "analysis" | "unit" | "all" | "load" | "";

function unitIndexOf(unit: any, fallback: number) {
  const value = unit?.unitIndex ?? unit?.unit_index ?? fallback;
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function unitStatus(unit: any) {
  return unit?.status || unit?.stage || "pending";
}

function parseNoteArea(value: any) {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function taskIdOfPayload(payload: any) {
  return payload?.taskId || payload?.task_id || "";
}

function progressLine(payload: any) {
  const unit = payload?.unitIndex ?? payload?.unit_index;
  const unitPart = unit !== undefined ? ` unit=${Number(unit) + 1}` : "";
  const progress = payload?.progress !== undefined ? ` progress=${Math.round(Number(payload.progress) * 100)}%` : "";
  const status = payload?.status || payload?.stage || payload?.message || "progress";
  return `seedance:${status}${unitPart}${progress}`;
}

export default function SeedancePage() {
  const { invoke } = useTudouBridge();
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setRealm = useAppStore((state) => state.setRealm);
  const showToast = useAppStore((state) => state.showToast);

  const [task, setTask] = useState<ScriptTask | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [activeUnitIndex, setActiveUnitIndex] = useState(0);
  const [progress, setProgress] = useState<string[]>([]);
  const [busy, setBusy] = useState<BusyState>("");
  const [error, setError] = useState("");

  const selectedTaskId = useMemo(() => getTaskId(task) || currentTaskId || "", [task, currentTaskId]);
  const activeUnit = useMemo(() => units.find((unit, index) => unitIndexOf(unit, index) === activeUnitIndex) || units[0] || null, [units, activeUnitIndex]);
  const noteArea = parseNoteArea(activeUnit?.noteAreaJson || activeUnit?.note_area_json);

  useEffect(() => {
    setRealm("valley");
  }, [setRealm]);

  useEffect(() => {
    if (currentTaskId && !task) loadUnits(currentTaskId, true);
  }, [currentTaskId]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen("seedance:progress", (event: any) => {
      const payload = event.payload || {};
      const pid = taskIdOfPayload(payload);
      if (pid && currentTaskId && pid !== currentTaskId) return;
      setProgress((prev) => [progressLine(payload), ...prev].slice(0, 120));
      if (payload.error) setError(String(payload.error));
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [currentTaskId]);

  const loadUnits = async (taskId: string, silent = false) => {
    if (!taskId) return;
    if (!silent) setBusy("load");
    setError("");
    try {
      const rows = await invoke<any[]>("seedance/list-units", { taskId }, { silent: true });
      const list = Array.isArray(rows) ? rows : [];
      setUnits(list);
      if (list.length > 0) setActiveUnitIndex(unitIndexOf(list[0], 0));
      const cached = await invoke<any>("seedance/get-analysis", { taskId }, { silent: true }).catch(() => null);
      setAnalysis(cached);
    } catch (err: any) {
      setError(err.message || "读取 Seedance 单元失败");
    } finally {
      if (!silent) setBusy("");
    }
  };

  const onSelectScript = (nextTask: ScriptTask, text: string) => {
    const taskId = getTaskId(nextTask);
    setTask(nextTask);
    setScriptText(text);
    setProgress([]);
    setError("");
    if (taskId) {
      setCurrentTaskId(taskId);
      loadUnits(taskId);
    }
  };

  const runAnalysis = async () => {
    if (!selectedTaskId) return;
    setBusy("analysis");
    setError("");
    setProgress(["seedance:phase-ad start"]);
    try {
      const result = await invoke<any>("seedance/phase-ad", { taskId: selectedTaskId }, { timeout: 900_000 });
      setAnalysis(result);
      await loadUnits(selectedTaskId, true);
      setProgress((prev) => ["seedance:phase-ad done", ...prev]);
      showToast("Seedance Phase A-D 分析完成");
    } catch (err: any) {
      setError(err.message || "Seedance A-D 分析失败");
      setProgress((prev) => [`seedance:phase-ad error ${err.message || err}`, ...prev]);
    } finally {
      setBusy("");
    }
  };

  const runUnit = async (unitIndex: number) => {
    if (!selectedTaskId) return;
    setBusy("unit");
    setError("");
    setActiveUnitIndex(unitIndex);
    setProgress((prev) => [`seedance:unit start unit=${unitIndex + 1}`, ...prev]);
    try {
      await invoke<any>("seedance/run-unit", { taskId: selectedTaskId, unitIndex }, { timeout: 900_000 });
      await loadUnits(selectedTaskId, true);
      setProgress((prev) => [`seedance:unit done unit=${unitIndex + 1}`, ...prev]);
      showToast(`镜头单元 ${unitIndex + 1} 已生成`);
    } catch (err: any) {
      setError(err.message || "单元生成失败");
      setProgress((prev) => [`seedance:unit error unit=${unitIndex + 1} ${err.message || err}`, ...prev]);
    } finally {
      setBusy("");
    }
  };

  const runAll = async () => {
    if (!selectedTaskId || units.length === 0) return;
    setBusy("all");
    setError("");
    setProgress((prev) => ["seedance:run-all start", ...prev]);
    try {
      for (let i = 0; i < units.length; i += 1) {
        const unitIndex = unitIndexOf(units[i], i);
        setActiveUnitIndex(unitIndex);
        setProgress((prev) => [`seedance:run-all unit=${unitIndex + 1}/${units.length} start`, ...prev]);
        await invoke<any>("seedance/run-unit", { taskId: selectedTaskId, unitIndex }, { timeout: 900_000 });
        await loadUnits(selectedTaskId, true);
        setProgress((prev) => [`seedance:run-all unit=${unitIndex + 1}/${units.length} done`, ...prev]);
      }
      setProgress((prev) => ["seedance:run-all done", ...prev]);
      showToast("全部镜头单元已逐条生成完成");
    } catch (err: any) {
      setError(err.message || "批量生成失败");
      setProgress((prev) => [`seedance:run-all error ${err.message || err}`, ...prev]);
    } finally {
      setBusy("");
    }
  };

  const refreshCurrentUnit = async () => {
    if (!selectedTaskId) return;
    setBusy("load");
    try {
      const unit = await invoke<any>("seedance/get-unit", { taskId: selectedTaskId, unitIndex: activeUnitIndex }, { silent: true });
      if (unit) {
        setUnits((prev) => {
          const rest = prev.filter((item, index) => unitIndexOf(item, index) !== activeUnitIndex);
          return [...rest, unit].sort((a, b) => unitIndexOf(a, 0) - unitIndexOf(b, 0));
        });
      }
    } catch (err: any) {
      setError(err.message || "读取当前单元失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="split">
      <aside className="side-panel">
        <ScriptSelector selectedTaskId={currentTaskId} onSelect={onSelectScript} />
        <div className="card">
          <p className="eyebrow">Script Preview</p>
          <div className="script-preview scroll">{scriptText || "请选择一个剧本任务。"}</div>
        </div>
        <div className="card">
          <p className="eyebrow">Progress</p>
          <pre className="json-box">{progress.length ? progress.join("\n") : "等待 seedance:progress。"}</pre>
        </div>
      </aside>

      <main className="main-panel">
        <div className="section-head">
          <div><p className="eyebrow">Seedance V5</p><h2><Clapperboard size={24} /> Phase A-D / Unit E-F-G</h2></div>
          <div className="top-actions">
            <button className="btn" onClick={() => selectedTaskId && loadUnits(selectedTaskId)} disabled={!selectedTaskId || busy === "load"}>{busy === "load" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}恢复</button>
            <button className="btn primary" onClick={runAnalysis} disabled={!selectedTaskId || busy === "analysis"}>{busy === "analysis" ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}Phase A-D</button>
            <button className="btn cyan" onClick={runAll} disabled={!selectedTaskId || units.length === 0 || busy === "all"}>{busy === "all" ? <Loader2 size={16} className="spin" /> : <Play size={16} />}全部生成</button>
          </div>
        </div>

        {!selectedTaskId && <div className="notice warn">请选择 script task。Seedance V5 以 script task 作为恢复主键。</div>}
        {error && <div className="error"><AlertTriangle size={16} /> {error}</div>}

        <div className="grid two">
          <section className="card">
            <div className="section-head"><div><p className="eyebrow">Layer 1</p><h3>Phase A-D 分析</h3></div>{analysis && <span className="tag"><CheckCircle2 size={14} /> ready</span>}</div>
            <div className="grid two mb-4">
              <div className="notice">总时长：{analysis?.totalSec || analysis?.total_sec || "N/A"}</div>
              <div className="notice">单元数：{analysis?.totalUnits || analysis?.total_units || units.length || "N/A"}</div>
            </div>
            <pre className="json-box">{analysis ? JSON.stringify(analysis, null, 2) : "等待 A-D 分析结果。"}</pre>
          </section>

          <section className="card">
            <p className="eyebrow">Layer 2</p>
            <h3>Unit E/F/G 列表</h3>
            <div className="table-list mt-4">
              {busy === "load" && <div className="notice"><Loader2 size={14} className="spin" /> 正在读取...</div>}
              {units.length === 0 && <div className="empty">完成 A-D 分析后会出现 seedance_units。</div>}
              {units.map((unit, index) => {
                const unitIndex = unitIndexOf(unit, index);
                const status = unitStatus(unit);
                return (
                  <button key={unit.id || unitIndex} className={`row-card select-row ${activeUnitIndex === unitIndex ? "active" : ""}`} onClick={() => setActiveUnitIndex(unitIndex)}>
                    <span>
                      <span className="row-title">Unit {unitIndex + 1} · {unit.sceneType || unit.scene_type || "scene"}</span>
                      <span className="row-meta">{status} · {unit.durationSec || unit.duration_sec || "?"}s · shots {unit.subShotCount || unit.sub_shot_count || "?"}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <section className="card">
          <div className="section-head">
            <div><p className="eyebrow">Unit Detail</p><h3>Unit {activeUnit ? activeUnitIndex + 1 : "-"} 生成结果</h3></div>
            <div className="top-actions">
              <button className="btn" onClick={refreshCurrentUnit} disabled={!selectedTaskId || !activeUnit || busy === "load"}>{busy === "load" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}刷新单元</button>
              <button className="btn primary" onClick={() => runUnit(activeUnitIndex)} disabled={!selectedTaskId || !activeUnit || busy === "unit"}>{busy === "unit" ? <Loader2 size={16} className="spin" /> : <Copy size={16} />}生成当前单元</button>
            </div>
          </div>
          {!activeUnit ? <div className="empty">请选择一个 Unit。</div> : <div className="grid two">
            <div>
              <div className="grid two mb-4">
                <div className="notice">status：{unitStatus(activeUnit)}</div>
                <div className="notice">retry：{activeUnit.retryCount ?? activeUnit.retry_count ?? 0}</div>
              </div>
              {(activeUnit.errorMessage || activeUnit.error_message) && <div className="error">{activeUnit.errorMessage || activeUnit.error_message}</div>}
              <p className="eyebrow mt-4">copyArea</p>
              <pre className="json-box">{activeUnit.copyArea || activeUnit.copy_area || "尚未生成 copyArea。"}</pre>
            </div>
            <div>
              <p className="eyebrow">noteAreaJson</p>
              <pre className="json-box">{noteArea ? JSON.stringify(noteArea, null, 2) : "尚未生成 noteAreaJson。"}</pre>
            </div>
          </div>}
        </section>
      </main>
    </div>
  );
}
