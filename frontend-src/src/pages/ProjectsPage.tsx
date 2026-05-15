import { Boxes, Edit3, Film, FolderKanban, Image as ImageIcon, Loader2, RefreshCw, Save, Trash2, Workflow, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { PageId } from "../types/tudou";

const PAGE_PATH: Record<PageId, string> = {
  hub: "/",
  workflow: "/workflow",
  assets: "/assets",
  image: "/image",
  video: "/video",
  seedance: "/seedance",
  projects: "/projects",
  settings: "/settings",
};

type ArchiveProject = {
  projectId: string;
  projectName: string;
  moduleType: "workflow" | "script" | "image" | "video" | string;
  status?: string;
  latestDate?: string;
  taskCount?: number;
  tasks?: any[];
  source: "screenplay" | "sqlite";
  raw?: any;
};

export default function ProjectsPage() {
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const setRealm = useAppStore((state) => state.setRealm);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setScriptSeed = useAppStore((state) => state.setScriptSeed);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);
  const showToast = useAppStore((state) => state.showToast);

  const [projects, setProjects] = useState<ArchiveProject[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    setRealm("cloudcity");
    loadProjects();
  }, [setRealm]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => (b.latestDate || "").localeCompare(a.latestDate || ""));
  }, [projects]);

  const normalizeSqliteProject = (project: any): ArchiveProject => {
    const projectId = project.projectId || project.project_id || project.id || "";
    return {
      projectId,
      projectName: project.projectName || project.project_name || project.name || projectId,
      moduleType: project.moduleType || project.module_type || "script",
      status: project.status || "active",
      latestDate: project.latestDate || project.latest_date || project.updatedAt || project.updated_at,
      taskCount: project.taskCount || project.task_count || project.tasks?.length || 0,
      tasks: Array.isArray(project.tasks) ? project.tasks : [],
      source: "sqlite",
      raw: project,
    };
  };

  const normalizeScreenplayProject = async (summary: any): Promise<ArchiveProject | null> => {
    const projectId = summary.projectId || summary.project_id || summary.id;
    if (!projectId) return null;
    const detail = await invoke<any>("screenplay/get", { projectId }, { silent: true }).catch(() => null);
    const init = detail?.init || summary.init || {};
    return {
      projectId,
      projectName: init.name || summary.name || init.concept || projectId,
      moduleType: "workflow",
      status: detail ? `step-${detail.currentStep || detail.current_step || 1}` : "workflow",
      latestDate: detail?.updatedAt || detail?.updated_at || summary.updatedAt || summary.updated_at,
      taskCount: detail?.linkedScriptTaskId || detail?.linked_script_task_id ? 1 : 0,
      tasks: detail?.linkedScriptTaskId || detail?.linked_script_task_id
        ? [{ taskId: detail.linkedScriptTaskId || detail.linked_script_task_id, moduleType: "script", stage: "linked", mode: "workflow-finalized", updatedAt: detail.updatedAt || detail.updated_at }]
        : [],
      source: "screenplay",
      raw: detail || summary,
    };
  };

  const loadProjects = async () => {
    setBusy("load");
    setError("");
    try {
      const [sqliteRows, screenplayRows] = await Promise.all([
        invoke<any[]>("project/get-all", {}, { silent: true }).catch(() => []),
        invoke<any[]>("screenplay/list-recent", { limit: 50 }, { silent: true }).catch(() => []),
      ]);

      const sqliteProjects = Array.isArray(sqliteRows) ? sqliteRows.map(normalizeSqliteProject) : [];
      const screenplayProjects = await Promise.all(
        (Array.isArray(screenplayRows) ? screenplayRows : []).map(normalizeScreenplayProject)
      );

      const merged = new Map<string, ArchiveProject>();
      for (const item of sqliteProjects) {
        if (item.projectId) merged.set(`sqlite:${item.projectId}`, item);
      }
      for (const item of screenplayProjects) {
        if (item?.projectId) merged.set(`screenplay:${item.projectId}`, item);
      }
      setProjects([...merged.values()]);
    } catch (err: any) {
      setError(err.message || "读取项目库失败");
    } finally {
      setBusy("");
    }
  };

  const openWorkflowProject = (project: ArchiveProject) => {
    setCurrentProjectId(project.projectId);
    setCurrentTaskId(null);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || project.projectName || "");
    setCurrentStep(Math.max(0, Number(project.raw?.currentStep || project.raw?.current_step || 1) - 1));
    navigate(PAGE_PATH.workflow);
  };

  const openTask = (project: ArchiveProject, task: any, page: PageId) => {
    setCurrentProjectId(project.projectId || null);
    if (task?.taskId || task?.task_id) setCurrentTaskId(task.taskId || task.task_id);
    navigate(PAGE_PATH[page]);
  };

  const startRename = (project: ArchiveProject) => {
    setEditingId(`${project.source}:${project.projectId}`);
    setEditingName(project.projectName || "");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveRename = async (project: ArchiveProject) => {
    const nextName = editingName.trim();
    if (!nextName) return;
    setBusy(`rename:${project.projectId}`);
    try {
      if (project.source === "screenplay") {
        await invoke("screenplay/rename", { projectId: project.projectId, newName: nextName }, { silent: true });
      } else {
        await invoke("project/rename", { projectId: project.projectId, newName: nextName }, { silent: true });
      }
      setProjects((prev) => prev.map((item) => item.source === project.source && item.projectId === project.projectId ? { ...item, projectName: nextName } : item));
      cancelRename();
      showToast("项目已重命名");
    } catch (err: any) {
      setError(err.message || "重命名失败");
    } finally {
      setBusy("");
    }
  };

  const removeProject = async (project: ArchiveProject) => {
    setBusy(`delete:${project.projectId}`);
    try {
      if (project.source === "screenplay") {
        await invoke("screenplay/delete", { projectId: project.projectId }, { silent: true });
      } else {
        await invoke("project/delete", { projectId: project.projectId }, { silent: true });
      }
      setProjects((prev) => prev.filter((item) => !(item.source === project.source && item.projectId === project.projectId)));
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
      {sortedProjects.length === 0 && <div className="empty">本地项目库暂无记录。</div>}

      <div className="project-grid">
        {sortedProjects.map((project) => {
          const editKey = `${project.source}:${project.projectId}`;
          const isEditing = editingId === editKey;
          const tasks = Array.isArray(project.tasks) ? project.tasks : [];
          const deleting = busy === `delete:${project.projectId}`;
          const renaming = busy === `rename:${project.projectId}`;

          return (
            <article className="card project-card" key={editKey}>
              <div className="section-head">
                <div className="flex-1">
                  <p className="eyebrow">{project.source} · {project.moduleType}</p>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input className="input" value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus />
                      <button className="btn cyan" onClick={() => saveRename(project)} disabled={renaming}>
                        {renaming ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                      </button>
                      <button className="btn ghost" onClick={cancelRename}><X size={16} /></button>
                    </div>
                  ) : (
                    <h3>{project.projectName}</h3>
                  )}
                  <p className="row-meta">{project.status || "active"} · {formatDate(project.latestDate)} · {project.taskCount ?? tasks.length} tasks</p>
                </div>
                <div className="top-actions">
                  <button className="btn ghost" onClick={() => startRename(project)} disabled={isEditing} title="重命名项目">
                    <Edit3 size={16} />
                  </button>
                  <button className="btn ghost" onClick={() => removeProject(project)} disabled={deleting} title="删除项目">
                    {deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
              <div className="table-list">
                {project.source === "screenplay" && (
                  <button className="row-card" onClick={() => openWorkflowProject(project)}>
                    <span>
                      <span className="row-title"><Workflow size={15} /> 打开工作流项目</span>
                      <span className="row-meta">恢复 currentProjectId / currentStep / concept</span>
                    </span>
                  </button>
                )}

                {tasks.length === 0 && project.source !== "screenplay" && (
                  <button className="row-card" onClick={() => openTask(project, null, "workflow")}>
                    <span>
                      <span className="row-title"><Workflow size={15} /> 打开项目</span>
                      <span className="row-meta">project shell</span>
                    </span>
                  </button>
                )}

                {tasks.map((task: any) => {
                  const moduleType = task.moduleType || task.module_type || "script";
                  const page: PageId = moduleType === "image" ? "image" : moduleType === "video" ? "video" : "assets";
                  const Icon = moduleType === "image" ? ImageIcon : moduleType === "video" ? Film : Boxes;
                  return (
                    <button className="row-card select-row" key={task.taskId || task.task_id} onClick={() => openTask(project, task, page)}>
                      <span>
                        <span className="row-title"><Icon size={15} /> {moduleType} · {task.taskId || task.task_id}</span>
                        <span className="row-meta">{task.mode || "default"} · {task.stage || "ready"} · {formatDate(task.updatedAt || task.updated_at)}</span>
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