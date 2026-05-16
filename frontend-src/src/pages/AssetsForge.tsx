import { useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Box, Clapperboard, FileText, Film, FolderKanban, Image as ImageIcon, Loader2, Map, RefreshCw, Save, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ScriptSelector from '../components/ScriptSelector';
import { useAppStore } from '../store/useAppStore';
import { useTudouBridge } from '../hooks/useTudouBridge';
import { normalizeAssets } from '../lib/format';
import type { AssetBundle, ScriptTask } from '../types/tudou';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ContextMetricGrid from '../components/ui/ContextMetricGrid';
import ActionBar, { ActionButton } from '../components/ui/ActionBar';
import EmptyState from '../components/ui/EmptyState';
import FormField, { TextArea, TextInput } from '../components/ui/FormField';
import ResultViewer from '../components/ui/ResultViewer';

type AssetTab = 'characters' | 'scenes' | 'props';

const FIELD_MAP: Record<AssetTab, string[]> = {
  characters: ['name', 'appearance', 'clothing', 'personality', 'visualAnchor', 'aiPrompt'],
  scenes: ['name', 'atmosphere', 'materials', 'landmarks', 'colorTemperature', 'aiPrompt'],
  props: ['name', 'dramaticFunction', 'form', 'material', 'surfaceState', 'aiPrompt'],
};

const TAB_META: Record<AssetTab, { label: string; icon: any }> = {
  characters: { label: '角色', icon: Users },
  scenes: { label: '场景', icon: Map },
  props: { label: '道具', icon: Box },
};

const EMPTY: AssetBundle = { characters: [], scenes: [], props: [] };
const arr = (value: any) => (Array.isArray(value) ? value : []);
const pickTaskId = (task: ScriptTask) => task.taskId || task.task_id || task.task?.taskId || task.task?.task_id || '';

function eventLine(eventName: string, payload: any) {
  const count = payload?.count !== undefined ? ` count=${payload.count}` : '';
  const model = payload?.fallbackUsed ? ' fallback=true' : '';
  const msg = payload?.message || payload?.error || payload?.stage || payload?.assetType || '';
  return `${eventName}:${count}${model}${msg ? ` ${msg}` : ''}`;
}

export default function AssetsForge() {
  const { setRealm, currentTaskId, setCurrentTaskId, currentProjectId } = useAppStore();
  const { invoke } = useTudouBridge();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AssetTab>('characters');
  const [assets, setAssets] = useState<AssetBundle>(EMPTY);
  const [progress, setProgress] = useState<string[]>([]);
  const [busy, setBusy] = useState<'load' | 'extract' | 'save' | ''>('');
  const [error, setError] = useState('');

  useEffect(() => {
    setRealm('samurai');
  }, [setRealm]);

  useEffect(() => {
    if (currentTaskId) loadAssets(currentTaskId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTaskId]);

  useEffect(() => {
    const names = ['asset:scan-start', 'asset:scan-character', 'asset:scan-scene', 'asset:scan-prop', 'asset:scan-done', 'asset:scan-error'];
    let unlisteners: Array<() => void> = [];
    Promise.all(names.map((name) => listen(name, (event: any) => {
      const payload = event.payload || {};
      const taskId = payload.taskId || payload.task_id;
      if (taskId && currentTaskId && taskId !== currentTaskId) return;
      setProgress((prev) => [eventLine(name, payload), ...prev].slice(0, 100));
      if (name === 'asset:scan-error') {
        setError(payload.error || payload.message || '资产扫描失败');
        setBusy('');
      }
      if (name === 'asset:scan-done') {
        setBusy('');
        const doneTaskId = taskId || currentTaskId || '';
        if (doneTaskId) loadAssets(doneTaskId);
      }
    }))).then((items) => { unlisteners = items; });
    return () => unlisteners.forEach((unlisten) => unlisten());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTaskId]);

  const counts = useMemo(() => ({
    characters: arr(assets.characters).length,
    scenes: arr(assets.scenes).length,
    props: arr(assets.props).length,
  }), [assets]);

  const totalAssets = counts.characters + counts.scenes + counts.props;
  const currentStatus = busy === 'extract' ? '扫描中' : busy === 'save' ? '保存中' : busy === 'load' ? '读取中' : totalAssets > 0 ? '已有资产' : '待扫描';

  async function loadAssets(taskId = currentTaskId || '') {
    if (!taskId) return;
    setBusy('load');
    setError('');
    try {
      const rows = await invoke<any[]>('asset/get-all', { taskId }, { silent: true });
      setAssets(normalizeAssets(rows));
    } catch (err: any) {
      setError(err.message || '读取资产失败');
    } finally {
      setBusy('');
    }
  }

  async function selectScript(task: ScriptTask) {
    const taskId = pickTaskId(task);
    if (!taskId) return;
    setCurrentTaskId(taskId);
    await loadAssets(taskId);
  }

  async function extractAssets() {
    if (!currentTaskId) {
      setError('缺少 currentTaskId。请从项目库选择已成稿的 script task，或先在工作流 Step 8 finalize。');
      return;
    }
    setBusy('extract');
    setError('');
    setProgress(['asset:scan-start pending']);
    try {
      const result = await invoke<any>('asset/extract', { taskId: currentTaskId }, { timeout: 900000 });
      if (result?.characters || result?.scenes || result?.props) setAssets(normalizeAssets(result));
      await loadAssets(currentTaskId);
    } catch (err: any) {
      setError(err.message || '资产扫描失败');
      setProgress((prev) => [`asset:scan-error ${err.message || err}`, ...prev]);
    } finally {
      setBusy('');
    }
  }

  function updateField(tab: AssetTab, index: number, field: string, value: string) {
    setAssets((prev) => {
      const next: AssetBundle = { characters: [...arr(prev.characters)], scenes: [...arr(prev.scenes)], props: [...arr(prev.props)] };
      next[tab][index] = { ...next[tab][index], [field]: value };
      return next;
    });
  }

  async function saveAssets() {
    if (!currentTaskId) return;
    setBusy('save');
    setError('');
    try {
      await invoke('asset/update', {
        taskId: currentTaskId,
        characters: JSON.stringify(assets.characters || []),
        scenes: JSON.stringify(assets.scenes || []),
        props: JSON.stringify(assets.props || []),
      });
      setProgress((prev) => ['asset:update saved', ...prev]);
      await loadAssets(currentTaskId);
    } catch (err: any) {
      setError(err.message || '保存资产失败');
    } finally {
      setBusy('');
    }
  }

  const items = arr(assets[activeTab]);
  const ActiveIcon = TAB_META[activeTab].icon;

  return (
    <PageShell maxWidth="max-w-full">
      <ModuleHeader
        icon={<Library size={24} />}
        eyebrow="Asset Recovery Console"
        title="资产矩阵 / 验收工作台"
        subtitle="资产页只负责角色、场景、道具的提取、编辑和保存。图像/视频提示词继续在 PromptLab 中处理。"
        actions={
          <ActionBar align="right" className="flex-wrap">
            <ActionButton variant="secondary" onClick={() => navigate('/projects')} icon={<FolderKanban size={16} />}>项目库</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigate('/scripts')} icon={<FileText size={16} />}>剧本</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigate('/image')} disabled={!currentTaskId} icon={<ImageIcon size={16} />}>图像</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigate('/video')} disabled={!currentTaskId} icon={<Film size={16} />}>视频</ActionButton>
            <ActionButton variant="secondary" onClick={() => navigate('/seedance')} disabled={!currentTaskId} icon={<Clapperboard size={16} />}>Seedance</ActionButton>
          </ActionBar>
        }
      />

      <ContextMetricGrid metrics={[
        { label: 'Project', value: currentProjectId || '未绑定', copyable: currentProjectId || undefined, isMono: true },
        { label: 'Script Task', value: currentTaskId || '未选择', copyable: currentTaskId || undefined, isMono: true },
        { label: '资产总数', value: `${totalAssets}` },
        { label: '当前状态', value: currentStatus },
      ]} />

      {!currentTaskId && <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-100 text-sm">没有有效 script task。请从项目库选择已成稿任务，或先在工作流 Step 8 finalize。</div>}
      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6 min-h-0">
        <aside className="space-y-6 min-w-0">
          <Panel title="Script Source" subtitle="选择剧本任务作为资产扫描源" noPadding>
            <div className="p-4">
              <ScriptSelector selectedTaskId={currentTaskId} onSelect={selectScript} />
            </div>
          </Panel>

          <Panel title="扫描控制" subtitle="监听真实 asset:scan-* 事件">
            <div className="grid grid-cols-3 gap-3 mb-5">
              <MiniStat label="角色" value={counts.characters} />
              <MiniStat label="场景" value={counts.scenes} />
              <MiniStat label="道具" value={counts.props} />
            </div>
            <ActionBar className="flex-col items-stretch">
              <ActionButton onClick={extractAssets} disabled={!currentTaskId || busy === 'extract'} isLoading={busy === 'extract'} icon={<RefreshCw size={16} />}>扫描剧本资产</ActionButton>
              <ActionButton variant="secondary" onClick={() => currentTaskId && loadAssets(currentTaskId)} disabled={!currentTaskId || busy === 'load'} isLoading={busy === 'load'} icon={<RefreshCw size={16} />}>重新读取资产</ActionButton>
              <ActionButton variant="secondary" onClick={saveAssets} disabled={!currentTaskId || busy === 'save'} isLoading={busy === 'save'} icon={<Save size={16} />}>保存资产修改</ActionButton>
            </ActionBar>
          </Panel>

          <Panel title="扫描事件日志" subtitle="最近 100 条事件" noPadding>
            <ResultViewer title="ASSET EVENTS" content={progress.length ? progress.join('\n') : '等待真实资产扫描事件。'} />
          </Panel>
        </aside>

        <main className="space-y-6 min-w-0">
          <Panel
            title="资产卡片编辑"
            subtitle="角色 / 场景 / 道具三类资产可独立编辑并保存"
            actions={<ActionButton variant="secondary" onClick={saveAssets} disabled={!currentTaskId || busy === 'save'} isLoading={busy === 'save'} icon={<Save size={16} />}>保存</ActionButton>}
          >
            <div className="flex flex-wrap gap-3 mb-6">
              {(Object.keys(TAB_META) as AssetTab[]).map((tab) => {
                const Icon = TAB_META[tab].icon;
                return (
                  <ActionButton key={tab} size="sm" variant={activeTab === tab ? 'primary' : 'secondary'} onClick={() => setActiveTab(tab)} icon={<Icon size={14} />}>
                    {TAB_META[tab].label} {counts[tab]}
                  </ActionButton>
                );
              })}
            </div>

            {items.length === 0 ? (
              <EmptyState title={`暂无${TAB_META[activeTab].label}资产`} description="先点击扫描剧本资产，或从左侧选择已有 script task 后重新读取。" icon={<ActiveIcon size={30} />} />
            ) : (
              <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {items.map((item: any, index: number) => (
                  <Panel key={item.id || `${activeTab}-${index}`} title={`${TAB_META[activeTab].label} #${index + 1}`} subtitle={item.name || '未命名资产'}>
                    <div className="space-y-4">
                      {FIELD_MAP[activeTab].map((field) => (
                        <FormField key={field} label={field}>
                          {field === 'aiPrompt' ? (
                            <TextArea value={item[field] || ''} onChange={(event: any) => updateField(activeTab, index, field, event.target.value)} rows={5} />
                          ) : (
                            <TextInput value={item[field] || ''} onChange={(event: any) => updateField(activeTab, index, field, event.target.value)} />
                          )}
                        </FormField>
                      ))}
                    </div>
                  </Panel>
                ))}
              </div>
            )}
          </Panel>
        </main>
      </div>
    </PageShell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-center">
      <div className="text-white text-2xl font-black">{value}</div>
      <div className="text-white/40 text-xs mt-1">{label}</div>
    </div>
  );
}
