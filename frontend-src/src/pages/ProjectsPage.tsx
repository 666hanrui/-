import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, FolderKanban, Trash2, Edit2, Play, FileText, Library, Image as ImageIcon, Film, Layers3, Clapperboard, Clock, Loader2, Check, X } from 'lucide-react';
import { useTudouBridge } from '../hooks/useTudouBridge';
import { useAppStore } from '../store/useAppStore';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ActionBar, { ActionButton } from '../components/ui/ActionBar';
import EmptyState from '../components/ui/EmptyState';
import { TextInput } from '../components/ui/FormField';

interface ArchiveProject {
  projectId: string;
  projectName: string;
  moduleType: string;
  status: string;
  latestDate: string;
  taskCount: number;
  tasks: any[];
  source: 'screenplay' | 'sqlite';
  raw: any;
  currentStep: number | null;
  doneSteps: number[];
  linkedScriptTaskId: string | null;
  versionCount: number;
  activeVersionCount: number;
}

const toNumber = (value: any, fallback: number | null = null) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const normalizeDoneSteps = (value: any): number[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
};

const workflowStatusLabel = (status: string, isZh: boolean) => {
  if (status === 'finalized') return isZh ? '已成稿' : 'Finalized';
  if (status === 'ready_to_finalize') return isZh ? '待成稿' : 'Ready';
  if (status === 'in_progress') return isZh ? '推进中' : 'In Progress';
  return status || (isZh ? '未知' : 'Unknown');
};

