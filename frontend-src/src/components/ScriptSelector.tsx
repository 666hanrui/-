import { FileText, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate, getProjectName, getScriptText, getTaskId, getUpdatedAt } from "../lib/format";
import type { ScriptTask } from "../types/tudou";

interface ScriptSelectorProps {
  selectedTaskId?: string | null;
  onSelect: (task: ScriptTask, text: string) => void;
}

export default function ScriptSelector({ selectedTaskId, onSelect }: ScriptSelectorProps) {
  const { invoke, isLoading } = useTudouBridge();
  const [tasks, setTasks] = useState<ScriptTask[]>([]);
  const [error, setError] = useState("");
  const autoSelectedRef = useRef<string | null>(null);

  const loadTasks = async () => {
    setError("");
    try {
      const rows = await invoke<ScriptTask[]>("script/recent", {}, { silent: true });
      setTasks(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err.message || "加载剧本任务失败");
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!selectedTaskId || autoSelectedRef.current === selectedTaskId || tasks.length === 0) return;
    const task = tasks.find((item) => getTaskId(item) === selectedTaskId);
    if (!task) return;
    autoSelectedRef.current = selectedTaskId;
    choose(task);
  }, [selectedTaskId, tasks]);

  const choose = async (task: ScriptTask) => {
    const taskId = getTaskId(task);
    if (!taskId) {
      setError("剧本任务缺少 taskId");
      return;
    }
    try {
      const full = await invoke<ScriptTask>("script/load", { taskId }, { silent: true });
      const merged = { ...task, ...full };
      const text = getScriptText(merged) || getScriptText(task);
      if (!text.trim()) {
        setError("已读取任务，但没有找到剧本正文");
      } else {
        setError("");
      }
      onSelect(merged, text);
    } catch (err: any) {
      setError(err.message || "读取剧本文本失败");
    }
  };

  return (
    <div className="card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Script Source</p>
          <h3>选择剧本</h3>
        </div>
        <button className="btn ghost" onClick={loadTasks} disabled={isLoading} title="刷新">
          {isLoading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="table-list">
        {tasks.length === 0 && <div className="empty">还没有可承接的剧本任务</div>}
        {tasks.map((task) => {
          const taskId = getTaskId(task);
          const active = selectedTaskId === taskId;
          return (
            <button
              key={taskId || JSON.stringify(task)}
              className={`row-card select-row ${active ? "active" : ""}`}
              onClick={() => choose(task)}
            >
              <span>
                <span className="row-title">
                  <FileText size={15} /> {getProjectName(task)}
                </span>
                <span className="row-meta">
                  {task.mode || "script"} · {task.stage || "ready"} · {formatDate(getUpdatedAt(task))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}