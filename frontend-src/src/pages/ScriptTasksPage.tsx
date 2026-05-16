import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, CheckCircle2, Clapperboard, FileText, Film, FolderKanban, Image as ImageIcon, Loader2, RefreshCw, Save, SearchCheck, Upload, Wand2 } from 'lucide-react';
import { useTudouBridge } from '../hooks/useTudouBridge';
import { formatDate, getProjectId, getProjectName, getScriptText, getTaskId, getUpdatedAt } from '../lib/format';
import { useAppStore } from '../store/useAppStore';
import type { ReviewResult, ScriptTask } from '../types/tudou';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ContextMetricGrid from '../components/ui/ContextMetricGrid';
import ActionBar, { ActionButton } from '../components/ui/ActionBar';
import EmptyState from '../components/ui/EmptyState';
import FormField, { TextArea, TextInput } from '../components/ui/FormField';

function parseList(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [value];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return Object.entries(parsed).map(([key, val]) => ({ key, value: val }));
    return [parsed];
  } catch {
    return value.trim() ? [value] : [];
  }
}

function normalizeReview(raw: any): ReviewResult | null {
  if (!raw) return null;
  return {
    ...raw,
    issues: raw.issues || parseList(raw.issuesJson || raw.issues_json),
    suggestions: raw.suggestions || parseList(raw.suggestionsJson || raw.suggestions_json),
    dimensions: raw.dimensions || parseList(raw.dimensionsJson || raw.dimensions_json),
  };
}

function resultTaskId(result: any) {
  return result?.taskId || result?.task_id || result?.scriptTaskId || result?.script_task_id || '';
}

function resultProjectId(result: any) {
  return result?.projectId || result?.project_id || '';
}

function itemText(item: any) {
  if (typeof item === 'string') return item;
  if (item?.key) return `${item.key}: ${typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}`;
  if (item?.title && item?.content) return `${item.title}: ${item.content}`;
  if (item?.name && item?.score !== undefined) return `${item.name}: ${item.score} ${item.comment || item.reason || ''}`;
  return JSON.stringify(item, null, 2);
}

