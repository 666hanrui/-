import { Boxes, Film, FolderKanban, Image as ImageIcon, Loader2, RefreshCw, Trash2, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { PageId } from "../types/tudou";

export default function ProjectsPage() {
  const { invoke } = useTudouBridge();
  const setRealm = useAppStore((state) => state.setRealm);
  const setPage = useAppStore((state) => state.setPage);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const setSelectedScriptTaskId = useAppStore((state) => state.setSelectedScriptTaskId);
  const showToast = useAppStore((state) => state.showToast);

  const [projects, setProjects] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setRealm("cloudcity");
    loadProjects();
  }, [setRealm]);

  const loadProjects = async () => {
    setBusy("load");
    setError("");
    try {
      const rows = await invoke<any[]>("getProjects", [], { silent: true });
      setProjects(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err.message || "读取项目库失败");
    } finally {
      setBusy("");
    }
  };

  const openTask = (project: any, task: any, page: PageId) => {
    setCurrentProjectId(project.projectId || project.project_id || null);
    if (task?.taskId) setSelectedScriptTaskId(task.taskId);
    setPage(page);
  };

  const removeProject = async (projectId: string) => {
    setBusy(projectId);
    try {
      await invoke("deleteProject", [projectId], { silent: true });
      setProjects((prev) => prev.filter((project) => (project.projectId || project.project_id) !== projectId));
      showToast("项目已删除");
    } catch (err: any) {
      setError(err.message || "删除失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="main-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Local Archive</p>
          <h2>
            <FolderKanban size={24} /> 项目库
          </h2>
        </div>
        <button className="btn" onClick={loadProjects} disabled={busy === "load"}>
          {busy === "load" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          刷新
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {projects.length === 0 && <div className="empty">本地项目库暂无记录。</div>}

      <div className="project-grid">
        {projects.map((project) => {
          const projectId = project.projectId || project.project_id || project.id;
          const tasks = Array.isArray(project.tasks) ? project.tasks : [];
          return (
            <article className="card project-card" key={projectId}>
              <div className="section-head">
                <div>
                  <p className="eyebrow">{project.moduleType || project.module_type || "project"}</p>
                  <h3>{project.projectName || project.name || projectId}</h3>
                  <p className="row-meta">{project.status || "active"} · {formatDate(project.latestDate || project.updatedAt || project.updated_at)}</p>
                </div>
                <button className="btn ghost" onClick={() => removeProject(projectId)} disabled={busy === projectId} title="删除项目">
                  {busy === projectId ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                </button>
              </div>
              <div className="table-list">
                {tasks.length === 0 && (
                  <button className="row-card" onClick={() => openTask(project, null, "workflow")}>
                    <span>
                      <span className="row-title"><Workflow size={15} /> 打开工作流项目</span>
                      <span className="row-meta">screenplay project</span>
                    </span>
                  </button>
                )}
                {tasks.map((task: any) => {
                  const page: PageId = task.moduleType === "image" ? "image" : task.moduleType === "video" ? "video" : "assets";
                  const Icon = task.moduleType === "image" ? ImageIcon : task.moduleType === "video" ? Film : Boxes;
                  return (
                    <button className="row-card select-row" key={task.taskId} onClick={() => openTask(project, task, page)}>
                      <span>
                        <span className="row-title"><Icon size={15} /> {task.moduleType || "script"} · {task.taskId}</span>
                        <span className="row-meta">{task.mode || "default"} · {task.stage || "ready"} · {formatDate(task.updatedAt)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
