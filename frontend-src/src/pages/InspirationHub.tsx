import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { BookOpen, CornerDownLeft, FileText, FolderKanban, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTudouBridge } from '../hooks/useTudouBridge';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ActionBar, { ActionButton } from '../components/ui/ActionBar';
import FormField, { TextArea, TextInput } from '../components/ui/FormField';
import ContextMetricGrid from '../components/ui/ContextMetricGrid';

export default function InspirationHub() {
  const { setRealm, setScriptSeed, setCurrentProjectId, setCurrentTaskId, showToast } = useAppStore();
  const { invoke, isLoading } = useTudouBridge();
  const navigate = useNavigate();

  const [localSeed, setLocalSeed] = useState('');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('2分钟');
  const [format, setFormat] = useState('short_drama');
  const [ultrashortMode, setUltrashortMode] = useState('vertical_short');
  const [genresText, setGenresText] = useState('短剧, 悬念, 反转');
  const [chinese, setChinese] = useState(true);
  const [master, setMaster] = useState('');
  const [importedScript, setImportedScript] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const controls = useAnimation();

  useEffect(() => {
    setRealm('cloudcity');
    setTimeout(() => textareaRef.current?.focus(), 350);
  }, [setRealm]);

  const concept = localSeed.trim() || importedScript.slice(0, 300).trim();
  const genreList = genresText.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
  const canStart = Boolean(localSeed.trim() || importedScript.trim());

  const handleIgnite = async () => {
    if (!canStart) return;
    setError('');
    const init = {
      name: name.trim() || concept.slice(0, 30),
      concept,
      duration,
      format,
      ultrashortMode,
      genres: genreList,
      chinese,
      master: master.trim() || undefined,
      importedScript: importedScript.trim() || undefined,
      path: importedScript.trim() ? 'import' : 'new',
    };

    try {
      const project = await invoke<{ projectId?: string; project_id?: string }>('project/create', init);
      const projectId = project.projectId || project.project_id || '';
      setCurrentProjectId(projectId);
      setCurrentTaskId(null);
      setScriptSeed(concept);
      showToast({ message: '工作流项目已创建', type: 'success' });
      await controls.start({ scale: 0.98, opacity: 0, filter: 'blur(16px)', transition: { duration: 0.35, ease: 'easeInOut' } });
      navigate('/workflow');
    } catch (err: any) {
      setError(err.message || '创世引擎点火失败');
    }
  };

  return (
    <PageShell maxWidth="max-w-7xl">
      <motion.div animate={controls} className="space-y-6">
        <ModuleHeader
          icon={<Sparkles size={26} />}
          eyebrow="Inspiration Hub"
          title="灵感枢纽 / 新建工作流"
          subtitle="输入核心概念或导入已有剧本，创建一个可恢复、可 finalize、可承接资产与 PromptLab 的工作流项目。"
          actions={
            <ActionBar align="right" className="flex-wrap">
              <ActionButton variant="secondary" onClick={() => navigate('/projects')} icon={<FolderKanban size={16} />}>项目库</ActionButton>
              <ActionButton variant="secondary" onClick={() => navigate('/scripts')} icon={<FileText size={16} />}>剧本任务</ActionButton>
              <ActionButton onClick={handleIgnite} disabled={!canStart || isLoading} isLoading={isLoading} icon={<Wand2 size={16} />}>开始推演</ActionButton>
            </ActionBar>
          }
        />

        <ContextMetricGrid metrics={[
          { label: 'Path', value: importedScript.trim() ? 'import' : 'new' },
          { label: 'Duration', value: duration },
          { label: 'Format', value: format, isMono: true },
          { label: 'Genres', value: genreList.length ? `${genreList.length} items` : '未设置' },
        ]} />

        {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 text-sm">{error}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          <main className="space-y-6 min-w-0">
            <Panel title="核心概念" subtitle="输入新故事的种子，或用已有剧本自动提取概念。">
              <FormField label="核心概念 concept" helperText="支持 ⌘/Ctrl + Enter 直接创建工作流。">
                <TextArea
                  ref={textareaRef as any}
                  value={localSeed}
                  onChange={(event: any) => setLocalSeed(event.target.value)}
                  onKeyDown={(event: any) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') handleIgnite(); }}
                  rows={10}
                  placeholder="例如：一个在赛博朋克废墟中寻找旧时代黑胶唱片的失明武士..."
                />
              </FormField>
            </Panel>

            <Panel title="导入已有剧本" subtitle="可选：走 import 路径启动，但仍创建同一种 workflow project。">
              <FormField label="importedScript">
                <TextArea value={importedScript} onChange={(event: any) => setImportedScript(event.target.value)} rows={10} placeholder="可选：粘贴已有剧本，项目会以 import 路径启动。" />
              </FormField>
            </Panel>
          </main>

          <aside className="space-y-6 min-w-0">
            <Panel title="项目参数" subtitle="这些字段会进入 screenplay_create_project(init)">
              <div className="space-y-4">
                <FormField label="项目名称"><TextInput value={name} onChange={(event: any) => setName(event.target.value)} placeholder="可选，不填则自动从概念生成" /></FormField>
                <FormField label="时长"><TextInput value={duration} onChange={(event: any) => setDuration(event.target.value)} /></FormField>
                <FormField label="格式"><TextInput value={format} onChange={(event: any) => setFormat(event.target.value)} /></FormField>
                <FormField label="短片模式"><TextInput value={ultrashortMode} onChange={(event: any) => setUltrashortMode(event.target.value)} /></FormField>
                <FormField label="题材 genres"><TextInput value={genresText} onChange={(event: any) => setGenresText(event.target.value)} /></FormField>
                <FormField label="大师模板 master"><TextInput value={master} onChange={(event: any) => setMaster(event.target.value)} placeholder="可选" /></FormField>
                <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white/70 text-sm">
                  <span>中文叙事 chinese</span>
                  <input type="checkbox" checked={chinese} onChange={(event) => setChinese(event.target.checked)} />
                </label>
              </div>
            </Panel>

            <Panel title="创建入口" subtitle="创建后自动进入 /workflow">
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/55 text-sm leading-relaxed">
                  创建后将写入 currentProjectId，并清空旧 currentTaskId，避免沿用其他项目的 task。
                </div>
                <ActionButton onClick={handleIgnite} disabled={!canStart || isLoading} isLoading={isLoading} icon={canStart ? <CornerDownLeft size={16} /> : <BookOpen size={16} />}>
                  开始推演
                </ActionButton>
              </div>
            </Panel>
          </aside>
        </div>
      </motion.div>
    </PageShell>
  );
}