function ReviewList({ title, items }: { title: string; items?: any[] }) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <div className="rounded-xl bg-black/25 border border-white/5 p-4 min-h-[140px]">
      <div className="text-[10px] uppercase tracking-[0.25em] text-white/35 mb-3">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-white/30">暂无内容</div>
      ) : (
        <div className="space-y-2">
          {rows.map((item, index) => (
            <div key={index} className="rounded-lg bg-white/[0.04] border border-white/[0.05] px-3 py-2 text-sm text-white/75 leading-relaxed">
              {itemText(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScriptTasksPage() {
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const setRealm = useAppStore((state) => state.setRealm);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const currentTaskId = useAppStore((state) => state.currentTaskId);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setCurrentProjectId = useAppStore((state) => state.setCurrentProjectId);
  const showToast = useAppStore((state) => state.showToast);

  const [tasks, setTasks] = useState<ScriptTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScriptTask | null>(null);
  const [scriptBody, setScriptBody] = useState('');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const [mode, setMode] = useState('plot');
  const [inputSummary, setInputSummary] = useState('');
  const [genre, setGenre] = useState('短剧 / 反转 / 情绪冲突');
  const [style, setStyle] = useState('强钩子、快节奏、适合短视频连续剧');
  const [duration, setDuration] = useState('2分钟');
  const [audience, setAudience] = useState('短视频观众');
  const [tone, setTone] = useState('强冲突、强反转、强情绪');
  const [ending, setEnding] = useState('结尾反转并留下下一集钩子');
  const [outputMode, setOutputMode] = useState('full_script');
  const [episodes, setEpisodes] = useState('1');
  const [customStyle, setCustomStyle] = useState('');
  const [importBody, setImportBody] = useState('');

  const selectedTaskId = getTaskId(selectedTask);
  const selectedProjectId = selectedTask ? getProjectId(selectedTask) : currentProjectId || '';
  const bodyLength = scriptBody.trim().length;
  const taskStatus = busy ? `处理中：${busy}` : selectedTaskId ? '已选择剧本任务' : '待选择 / 待创建';
  const reviewStatus = review ? `${review.score ?? 'N/A'} · ${review.status || 'done'}` : '未审核';

  const selectedTaskTitle = useMemo(() => {
    if (!selectedTask) return '尚未选择任务';
    return getProjectName(selectedTask) || selectedTaskId || '未命名剧本任务';
  }, [selectedTask, selectedTaskId]);

  useEffect(() => {
    setRealm('valley');
    loadTasks(currentTaskId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRealm]);

  useEffect(() => {
    if (currentTaskId && currentTaskId !== selectedTaskId) {
      const hit = tasks.find((task) => getTaskId(task) === currentTaskId);
      if (hit) selectTask(hit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTaskId, tasks.length]);

  async function loadTasks(selectId?: string) {
    setBusy('load');
    setError('');
    try {
      const rows = await invoke<ScriptTask[]>('script/recent', {}, { silent: true });
      const list = Array.isArray(rows) ? rows : [];
      setTasks(list);
      const targetId = selectId || currentTaskId || '';
      if (targetId) {
        const hit = list.find((item) => getTaskId(item) === targetId);
        if (hit) await selectTask(hit);
      }
    } catch (err: any) {
      setError(err.message || '读取剧本任务失败');
    } finally {
      setBusy('');
    }
  }

  async function selectTask(task: ScriptTask) {
    const taskId = getTaskId(task);
    if (!taskId) return;
    setBusy('load');
    setError('');
    try {
      const full = await invoke<ScriptTask>('script/load', { taskId }, { silent: true });
      const merged = { ...task, ...full };
      setSelectedTask(merged);
      setScriptBody(getScriptText(merged));
      setReview(normalizeReview((merged as any).review));
      setCurrentTaskId(taskId);
      const projectId = getProjectId(merged) || getProjectId(task);
      if (projectId) setCurrentProjectId(projectId);
    } catch (err: any) {
      setError(err.message || '读取剧本详情失败');
    } finally {
      setBusy('');
    }
  }

  async function selectCreatedResult(result: ScriptTask | any, fallbackBody = '') {
    const taskId = resultTaskId(result) || getTaskId(result);
    const projectId = resultProjectId(result) || getProjectId(result);
    if (taskId) setCurrentTaskId(taskId);
    if (projectId) setCurrentProjectId(projectId);
    await loadTasks(taskId);
    if (taskId) {
      setSelectedTask(result);
      setScriptBody(getScriptText(result) || fallbackBody);
    }
  }

  async function saveDraft() {
    setBusy('draft');
    setError('');
    try {
      const result = await invoke<any>('script/save-draft', { mode, input_summary: inputSummary, genre, style, duration });
      await selectCreatedResult(result);
      showToast('剧本草稿已保存');
    } catch (err: any) {
      setError(err.message || '保存草稿失败');
    } finally {
      setBusy('');
    }
  }

  async function generateScript() {
    if (!inputSummary.trim()) return setError('请先填写剧情描述');
    setBusy('generate');
    setError('');
    try {
      const result = await invoke<ScriptTask>('script/generate', {
        mode,
        duration,
        inputSummary,
        stylePreset: style,
        genres: genre,
        audience,
        tone,
        ending,
        outputMode,
        episodes,
        customStyle,
        existingProjectId: selectedTask ? getProjectId(selectedTask) : undefined,
        existingTaskId: selectedTask ? getTaskId(selectedTask) : undefined,
      }, { timeout: 900000 });
      const body = getScriptText(result) || (result.sections || []).map((section: any) => section.content || '').join('\n\n');
      await selectCreatedResult(result, body);
      setReview(null);
      showToast('剧本生成完成');
    } catch (err: any) {
      setError(err.message || '生成剧本失败');
    } finally {
      setBusy('');
    }
  }

  async function importScript() {
    if (!importBody.trim()) return setError('请先粘贴剧本正文');
    setBusy('import');
    setError('');
    try {
      const result = await invoke<ScriptTask>('script/import', { script_body: importBody, input_summary: inputSummary || importBody.slice(0, 180), duration });
      await selectCreatedResult(result, getScriptText(result) || importBody);
      setReview(null);
      setImportBody('');
      showToast('剧本已导入');
    } catch (err: any) {
      setError(err.message || '导入剧本失败');
    } finally {
      setBusy('');
    }
  }

  async function saveBody() {
    if (!selectedTaskId) return;
    setBusy('save');
    setError('');
    try {
      await invoke('script/update-body', { taskId: selectedTaskId, newBody: scriptBody }, { silent: true });
      showToast('剧本正文已保存');
      await loadTasks(selectedTaskId);
    } catch (err: any) {
      setError(err.message || '保存正文失败');
    } finally {
      setBusy('');
    }
  }

  async function runReview() {
    if (!selectedTaskId) return;
    setBusy('review');
    setError('');
    try {
      await invoke('script/update-body', { taskId: selectedTaskId, newBody: scriptBody }, { silent: true });
      const result = await invoke<ReviewResult>('script/review', { taskId: selectedTaskId }, { timeout: 900000 });
      setReview(normalizeReview(result));
      showToast('剧本审核完成');
      await loadTasks(selectedTaskId);
    } catch (err: any) {
      setError(err.message || '剧本审核失败');
    } finally {
      setBusy('');
    }
  }

  function goNext(path: string) {
    if (!selectedTaskId) return setError('请先选择、生成或导入一个 script task');
    setCurrentTaskId(selectedTaskId);
    const projectId = getProjectId(selectedTask || undefined);
    if (projectId) setCurrentProjectId(projectId);
    navigate(path);
  }

  const taskItems = tasks.map((task) => {
    const taskId = getTaskId(task);
    return { task, taskId, title: getProjectName(task) || taskId || '未命名任务' };
  });

  return (
    <PageShell maxWidth="max-w-full">
      <ModuleHeader
        icon={<FileText size={24} />}
        eyebrow="Script Recovery Console"
        title="剧本任务 / 验收工作台"
        subtitle="工作流 finalize、直接生成、导入已有剧本都会汇聚成同一种 script task，并承接资产、图像、视频和 Seedance。"
        actions={
          <ActionBar align="right" className="flex-wrap">
            <ActionButton variant="secondary" onClick={() => navigate('/projects')} icon={<FolderKanban size={16} />}>项目库</ActionButton>
            <ActionButton variant="secondary" onClick={() => goNext('/assets')} disabled={!selectedTaskId} icon={<Boxes size={16} />}>资产</ActionButton>
            <ActionButton variant="secondary" onClick={() => goNext('/image')} disabled={!selectedTaskId} icon={<ImageIcon size={16} />}>图像</ActionButton>
            <ActionButton variant="secondary" onClick={() => goNext('/video')} disabled={!selectedTaskId} icon={<Film size={16} />}>视频</ActionButton>
            <ActionButton variant="secondary" onClick={() => goNext('/seedance')} disabled={!selectedTaskId} icon={<Clapperboard size={16} />}>Seedance</ActionButton>
          </ActionBar>
        }
      />

      <ContextMetricGrid metrics={[
        { label: 'Project', value: selectedProjectId || '未绑定', copyable: selectedProjectId || undefined, isMono: true },
        { label: 'Script Task', value: selectedTaskId || '未选择', copyable: selectedTaskId || undefined, isMono: true },
        { label: '正文长度', value: `${bodyLength}` },
        { label: '审核状态', value: reviewStatus },
      ]} />

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 min-h-0">
        <aside className="space-y-6 min-w-0">
          <Panel
            title="剧本任务列表"
            subtitle={taskStatus}
            actions={<ActionButton variant="ghost" size="sm" onClick={() => loadTasks(selectedTaskId)} disabled={busy === 'load'} icon={busy === 'load' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} />}
            noPadding
          >
            {taskItems.length === 0 ? (
              <EmptyState title="暂无剧本任务" description="可以在右侧直接生成，或导入已有剧本。" icon={<FileText size={28} />} />
            ) : (
              <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar">
                {taskItems.map(({ task, taskId, title }) => (
                  <button key={taskId} onClick={() => selectTask(task)} className={`w-full text-left rounded-xl border p-3 transition-all ${selectedTaskId === taskId ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]'}`}>
                    <div className="flex items-center gap-2 text-sm font-bold text-white/90 min-w-0"><FileText size={15} className="shrink-0" /><span className="truncate">{title}</span></div>
                    <div className="mt-1 text-[11px] text-white/40 font-mono truncate">{task.mode || 'plot'} · {task.stage || 'ready'} · {formatDate(getUpdatedAt(task))}</div>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="当前任务" subtitle={selectedTaskTitle}>
            <ActionBar className="flex-wrap" align="left">
              <ActionButton size="sm" variant="secondary" onClick={() => goNext('/assets')} disabled={!selectedTaskId} icon={<Boxes size={14} />}>资产</ActionButton>
              <ActionButton size="sm" variant="secondary" onClick={() => goNext('/image')} disabled={!selectedTaskId} icon={<ImageIcon size={14} />}>图像</ActionButton>
              <ActionButton size="sm" variant="secondary" onClick={() => goNext('/video')} disabled={!selectedTaskId} icon={<Film size={14} />}>视频</ActionButton>
              <ActionButton size="sm" variant="secondary" onClick={() => goNext('/seedance')} disabled={!selectedTaskId} icon={<Clapperboard size={14} />}>Seedance</ActionButton>
            </ActionBar>
          </Panel>
        </aside>

        <main className="grid grid-cols-1 2xl:grid-cols-[1fr_420px] gap-6 min-w-0">
          <div className="space-y-6 min-w-0">
            <Panel
              title="生成新剧本"
              subtitle={selectedTaskId ? '可覆盖当前任务' : '将创建新 script task'}
              actions={<ActionButton onClick={generateScript} isLoading={busy === 'generate'} icon={<Wand2 size={16} />}>生成剧本</ActionButton>}
            >
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                <FormField label="Mode"><TextInput value={mode} onChange={(event: any) => setMode(event.target.value)} /></FormField>
                <FormField label="Duration"><TextInput value={duration} onChange={(event: any) => setDuration(event.target.value)} /></FormField>
                <FormField label="Episodes"><TextInput value={episodes} onChange={(event: any) => setEpisodes(event.target.value)} /></FormField>
                <FormField label="Genre"><TextInput value={genre} onChange={(event: any) => setGenre(event.target.value)} /></FormField>
                <FormField label="Style"><TextInput value={style} onChange={(event: any) => setStyle(event.target.value)} /></FormField>
                <FormField label="Output Mode"><TextInput value={outputMode} onChange={(event: any) => setOutputMode(event.target.value)} /></FormField>
                <FormField label="Audience"><TextInput value={audience} onChange={(event: any) => setAudience(event.target.value)} /></FormField>
                <FormField label="Tone"><TextInput value={tone} onChange={(event: any) => setTone(event.target.value)} /></FormField>
                <FormField label="Ending"><TextInput value={ending} onChange={(event: any) => setEnding(event.target.value)} /></FormField>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <FormField label="剧情描述" helperText="不走八步，直接输入剧情概念、人物冲突、目标平台和风格要求。"><TextArea value={inputSummary} onChange={(event: any) => setInputSummary(event.target.value)} rows={6} /></FormField>
                <FormField label="Custom Style" helperText="可选：补充结构、禁忌、语言、平台规则。"><TextArea value={customStyle} onChange={(event: any) => setCustomStyle(event.target.value)} rows={6} /></FormField>
              </div>
              <ActionBar className="mt-5">
                <ActionButton variant="secondary" onClick={saveDraft} isLoading={busy === 'draft'} icon={<Save size={16} />}>新建草稿</ActionButton>
                <ActionButton onClick={generateScript} isLoading={busy === 'generate'} icon={<Wand2 size={16} />}>生成剧本</ActionButton>
              </ActionBar>
            </Panel>

            <Panel title="正文编辑" subtitle="选择、生成或导入剧本后，可在这里编辑正文。" actions={<ActionBar><ActionButton variant="secondary" onClick={saveBody} disabled={!selectedTaskId} isLoading={busy === 'save'} icon={<Save size={16} />}>保存修改</ActionButton><ActionButton variant="primary" onClick={runReview} disabled={!selectedTaskId} isLoading={busy === 'review'} icon={<SearchCheck size={16} />}>运行审核</ActionButton></ActionBar>}>
              <TextArea value={scriptBody} onChange={(event: any) => setScriptBody(event.target.value)} rows={24} placeholder="选择、生成或导入剧本后，可在这里编辑正文。" />
            </Panel>
          </div>

          <aside className="space-y-6 min-w-0">
            <Panel title="导入已有剧本" subtitle="导入后会生成同一种 script_task + script_output。" actions={<ActionButton size="sm" variant="secondary" onClick={importScript} isLoading={busy === 'import'} icon={<Upload size={14} />}>导入</ActionButton>}>
              <TextArea value={importBody} onChange={(event: any) => setImportBody(event.target.value)} rows={10} placeholder="粘贴已有剧本正文。" />
            </Panel>

            {review ? (
              <Panel title="审核结果" subtitle={`Score: ${review.score ?? 'N/A'} · ${review.status || 'done'}`}>
                {review.summary && <div className="rounded-xl bg-white/[0.04] border border-white/[0.05] p-3 text-sm text-white/75 leading-relaxed mb-4">{review.summary}</div>}
                <div className="space-y-4">
                  <ReviewList title="维度评分" items={review.dimensions} />
                  <ReviewList title="问题" items={review.issues} />
                  <ReviewList title="建议" items={review.suggestions} />
                </div>
              </Panel>
            ) : (
              <Panel title="审核结果" subtitle="运行审核后显示结构化结果">
                <EmptyState title="未审核" description="保存正文后点击运行审核，结果会显示分数、问题和建议。" icon={<CheckCircle2 size={28} />} />
              </Panel>
            )}
          </aside>
        </main>
      </div>
    </PageShell>
  );
}
