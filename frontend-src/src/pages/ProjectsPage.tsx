import { Boxes, Edit3, Film, FolderKanban, Image as ImageIcon, Loader2, RefreshCw, Save, Trash2, Workflow, X, FileText, Clapperboard, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { formatDate } from "../lib/format";
import { useAppStore } from "../store/useAppStore";
import type { PageId } from "../types/tudou";

const PAGE_PATH: Record<PageId, string> = {
  hub: "/",
  workflow: "/workflow",
  scripts: "/scripts",
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

function taskIdOf(task: any) {
  return task?.taskId || task?.task_id || "";
}

function modulePage(moduleType: string): PageId {
  if (moduleType === "image") return "image";
  if (moduleType === "video") return "video";
  if (moduleType === "seedance") return "seedance";
  if (moduleType === "asset" || moduleType === "assets") return "assets";
  return "scripts";
}

function moduleIcon(moduleType: string) {
  if (moduleType === "image") return ImageIcon;
  if (moduleType === "video") return Film;
  if (moduleType === "seedance") return Clapperboard;
  if (moduleType === "asset" || moduleType === "assets") return Boxes;
  return FileText;
}

function primaryScriptTask(project: ArchiveProject) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : [];
  return tasks.find((task) => taskIdOf(task) && (task.moduleType || task.module_type || "script") === "script") || tasks.find((task) => taskIdOf(task)) || null;
}

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

  const normalizeScreenplayProject = (summary: any): ArchiveProject | null => {
    const projectId = summary.projectId || summary.project_id || summary.id;
    if (!projectId) return null;
    const init = summary.init || {};
    const linkedTaskId = summary.linkedScriptTaskId || summary.linked_script_task_id;
    const currentStep = summary.currentStep || summary.current_step;
    return {
      projectId,
      projectName: init.name || summary.name || init.concept || summary.concept || projectId,
      moduleType: "workflow",
      status: currentStep ? `workflow step-${currentStep}` : "workflow",
      latestDate: summary.updatedAt || summary.updated_at,
      taskCount: linkedTaskId ? 1 : 0,
      tasks: linkedTaskId ? [{ taskId: linkedTaskId, moduleType: "script", stage: "workflow-finalized", mode: "workflow", updatedAt: summary.updatedAt || summary.updated_at }] : [],
      source: "screenplay",
      raw: summary,
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
      const screenplayProjects = (Array.isArray(screenplayRows) ? screenplayRows : []).map(normalizeScreenplayProject).filter(Boolean) as ArchiveProject[];
      const merged = new Map<string, ArchiveProject>();
      for (const item of sqliteProjects) if (item.projectId) merged.set(`sqlite:${item.projectId}`, item);
      for (const item of screenplayProjects) if (item.projectId) merged.set(`screenplay:${item.projectId}`, item);
      setProjects([...merged.values()]);
    } catch (err: any) {
      setError(err.message || "读取项目库失败");
    } finally {
      setBusy("");
    }
  };

  const openWorkflowProject = (project: ArchiveProject) => {
    setCurrentProjectId(project.projectId);
    const task = primaryScriptTask(project);
    setCurrentTaskId(task ? taskIdOf(task) : null);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || project.raw?.concept || project.projectName || "");
    setCurrentStep(Math.max(0, Number(project.raw?.currentStep || project.raw?.current_step || 1) - 1));
    navigate(PAGE_PATH.workflow);
  };

  const openTask = (project: ArchiveProject, task: any, page: PageId) => {
    setCurrentProjectId(project.source === "screenplay" ? project.projectId : project.projectId || null);
    const taskId = taskIdOf(task);
    if (taskId) setCurrentTaskId(taskId);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || project.raw?.concept || project.projectName || "");
    navigate(PAGE_PATH[page]);
  };

  const openPrimaryScript = (project: ArchiveProject, page: PageId) => {
    const task = primaryScriptTask(project);
    if (!task) {
      if (page === "scripts") {
        setCurrentProjectId(project.projectId || null);
        setCurrentTaskId(null);
        navigate(PAGE_PATH.scripts);
        return;
      }
      showToast("该项目还没有可承接的 script task，请先进入工作流 finalize，或进入剧本任务页导入/生成剧本。 ");
      return;
    }
    openTask(project, task, page);
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
      if (project.source === "screenplay") await invoke("screenplay/rename", { projectId: project.projectId, newName: nextName }, { silent: true });
      else await invoke("project/rename", { projectId: project.projectId, newName: nextName }, { silent: true });
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
      if (project.source === "screenplay") await invoke("screenplay/delete", { projectId: project.projectId }, { silent: true });
      else await invoke("project/delete", { projectId: project.projectId }, { silent: true });
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
          <p className="eyebrow">Recovery Console</p>
          <h2><FolderKanban size={24} /> 项目库 / 恢复入口</h2>
        </div>
        <button className="btn" onClick={loadProjects} disabled={busy === "load"}>{busy === "load" ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}刷新</button>
      </div>

      <div className="notice">
        <Route size={15} /> 按固定链路恢复：Workflow 项目 → Script Task → Assets → Image/Video Prompt → Seedance。优先从这里进入各阶段，避免 stale localStorage 指向失效项目。
      </div>

      {error && <div className="error">{error}</div>}
      {sortedProjects.length === 0 && <div className="empty">本地项目库暂无记录。可以返回灵感枢纽新建工作流，或进入剧本任务页导入已有剧本。</div>}

      <div className="project-grid">
        {sortedProjects.map((project) => {
          const editKey = `${project.source}:${project.projectId}`;
          const isEditing = editingId === editKey;
          const tasks = Array.isArray(project.tasks) ? project.tasks : [];
          const linkedTask = primaryScriptTask(project);
          const linkedTaskId = linkedTask ? taskIdOf(linkedTask) : "";
          const deleting = busy === `delete:${project.projectId}`;
          const renaming = busy === `rename:${project.projectId}`;

          return (
            <article className="card project-card" key={editKey}>
              <div className="section-head">
                <div className="flex-1">
                  <p className="eyebrow">{project.source} · {project.moduleType}</p>
                  {isEditing ? <div className="flex items-center gap-2 mt-2"><input className="input" value={editingName} onChange={(event) => setEditingName(event.target.value)} autoFocus /><button className="btn cyan" onClick={() => saveRename(project)} disabled={renaming}>{renaming ? <Loader2 size={16} className="spin" /> : <Save size={16} />}</button><button className="btn ghost" onClick={cancelRename}><X size={16} /></button></div> : <h3>{project.projectName}</h3>}
                  <p className="row-meta">{project.status || "active"} · {formatDate(project.latestDate)} · {project.taskCount ?? tasks.length} tasks</p>
                </div>
                <div className="top-actions">
                  <button className="btn ghost" onClick={() => startRename(project)} disabled={isEditing} title="重命名项目"><Edit3 size={16} /></button>
                  <button className="btn ghost" onClick={() => removeProject(project)} disabled={deleting} title="删除项目">{deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}</button>
                </div>
              </div>

              <div className="notice">
                <div>Project ID：<span className="font-mono">{project.projectId}</span></div>
                <div>Script Task：<span className="font-mono">{linkedTaskId || "尚未绑定"}</span></div>
              </div>

              <div className="top-actions mt-4 flex-wrap">
                {project.source === "screenplay" && <button className="btn primary" onClick={() => openWorkflowProject(project)}><Workflow size={16} /> 工作流</button>}
                <button className="btn" onClick={() => openPrimaryScript(project, "scripts")}><FileText size={16} /> 剧本</button>
                <button className="btn" onClick={() => openPrimaryScript(project, "assets")} disabled={!linkedTask}><Boxes size={16} /> 资产</button>
                <button className="btn" onClick={() => openPrimaryScript(project, "image")} disabled={!linkedTask}><ImageIcon size={16} /> 图像</button>
                <button className="btn" onClick={() => openPrimaryScript(project, "video")} disabled={!linkedTask}><Film size={16} /> 视频</button>
                <button className="btn" onClick={() => openPrimaryScript(project, "seedance")} disabled={!linkedTask}><Clapperboard size={16} /> Seedance</button>
              </div>

              <div className="table-list mt-4">
                {tasks.length === 0 && <div className="row-card"><span><span className="row-title"><FileText size={15} /> 暂无 script task</span><span className="row-meta">先完成 workflow finalize，或进入剧本页导入/生成剧本。</span></span></div>}
                {tasks.map((task: any) => {
                  const moduleType = task.moduleType || task.module_type || "script";
                  const page = modulePage(moduleType);
                  const Icon = moduleIcon(moduleType);
                  const taskId = taskIdOf(task);
                  return <div className="row-card" key={taskId || `${moduleType}-${task.updatedAt || task.updated_at || Math.random()}`}>
                    <span><span className="row-title"><Icon size={15} /> {moduleType} · {taskId}</span><span className="row-meta">{task.mode || "default"} · {task.stage || "ready"} · {formatDate(task.updatedAt || task.updated_at)}</span></span>
                    <div className="top-actions">
                      <button className="btn ghost" onClick={() => openTask(project, task, page)}>{page === "scripts" ? "剧本" : "打开"}</button>
                      {page === "scripts" && <button className="btn ghost" onClick={() => openTask(project, task, "assets")}>资产</button>}
                      {page === "scripts" && <button className="btn ghost" onClick={() => openTask(project, task, "image")}>图像</button>}
                      {page === "scripts" && <button className="btn ghost" onClick={() => openTask(project, task, "video")}>视频</button>}
                      {page === "scripts" && <button className="btn ghost" onClick={() => openTask(project, task, "seedance")}>Seedance</button>}
                    </div>
                  </div>;
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
