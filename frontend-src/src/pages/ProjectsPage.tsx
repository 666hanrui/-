import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Trash2, Edit2, Play, FileText, Library, Image as ImageIcon, Film, Clapperboard, Clock, Loader2, Check, X } from 'lucide-react';
import { useTudouBridge } from '../hooks/useTudouBridge';
import { useAppStore } from '../store/useAppStore';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ContextMetricGrid from '../components/ui/ContextMetricGrid';
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
}

export default function ProjectsPage() {
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const { setCurrentProjectId, setCurrentTaskId, setScriptSeed, setCurrentStep, setRealm, language, showToast } = useAppStore();
  const isZh = language === 'zh';

  const [projects, setProjects] = useState<ArchiveProject[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const taskIdOf = (task: any) => task?.taskId || task?.task_id || task?.id || '';

  const primaryScriptTask = (project: ArchiveProject) => {
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
    };
  };

  const normalizeScreenplayProject = (summary: any): ArchiveProject | null => {
    const init = summary.init || {};
    const projectId = summary.projectId || summary.project_id || summary.id;
    if (!projectId) return null;

    const linkedTaskId = summary.scriptTaskId || summary.script_task_id || summary.linkedScriptTaskId || summary.linked_script_task_id;

    return {
      projectId,
      projectName: init.name || summary.name || init.concept || summary.concept || projectId,
      moduleType: 'workflow',
      status: summary.currentStep || summary.current_step ? `Step ${summary.currentStep || summary.current_step}` : 'workflow',
      latestDate: String(summary.updatedAt || summary.updated_at || ''),
      taskCount: linkedTaskId ? 1 : 0,
      tasks: linkedTaskId ? [{ taskId: linkedTaskId, moduleType: 'script', stage: 'workflow-finalized', mode: 'workflow', updatedAt: summary.updatedAt || summary.updated_at }] : [],
      source: 'screenplay',
      raw: summary,
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
    setCurrentProjectId(project.projectId);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || init.name || project.projectName);
    setCurrentStep(Math.max(0, Number(project.raw?.currentStep || project.raw?.current_step || 1) - 1));
    const taskId = primaryScriptTask(project);
    setCurrentTaskId(taskId ? taskId : null);
    navigate('/workflow');
  };

  const openTask = (project: ArchiveProject, stage: 'scripts' | 'assets' | 'image' | 'video' | 'seedance') => {
    setCurrentProjectId(project.source === 'screenplay' ? project.projectId : null);
    const taskId = primaryScriptTask(project);
    setCurrentTaskId(taskId ? taskId : null);
    const init = project.raw?.init || {};
    setScriptSeed(init.concept || init.name || project.projectName);
    navigate(`/${stage}`);
  };

  const handleRoute = (project: ArchiveProject, stage: 'workflow' | 'scripts' | 'assets' | 'image' | 'video' | 'seedance') => {
    if (stage === 'workflow') openWorkflowProject(project);
    else openTask(project, stage);
  };

  return (
    <PageShell maxWidth="max-w-full">
      <ModuleHeader
        icon={<FolderKanban size={24} />}
        eyebrow="System Console"
        title={isZh ? '项目控制台' : 'Project Console'}
        subtitle={isZh ? '统一的数据恢复与项目流转中枢。选择项目即可衔接到工作流、剧本、资产、Prompt 或 Seedance。' : 'Unified recovery and routing center. Select a project to resume your workspace.'}
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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
          {projects.map((project) => {
            const editKey = `${project.source}:${project.projectId}`;
            const isRenaming = renameId === editKey;
            const taskId = primaryScriptTask(project);
            const hasTask = Boolean(taskId);
            const shortProjectId = project.projectId ? project.projectId.split('-')[0] : 'N/A';
            const shortTaskId = taskId ? taskId.split('-')[0] : 'N/A';
            const isWorkflowProject = project.source === 'screenplay';

            return (
              <Panel
                key={editKey}
                title={isRenaming ? (
                  <div className="flex items-center gap-2">
                    <TextInput value={renameValue} onChange={(event: any) => setRenameValue(event.target.value)} autoFocus />
                    <ActionButton size="sm" variant="ghost" onClick={cancelRename} icon={<X size={14} />} />
                    <ActionButton size="sm" variant="primary" onClick={() => saveRename(project)} icon={<Check size={14} />} />
                  </div>
                ) : project.projectName}
                subtitle={!isRenaming && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className={`px-2 py-0.5 rounded font-mono ${project.source === 'screenplay' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-cyan-500/20 text-cyan-300'}`}>{project.source === 'screenplay' ? 'WORKFLOW' : 'SQLITE / TASK'}</span>
                    <span className="flex items-center gap-1 text-white/40"><Clock size={10} /> {project.latestDate ? new Date(project.latestDate).toLocaleString() : 'N/A'}</span>
                  </div>
                )}
                actions={!isRenaming && (
                  <>
                    <ActionButton variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => startRename(project)} title={isZh ? '重命名' : 'Rename'} />
                    <ActionButton variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => removeProject(project)} title={isZh ? '删除' : 'Delete'} />
                  </>
                )}
              >
                <div className="flex flex-col gap-6">
                  <ContextMetricGrid metrics={[
                    { label: 'Project ID', value: shortProjectId, copyable: project.source === 'screenplay' ? project.projectId : undefined, isMono: true },
                    { label: 'Script Task ID', value: shortTaskId, copyable: taskId || undefined, isMono: true },
                    { label: isZh ? '工作流进度' : 'WF Stage', value: project.source === 'screenplay' ? project.status : '非工作流项目' },
                    { label: isZh ? '任务状态' : 'Task Status', value: hasTask ? (isZh ? '已就绪' : 'Ready') : (isZh ? '未绑定' : 'Pending') },
                  ]} />

                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-bold text-white/50 tracking-widest uppercase border-b border-white/5 pb-2 mb-1">{isZh ? '恢复入口' : 'Recovery Entrypoints'}</div>
                    <ActionBar className="flex-wrap" align="left">
                      <ActionButton size="sm" variant={isWorkflowProject ? 'primary' : 'ghost'} disabled={!isWorkflowProject} icon={<Play size={14} />} onClick={() => handleRoute(project, 'workflow')} title={!isWorkflowProject ? '这不是 WORKFLOW 项目，不能恢复 Step 1-8' : '恢复 Step 1-8 八步工作流'}>恢复八步工作流</ActionButton>
                      <div className="w-px h-6 bg-white/10 mx-1" />
                      <ActionButton size="sm" variant={hasTask ? 'primary' : 'secondary'} icon={<FileText size={14} />} onClick={() => handleRoute(project, 'scripts')}>剧本任务</ActionButton>
                      <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Library size={14} />} onClick={() => handleRoute(project, 'assets')} title={!hasTask ? '需 Script Task' : ''}>资产</ActionButton>
                      <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<ImageIcon size={14} />} onClick={() => handleRoute(project, 'image')} title={!hasTask ? '需 Script Task' : ''}>图像</ActionButton>
                      <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Film size={14} />} onClick={() => handleRoute(project, 'video')} title={!hasTask ? '需 Script Task' : ''}>视频</ActionButton>
                      <ActionButton size="sm" variant="secondary" disabled={!hasTask} icon={<Clapperboard size={14} />} onClick={() => handleRoute(project, 'seedance')} title={!hasTask ? '需 Script Task' : ''}>Seedance</ActionButton>
                    </ActionBar>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
