import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Cpu, Database, HardDrive, Key, Link, Save, ShieldAlert, TestTube2 } from 'lucide-react';
import { useTudouBridge } from '../hooks/useTudouBridge';
import PageShell from '../components/ui/PageShell';
import ModuleHeader from '../components/ui/ModuleHeader';
import Panel from '../components/ui/Panel';
import ContextMetricGrid from '../components/ui/ContextMetricGrid';
import ActionBar, { ActionButton } from '../components/ui/ActionBar';
import FormField, { TextInput } from '../components/ui/FormField';
import ResultViewer from '../components/ui/ResultViewer';

export default function Settings() {
  const { invoke, isLoading } = useTudouBridge();
  const [config, setConfig] = useState({
    textEndpoint: '',
    textKey: '',
    textModel: 'deepseek-reasoner',
    textMode: 'openai',
    imageEndpoint: '',
    imageKey: '',
    imageModel: '',
    reviewThreshold: 90,
    enableLocalSave: true,
  });
  const [appVersion, setAppVersion] = useState('');
  const [dbMeta, setDbMeta] = useState<{ dbPath?: string; dataDir?: string }>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const [res, version, meta] = await Promise.all([
          invoke<any>('config/get', {}, { silent: true }).catch(() => null),
          invoke<string>('app/version', {}, { silent: true }).catch(() => ''),
          invoke<any>('database/meta', {}, { silent: true }).catch(() => null),
        ]);
        if (res) setConfig((prev) => ({ ...prev, ...res }));
        if (version) setAppVersion(version);
        if (meta) setDbMeta(meta);
      } catch {}
    };
    fetchConfig();
  }, [invoke]);

  const updateConfig = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSavedStatus(false);
  };

  const handleDeploy = async () => {
    setError('');
    try {
      await invoke('config/set', config);
      setIsDirty(false);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2200);
    } catch (err: any) {
      setError(err.message || '参数覆写失败');
    }
  };

  const testTextConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError('');
    try {
      const result = await invoke('config/test', {
        endpoint: config.textEndpoint,
        key: config.textKey,
        model: config.textModel,
        mode: config.textMode,
      }, { timeout: 30000 });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message || '连接测试失败' });
    } finally {
      setIsTesting(false);
    }
  };

  const maskedKey = (value: string) => value ? `${value.slice(0, 4)}••••${value.slice(-4)}` : '未配置';

  return (
    <PageShell maxWidth="max-w-7xl">
      <ModuleHeader
        icon={<Cpu size={28} />}
        eyebrow="Core Settings"
        title="核心设置 / 本地配置"
        subtitle="配置文本模型、视觉模型、本地数据库与审核阈值。API Key 仅进入本地设置，不写入 prompt 审计日志。"
        actions={<ActionBar align="right"><ActionButton onClick={handleDeploy} disabled={!isDirty || isLoading} isLoading={isLoading} icon={savedStatus ? <CheckCircle2 size={16} /> : <Save size={16} />}>{savedStatus ? '已保存' : '保存配置'}</ActionButton></ActionBar>}
      />

      <ContextMetricGrid metrics={[{ label: 'Version', value: appVersion || 'unknown', isMono: true }, { label: 'Text Model', value: config.textModel || '未配置', isMono: true }, { label: 'Text Key', value: maskedKey(config.textKey), isMono: true }, { label: 'Local Save', value: config.enableLocalSave ? 'enabled' : 'disabled' }]} />

      {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-200 text-sm">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6 min-w-0">
          <Panel title="文本模型配置" subtitle="TEXT GENERATION / LLM" actions={<ActionButton size="sm" variant="secondary" onClick={testTextConnection} disabled={isTesting} isLoading={isTesting} icon={<TestTube2 size={14} />}>测试连接</ActionButton>}>
            <div className="space-y-4">
              <FormField label="Endpoint URL"><TextInput value={config.textEndpoint} onChange={(event: any) => updateConfig('textEndpoint', event.target.value)} placeholder="https://api.deepseek.com/v1" /></FormField>
              <FormField label="Access Key"><TextInput type="password" value={config.textKey} onChange={(event: any) => updateConfig('textKey', event.target.value)} placeholder="sk-..." /></FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Model"><TextInput value={config.textModel} onChange={(event: any) => updateConfig('textModel', event.target.value)} /></FormField>
                <FormField label="Mode"><TextInput value={config.textMode} onChange={(event: any) => updateConfig('textMode', event.target.value)} /></FormField>
              </div>
              {testResult && <ResultViewer title="TEXT MODEL TEST" content={JSON.stringify(testResult, null, 2)} />}
            </div>
          </Panel>

          <Panel title="视觉模型配置" subtitle="VISUAL GENERATION">
            <div className="space-y-4">
              <FormField label="Endpoint URL"><TextInput value={config.imageEndpoint} onChange={(event: any) => updateConfig('imageEndpoint', event.target.value)} placeholder="Endpoint URL" /></FormField>
              <FormField label="Access Key"><TextInput type="password" value={config.imageKey} onChange={(event: any) => updateConfig('imageKey', event.target.value)} placeholder="Access Key" /></FormField>
              <FormField label="Image Model"><TextInput value={config.imageModel} onChange={(event: any) => updateConfig('imageModel', event.target.value)} placeholder="Image Model" /></FormField>
            </div>
          </Panel>
        </div>

        <div className="space-y-6 min-w-0">
          <Panel title="本地持久化与诊断" subtitle="LOCAL STORAGE / SQLITE" actions={<HardDrive size={18} className="text-cyan-300" />}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-white font-bold mb-3"><Database size={16} /> 数据库路径</div>
                <ResultViewer title="DATABASE META" content={JSON.stringify(dbMeta, null, 2)} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <div className="text-white font-bold text-sm">强制实体化保存</div>
                  <div className="text-white/35 text-xs mt-1">enableLocalSave · 触发 SQLite 引擎写入磁盘</div>
                </div>
                <button type="button" onClick={() => updateConfig('enableLocalSave', !config.enableLocalSave)} className={`w-14 h-8 rounded-full p-1 transition-colors ${config.enableLocalSave ? 'bg-cyan-500' : 'bg-white/10'}`}>
                  <span className={`block w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${config.enableLocalSave ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <FormField label="审核阈值 reviewThreshold"><TextInput type="number" value={config.reviewThreshold} onChange={(event: any) => updateConfig('reviewThreshold', Number(event.target.value))} /></FormField>
            </div>
          </Panel>

          <Panel title="配置边界" subtitle="LOCAL ONLY" actions={<ShieldAlert size={18} className="text-rose-300" />}>
            <div className="space-y-3 text-sm text-white/55 leading-relaxed">
              <p>文本模型与视觉模型 endpoint 来自用户配置。</p>
              <p>业务提示词来自本地 prompt 文件，不在页面内改写。</p>
              <p>API Key 只进入本地配置，不写入 prompt dump、prompt audit 或业务日志。</p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <BoundaryItem icon={<Link size={14} />} label="Endpoint" value={config.textEndpoint || '未配置'} />
              <BoundaryItem icon={<Key size={14} />} label="Text Key" value={maskedKey(config.textKey)} />
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}

function BoundaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3 min-w-0"><div className="flex items-center gap-2 text-white/35 text-[10px] uppercase tracking-widest mb-2">{icon}{label}</div><div className="text-white/80 text-xs font-mono truncate" title={value}>{value}</div></div>;
}