export default function ProjectsPage() {
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const { setCurrentProjectId, setCurrentWorkflowProjectId, setCurrentTaskId, setScriptSeed, setCurrentStep, setRealm, language, showToast } = useAppStore();
  const isZh = language === 'zh';

  const [projects, setProjects] = useState<ArchiveProject[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const taskIdOf = (task: any) => task?.taskId || task?.task_id || task?.id || '';

  const primaryScriptTask = (project: ArchiveProject) => {
    if (project.linkedScriptTaskId) return project.linkedScriptTaskId;

    const direct = project.raw?.scriptTaskId || project.raw?.script_task_id || project.raw?.linkedScriptTaskId || project.raw?.linked_script_task_id;
    if (direct) return direct;

    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const scriptTask = tasks.find((task: any) => taskIdOf(task) && (task.moduleType || task.module_type || 'script') === 'script');
    if (scriptTask) return taskIdOf(scriptTask);

    const anyTask = tasks.find((task: any) => taskIdOf(task));
    return anyTask ? taskIdOf(anyTask) : null;
  };

  const normalizeSqliteProject = (project: any): ArchiveProject => {
    const projectId = project.projectId || project.project_id || project.id || '';
    const linkedScriptTaskId = project.scriptTaskId || project.script_task_id || project.linkedScriptTaskId || project.linked_script_task_id || null;
    const doneSteps = normalizeDoneSteps(project.doneSteps || project.done_steps);
    return {
      projectId,
      projectName: project.projectName || project.project_name || project.name || projectId,
      moduleType: project.moduleType || project.module_type || 'project',
      status: project.status || 'active',
      latestDate: String(project.updatedAt || project.updated_at || project.createdAt || project.created_at || ''),
      taskCount: project.taskCount || project.task_count || (Array.isArray(project.tasks) ? project.tasks.length : 0),
      tasks: Array.isArray(project.tasks) ? project.tasks : [],
      source: 'sqlite',
      raw: project,
      currentStep: toNumber(project.currentStep || project.current_step, null),
      doneSteps,
      linkedScriptTaskId,
      versionCount: toNumber(project.versionCount || project.version_count, 0) || 0,
      activeVersionCount: toNumber(project.activeVersionCount || project.active_version_count, 0) || 0,
    };
  };

  const normalizeScreenplayProject = (summary: any): ArchiveProject | null => {
    const init = summary.init || {};
    const projectId = summary.projectId || summary.project_id || summary.id;
    if (!projectId) return null;

    const linkedTaskId = summary.scriptTaskId || summary.script_task_id || summary.linkedScriptTaskId || summary.linked_script_task_id || null;
    const currentStep = toNumber(summary.currentStep || summary.current_step, 1) || 1;
    const doneSteps = normalizeDoneSteps(summary.doneSteps || summary.done_steps);
    const status = summary.status || (linkedTaskId ? 'finalized' : currentStep >= 8 ? 'ready_to_finalize' : 'in_progress');

    return {
      projectId,
      projectName: init.name || summary.name || init.concept || summary.concept || projectId,
      moduleType: 'workflow',
      status,
      latestDate: String(summary.updatedAt || summary.updated_at || ''),
      taskCount: toNumber(summary.taskCount || summary.task_count, linkedTaskId ? 1 : 0) || 0,
      tasks: linkedTaskId ? [{ taskId: linkedTaskId, moduleType: 'script', stage: 'workflow-finalized', mode: 'workflow', updatedAt: summary.updatedAt || summary.updated_at }] : [],
      source: 'screenplay',
      raw: summary,
      currentStep,
      doneSteps,
      linkedScriptTaskId: linkedTaskId,
      versionCount: toNumber(summary.versionCount || summary.version_count, 0) || 0,
      activeVersionCount: toNumber(summary.activeVersionCount || summary.active_version_count, 0) || 0,
    };
  };

  const loadProjects = async () => {
    setIsFetching(true);
    try {
      const [sqliteRows, screenplayRows] = await Promise.all([
        invoke<any[]>('project/get-all', {}, { silent: true }).catch(() => []),
        invoke<any[]>('screenplay/list-recent', { limit: 50 }, { silent: true }).catch(() => []),
      ]);

      const sqliteProjects = Array.isArray(sqliteRows) ? sqliteRows.map(normalizeSqliteProject) : [];
      const screenplayProjects = (Array.isArray(screenplayRows) ? screenplayRows : []).map(normalizeScreenplayProject).filter(Boolean) as ArchiveProject[];
      const merged = [...sqliteProjects, ...screenplayProjects];
      merged.sort((a, b) => String(b.latestDate || '').localeCompare(String(a.latestDate || '')));
      setProjects(merged);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    setRealm('cloudcity');
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRealm]);

  const startRename = (project: ArchiveProject) => {
    setRenameId(`${project.source}:${project.projectId}`);
    setRenameValue(project.projectName);
  };

  const cancelRename = () => {
    setRenameId(null);
    setRenameValue('');
  };

  const saveRename = async (project: ArchiveProject) => {
    const nextName = renameValue.trim();
    if (!nextName || nextName === project.projectName) {
      cancelRename();
      return;
    }
    try {
      if (project.source === 'screenplay') await invoke('screenplay/rename', { projectId: project.projectId, newName: nextName }, { silent: true });
      else await invoke('project/rename', { projectId: project.projectId, newName: nextName }, { silent: true });
      showToast({ message: isZh ? '项目已重命名' : 'Project renamed', type: 'success' });
      await loadProjects();
    } catch {
      showToast({ message: isZh ? '重命名失败' : 'Rename failed', type: 'error' });
    } finally {
      cancelRename();
    }
  };

  const removeProject = async (project: ArchiveProject) => {
    if (!window.confirm(isZh ? '确认要删除此项目吗？所有数据将丢失。' : 'Delete this project? All data will be lost.')) return;
    try {
      if (project.source === 'screenplay') await invoke('screenplay/delete', { projectId: project.projectId });
      else await invoke('project/delete', { projectId: project.projectId });
      showToast({ message: isZh ? '项目已删除' : 'Project deleted', type: 'success' });
      await loadProjects();
    } catch {
      // Global error card displays IPC failures.
    }
  };

  const openWorkflowProject = (project: ArchiveProject) => {
    if (project.source !== 'screenplay') return;
    const taskId = primaryScriptTask(project);
    setCurrentWorkflowProjectId(project.projectId);
    setCurrentProjectId(taskId ? null : project.projectId);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || init.name || project.projectName);
    setCurrentStep(Math.max(0, Number(project.currentStep || 1) - 1));
    setCurrentTaskId(taskId ? taskId : null);
    navigate('/workflow');
  };

  const openTask = (project: ArchiveProject, stage: 'scripts' | 'assets' | 'image' | 'video' | 'frame-prompt' | 'seedance') => {
    const taskId = primaryScriptTask(project);
    if (project.source === 'screenplay') setCurrentWorkflowProjectId(project.projectId);
    setCurrentProjectId(project.source === 'screenplay' ? null : project.projectId || null);
    setCurrentTaskId(taskId ? taskId : null);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || init.name || project.projectName);
    navigate(`/${stage}`);
  };

  const handleRoute = (project: ArchiveProject, stage: 'workflow' | 'scripts' | 'assets' | 'image' | 'video' | 'frame-prompt' | 'seedance') => {
    if (stage === 'workflow') openWorkflowProject(project);
    else openTask(project, stage);
  };

  const projectGroups = [
    {
      id: 'drafting',
      title: isZh ? '推进中' : 'In Progress',
      items: projects.filter((project) => project.source === 'screenplay' && project.status !== 'finalized'),
    },
    {
      id: 'finalized',
      title: isZh ? '已成稿' : 'Finalized',
      items: projects.filter((project) => project.source === 'screenplay' && project.status === 'finalized'),
    },
    {
      id: 'tasks',
      title: isZh ? '后期任务' : 'Post Pipeline',
      items: projects.filter((project) => project.source !== 'screenplay'),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <PageShell maxWidth="max-w-full">
      <ModuleHeader
        icon={<FolderKanban size={24} />}
        eyebrow="System Console"
        title={isZh ? '项目控制台' : 'Project Console'}
        subtitle={isZh ? '统一的正本流程流转中枢。选择项目即可衔接到工作流、剧本、资产、Prompt 或 Seedance。' : 'Unified canonical routing center. Select a project to continue the original flow.'}
        actions={<ActionButton onClick={() => navigate('/')} icon={<Play size={16} />}>{isZh ? '新建工作流' : 'New Workflow'}</ActionButton>}
      />

      {isFetching ? (
        <div className="w-full py-20 flex justify-center text-white/20"><Loader2 size={32} className="animate-spin" /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={32} />}
          title={isZh ? '暂无项目档案' : 'No Projects Found'}
          description={isZh ? '您还没有创建过任何项目。点击下方按钮前往灵感枢纽建立您的第一个工作流。' : "You haven't created any projects yet. Go to Inspiration Hub to start."}
          primaryAction={<ActionButton onClick={() => navigate('/')}>{isZh ? '创建新项目' : 'Create Project'}</ActionButton>}
        />
      ) : (
        <Panel title={isZh ? '项目队列' : 'Project Queue'} noPadding>
          <div className="divide-y divide-white/[0.06]">
            {projectGroups.map((group) => (
              <section key={group.id}>
                <div className="flex items-center justify-between px-5 py-3 bg-white/[0.025]">
                  <div className="text-[11px] font-bold tracking-[0.22em] uppercase text-white/45">{group.title}</div>
                  <div className="text-xs font-mono text-white/35">{group.items.length}</div>
                </div>
                <div className="divide-y divide-white/[0.045]">
                  {group.items.map((project) => {
                    const editKey = `${project.source}:${project.projectId}`;
                    const isRenaming = renameId === editKey;
                    const isExpanded = expandedId === editKey;
                    const taskId = primaryScriptTask(project);
                    const hasTask = Boolean(taskId);
                    const isWorkflowProject = project.source === 'screenplay';
                    const doneCount = project.doneSteps.length;
                    const stepText = project.currentStep ? `Step ${project.currentStep}/8` : 'N/A';
                    const progressPercent = project.currentStep ? Math.min(100, Math.max(0, (project.currentStep / 8) * 100)) : 0;
                    return (
                      <div key={editKey} className="bg-black/[0.08]">
                        <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3 px-5 py-3 hover:bg-white/[0.035] transition-colors">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : editKey)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white"
                            title={isExpanded ? '收起' : '展开'}
                          >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>

                          <div className="min-w-0">
                            {isRenaming ? (
                              <div className="flex items-center gap-2">
                                <TextInput value={renameValue} onChange={(event: any) => setRenameValue(event.target.value)} autoFocus />
                                <ActionButton size="sm" variant="ghost" onClick={cancelRename} icon={<X size={14} />} />
                                <ActionButton size="sm" variant="primary" onClick={() => saveRename(project)} icon={<Check size={14} />} />
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="truncate text-sm font-bold text-white/88">{project.projectName}</span>
                                  <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-mono ${isWorkflowProject ? 'bg-indigo-500/18 text-indigo-300' : 'bg-cyan-500/16 text-cyan-300'}`}>
                                    {isWorkflowProject ? 'WORKFLOW' : 'TASK'}
                                  </span>
                                  <span className="shrink-0 rounded bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-white/40">{workflowStatusLabel(project.status, isZh)}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-[11px] text-white/35">
                                  <span className="font-mono">{isWorkflowProject ? stepText : project.moduleType}</span>
                                  <span className="font-mono">{hasTask ? `task ${taskId.slice(0, 8)}` : 'no task'}</span>
                                  <span className="flex items-center gap-1"><Clock size={10} /> {project.latestDate ? new Date(project.latestDate).toLocaleString() : 'N/A'}</span>
                                </div>
                              </>
                            )}
                          </div>

                          {!isRenaming && (
                            <div className="flex items-center gap-2">
                              <ActionButton size="sm" variant={isWorkflowProject ? 'primary' : 'secondary'} disabled={!isWorkflowProject} icon={<Play size={14} />} onClick={() => handleRoute(project, 'workflow')}>{isZh ? '工作流' : 'Workflow'}</ActionButton>
                              <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<FileText size={14} />} onClick={() => handleRoute(project, 'scripts')}>{isZh ? '剧本' : 'Script'}</ActionButton>
                              <ActionButton variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => startRename(project)} title={isZh ? '重命名' : 'Rename'} />
                              <ActionButton variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => removeProject(project)} title={isZh ? '删除' : 'Delete'} />
                            </div>
                          )}
                        </div>

                        {isExpanded && !isRenaming && (
                          <div className="ml-[68px] mr-5 mb-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                            {isWorkflowProject && (
                              <div className="mb-3">
                                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                  <div className="h-full rounded-full bg-indigo-400/70" style={{ width: `${progressPercent}%` }} />
                                </div>
                                <div className="flex flex-wrap gap-3 text-[11px] text-white/38">
                                  <span>{stepText}</span>
                                  <span>{isZh ? '完成' : 'done'} {doneCount}/8</span>
                                  <span>versions {project.versionCount}</span>
                                </div>
                              </div>
                            )}
                            <ActionBar className="flex-wrap" align="left">
                              <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Library size={14} />} onClick={() => handleRoute(project, 'assets')}>资产</ActionButton>
                              <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<ImageIcon size={14} />} onClick={() => handleRoute(project, 'image')}>图像</ActionButton>
                              <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Film size={14} />} onClick={() => handleRoute(project, 'video')}>视频</ActionButton>
                              <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Layers3 size={14} />} onClick={() => handleRoute(project, 'frame-prompt')}>逐镜</ActionButton>
                              <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Clapperboard size={14} />} onClick={() => handleRoute(project, 'seedance')}>Seedance</ActionButton>
                            </ActionBar>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </Panel>
      )}
    </PageShell>
  );
}
