import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, Boxes, CheckCircle2, Circle, FileText, FolderKanban, Loader2, Stethoscope, Wand2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import StepEngine from '../components/workflow/StepEngine';
import AiDoctorPanel from '../components/workflow/AiDoctorPanel';
import { WORKFLOW_STEPS } from '../constants';
import { getActiveVersion } from '../lib/format';
import type { ProjectRecord } from '../types/tudou';
import { useTudouBridge } from '../hooks/useTudouBridge';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ContextMetricGrid from '../components/ui/ContextMetricGrid';
import ActionBar, { ActionButton } from '../components/ui/ActionBar';
import EmptyState from '../components/ui/EmptyState';

export default function WorkflowValley() {
  const {
    setRealm,
    currentStep,
    setCurrentStep,
    scriptSeed,
    setScriptSeed,
    currentProjectId,
    setCurrentProjectId,
    currentTaskId,
    setCurrentTaskId,
    isDoctorPanelOpen,
    setDoctorPanelOpen,
    showToast,
  } = useAppStore();
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const [direction, setDirection] = useState(1);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [error, setError] = useState('');
  const [staleProjectId, setStaleProjectId] = useState<string | null>(null);

  useEffect(() => {
    setRealm('valley');
  }, [setRealm]);

  const clearStaleWorkflow = (projectId: string, message: string) => {
    setProject(null);
    setStaleProjectId(projectId);
    setCurrentProjectId(null);
    setError(message);
    showToast(message);
  };

  const reloadProject = async () => {
    if (!currentProjectId) return;
    const requestedProjectId = currentProjectId;
    setIsLoadingProject(true);
    setError('');
    try {
      const next = await invoke<ProjectRecord | null>('screenplay/get', { projectId: requestedProjectId }, { silent: true });
      if (!next) {
        clearStaleWorkflow(requestedProjectId, '未找到该工作流项目。已清除失效的工作流选择，请从项目库重新选择，或继续使用已有剧本任务进入资产/Prompt 页面。');
        return;
      }
      setStaleProjectId(null);
      setProject(next);
      const init = next.init || {};
      setScriptSeed(String(init.concept || init.name || scriptSeed || ''));
      setCurrentProjectId(next.projectId || next.project_id || requestedProjectId);
      setCurrentTaskId(next.linkedScriptTaskId || next.linked_script_task_id || currentTaskId || null);
      const backendStep = Number(next.currentStep || next.current_step || 1);
      const nextIndex = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, backendStep - 1));
      setCurrentStep(nextIndex);
    } catch (err: any) {
      setError(err.message || '恢复工作流项目失败');
    } finally {
      setIsLoadingProject(false);
    }
  };

  useEffect(() => {
    reloadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  const activeStep = WORKFLOW_STEPS[currentStep] || WORKFLOW_STEPS[0];
  const activeVersion = useMemo(() => getActiveVersion(project, activeStep.id), [project, activeStep.id]);
  const doneSteps = project?.doneSteps || project?.done_steps || [];
  const completedCount = doneSteps.length;
  const backendCurrentStep = Number(project?.currentStep || project?.current_step || currentStep + 1);
  const projectTitle = String(project?.init?.name || project?.init?.concept || scriptSeed || '未命名工作流');

  const handleStepChange = (newStep: number) => {
    const safeStep = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, newStep));
    setDirection(safeStep > currentStep ? 1 : -1);
    setCurrentStep(safeStep);
  };

  const handleProjectChanged = (nextProject?: ProjectRecord | null) => {
    if (nextProject) {
      setProject(nextProject);
      const backendStep = Number(nextProject.currentStep || nextProject.current_step || activeStep.id);
      const nextIndex = Math.max(0, Math.min(WORKFLOW_STEPS.length - 1, backendStep - 1));
      setCurrentStep(nextIndex);
      if (nextProject.linkedScriptTaskId || nextProject.linked_script_task_id) {
        setCurrentTaskId(nextProject.linkedScriptTaskId || nextProject.linked_script_task_id || null);
      }
      return;
    }
    reloadProject();
  };

  if (!currentProjectId && !scriptSeed) {
    return (
      <PageShell maxWidth="max-w-5xl">
        <EmptyState
          icon={<Wand2 size={34} />}
          title="引擎缺少初始参数"
          description="请返回灵感枢纽输入宇宙碎片，或从项目库打开已有工作流项目。"
          primaryAction={<ActionButton onClick={() => navigate('/projects')} icon={<FolderKanban size={16} />}>打开项目库</ActionButton>}
          secondaryAction={<ActionButton variant="secondary" onClick={() => navigate('/')} icon={<Wand2 size={16} />}>返回枢纽</ActionButton>}
        />
      </PageShell>
    );
  }

  if (!currentProjectId && staleProjectId) {
    return (
      <PageShell maxWidth="max-w-5xl">
        <Panel title="当前工作流项目锚点已失效" subtitle="Workflow Recovery" actions={<AlertTriangle size={18} className="text-red-300" />}>
          <div className="space-y-6">
            <p className="text-white/60 text-sm leading-6">前端保存的工作流项目 ID 在当前本地项目文件目录中找不到。资产、剧本任务、Prompt 记录可能仍在 SQLite 中，不代表数据全部丢失。</p>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-100 text-sm font-mono break-all">失效 Project ID：{staleProjectId}</div>
            <ActionBar className="flex-wrap">
              <ActionButton onClick={() => navigate('/projects')} icon={<FolderKanban size={16} />}>从项目库重新选择</ActionButton>
              <ActionButton variant="secondary" onClick={() => navigate('/')} icon={<Wand2 size={16} />}>返回枢纽新建项目</ActionButton>
              <ActionButton variant="secondary" onClick={() => navigate('/scripts')} icon={<FileText size={16} />}>进入剧本任务页</ActionButton>
              <ActionButton variant="secondary" onClick={() => navigate('/assets')} disabled={!currentTaskId} icon={<Boxes size={16} />}>使用当前剧本任务进入资产</ActionButton>
            </ActionBar>
          </div>
        </Panel>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="max-w-full" className="overflow-hidden">
      <ModuleHeader
        icon={<Wand2 size={24} />}
        eyebrow="Workflow Sequence"
        title="八步工作流 / 剧本生成引擎"
        subtitle="Step 1-8 的生成、自检、保存覆写、checkpoint 与 finalize 仍由 StepEngine 执行。当前页面只负责流程外壳、上下文与恢复。"
        actions={
          <ActionBar align="right" className="flex-wrap">
            <ActionButton variant="secondary" onClick={() => navigate('/projects')} icon={<FolderKanban size={16} />}>项目库</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigate('/scripts')} icon={<FileText size={16} />}>剧本</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigate('/assets')} disabled={!currentTaskId} icon={<Boxes size={16} />}>资产</ActionButton>
            <ActionButton variant={isDoctorPanelOpen ? 'primary' : 'secondary'} onClick={() => setDoctorPanelOpen(!isDoctorPanelOpen)} icon={<Stethoscope size={16} />}>剧本诊断</ActionButton>
          </ActionBar>
        }
      />

      <ContextMetricGrid metrics={[
        { label: 'Project', value: currentProjectId || '未绑定', copyable: currentProjectId || undefined, isMono: true },
        { label: 'Script Task', value: currentTaskId || '未生成', copyable: currentTaskId || undefined, isMono: true },
        { label: 'Backend Step', value: `${backendCurrentStep}` },
        { label: 'Done Steps', value: `${completedCount}/${WORKFLOW_STEPS.length}` },
      ]} />

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 text-sm flex items-center gap-2"><AlertTriangle size={16} /> {error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 min-h-[calc(100vh-260px)]">
        <aside className="space-y-6 min-w-0">
          <Panel title="Workflow Stepper" subtitle={projectTitle} noPadding>
            <div className="p-4 max-h-[calc(100vh-360px)] overflow-y-auto custom-scrollbar space-y-3">
              {WORKFLOW_STEPS.map((step, index) => {
                const isActive = currentStep === index;
                const isCompleted = doneSteps.includes(step.id);
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepChange(index)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${isActive ? 'bg-indigo-500/20 border-indigo-500/40 shadow-[0_0_24px_rgba(99,102,241,0.15)]' : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">{isCompleted ? <CheckCircle2 size={20} className="text-indigo-300" /> : <Circle size={20} className={isActive ? 'text-indigo-300' : 'text-white/30'} />}</div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-bold truncate ${isActive ? 'text-white' : 'text-white/70'}`}>{step.title}</div>
                        <div className="text-[11px] text-white/35 mt-1 leading-5 line-clamp-2">{step.desc}</div>
                        <div className="text-[10px] text-white/25 font-mono mt-2">STEP {step.id}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Genesis Seed" subtitle="当前项目种子">
            <div className="text-sm text-white/70 leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">{scriptSeed || project?.init?.concept || project?.init?.name || '未命名项目'}</div>
          </Panel>
        </aside>

        <main className="min-w-0 relative">
          <Panel title={activeStep.title} subtitle={`Step ${activeStep.id} · ${activeStep.desc}`} className="h-full min-h-[calc(100vh-280px)]" noPadding>
            {isLoadingProject && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm"><div className="flex items-center gap-3 text-white/70 bg-black/70 border border-white/10 px-5 py-3 rounded-2xl"><Loader2 size={18} className="animate-spin" /> 正在恢复工作流状态...</div></div>}
            <AnimatePresence initial={false} mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 40 : -40, scale: 0.99, filter: 'blur(8px)' }),
                  center: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
                  exit: (dir: number) => ({ opacity: 0, y: dir > 0 ? -40 : 40, scale: 0.99, filter: 'blur(8px)' }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring' as const, stiffness: 280, damping: 32 }}
                className="w-full h-full p-4 overflow-hidden"
              >
                <StepEngine stepConfig={activeStep} isLastStep={currentStep === WORKFLOW_STEPS.length - 1} activeVersion={activeVersion} project={project} onProjectChanged={handleProjectChanged} onNext={() => handleStepChange(currentStep + 1)} />
              </motion.div>
            </AnimatePresence>
          </Panel>
        </main>
      </div>

      <AiDoctorPanel />
    </PageShell>
  );
}
