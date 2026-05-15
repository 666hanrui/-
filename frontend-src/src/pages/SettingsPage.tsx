import { CheckCircle2, Cpu, Database, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTudouBridge } from "../hooks/useTudouBridge";
import { useAppStore } from "../store/useAppStore";
import type { AppSettings } from "../types/tudou";

const emptySettings: AppSettings = {
  textEndpoint: "",
  textKey: "",
  textModel: "",
  textMode: "openai",
  imageEndpoint: "",
  imageKey: "",
  imageModel: "",
  reviewThreshold: 90,
  enableLocalSave: true,
};

export default function SettingsPage() {
  const { invoke } = useTudouBridge();
  const setRealm = useAppStore((state) => state.setRealm);
  const showToast = useAppStore((state) => state.showToast);

  const [settings, setSettings] = useState<AppSettings>(emptySettings);
  const [meta, setMeta] = useState<{ dbPath?: string; dataDir?: string }>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"load" | "save" | "text" | "image" | "">("");
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setRealm("cloudcity");
    load();
  }, [setRealm]);

  const load = async () => {
    setBusy("load");
    setError("");
    try {
      const [cfg, db] = await Promise.all([
        invoke<AppSettings>("getAppSettings", [], { silent: true }),
        invoke<{ dbPath: string; dataDir: string }>("getDatabaseMeta", [], { silent: true }),
      ]);
      setSettings({ ...emptySettings, ...cfg });
      setMeta(db);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || "读取设置失败");
    } finally {
      setBusy("");
    }
  };

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setBusy("save");
    setError("");
    try {
      const next = await invoke<AppSettings>("saveAppSettings", [settings], { silent: true });
      setSettings({ ...emptySettings, ...next });
      setDirty(false);
      showToast("本地设置已保存");
    } catch (err: any) {
      setError(err.message || "保存设置失败");
    } finally {
      setBusy("");
    }
  };

  const test = async (type: "text" | "image") => {
    setBusy(type);
    setTestResult(null);
    setError("");
    try {
      const payload =
        type === "text"
          ? { endpoint: settings.textEndpoint, key: settings.textKey, model: settings.textModel, mode: settings.textMode, type }
          : { endpoint: settings.imageEndpoint, key: settings.imageKey, model: settings.imageModel, mode: "openai", type };
      const result = await invoke<any>("testConnection", [payload], { timeout: 60_000 });
      setTestResult(result);
    } catch (err: any) {
      setError(err.message || "连接测试失败");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="main-panel settings-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">System Parameter Configuration</p>
          <h2>
            <Cpu size={26} /> CORE SETTINGS
          </h2>
        </div>
        <button className="btn primary" onClick={save} disabled={!dirty || busy === "save"}>
          {busy === "save" ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
          保存设置
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {testResult && <div className="notice">连接测试结果：{JSON.stringify(testResult)}</div>}

      <div className="grid two">
        <section className="card settings-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Text LLM</p>
              <h3><KeyRound size={20} /> 文本模型</h3>
            </div>
            <button className="btn cyan" onClick={() => test("text")} disabled={busy === "text"}>
              {busy === "text" ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              测试
            </button>
          </div>
          <label className="field">
            <span className="label">Endpoint</span>
            <input className="input" value={settings.textEndpoint} onChange={(event) => patch("textEndpoint", event.target.value)} placeholder="https://api.deepseek.com/v1" />
          </label>
          <label className="field">
            <span className="label">API Key</span>
            <input className="input" type="password" value={settings.textKey} onChange={(event) => patch("textKey", event.target.value)} placeholder="sk-..." />
          </label>
          <label className="field">
            <span className="label">Model</span>
            <input className="input" value={settings.textModel} onChange={(event) => patch("textModel", event.target.value)} placeholder="deepseek-reasoner" />
          </label>
          <label className="field">
            <span className="label">Mode</span>
            <select className="select" value={settings.textMode} onChange={(event) => patch("textMode", event.target.value as AppSettings["textMode"])}>
              <option value="openai">OpenAI Compatible</option>
              <option value="gemini">Gemini</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
        </section>

        <section className="card settings-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Vision Model</p>
              <h3><KeyRound size={20} /> 图像模型</h3>
            </div>
            <button className="btn cyan" onClick={() => test("image")} disabled={busy === "image"}>
              {busy === "image" ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={16} />}
              测试
            </button>
          </div>
          <label className="field">
            <span className="label">Endpoint</span>
            <input className="input" value={settings.imageEndpoint} onChange={(event) => patch("imageEndpoint", event.target.value)} />
          </label>
          <label className="field">
            <span className="label">API Key</span>
            <input className="input" type="password" value={settings.imageKey} onChange={(event) => patch("imageKey", event.target.value)} />
          </label>
          <label className="field">
            <span className="label">Model</span>
            <input className="input" value={settings.imageModel} onChange={(event) => patch("imageModel", event.target.value)} />
          </label>
          <label className="switch-row">
            <span>
              <strong>强制本地保存</strong>
              <small>生成结果写入本地 SQLite 与项目库</small>
            </span>
            <input type="checkbox" checked={settings.enableLocalSave} onChange={(event) => patch("enableLocalSave", event.target.checked)} />
          </label>
        </section>
      </div>

      <section className="card">
        <p className="eyebrow">Local Database</p>
        <h3><Database size={20} /> SQLite 归档</h3>
        <div className="grid two">
          <div className="notice">DB Path: {meta.dbPath || "未读取"}</div>
          <div className="notice">Data Dir: {meta.dataDir || "未读取"}</div>
        </div>
      </section>
    </div>
  );
}
