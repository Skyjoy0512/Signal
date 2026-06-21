"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, FlaskConical, Save, XCircle } from "lucide-react";

type Provider = "deepseek" | "openai-compatible";

interface LlmSettingsState {
  provider: Provider;
  baseUrl: string;
  reasoningModel: string;
  workerModel: string;
  criticModel: string;
  reasoningTemperature: number;
  criticTemperature: number;
  enableCritic: boolean;
  apiKey: string;
  apiKeySet: boolean;
  apiKeyPreview: string | null;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  dailyCostLimitUsd: number;
  source: "database" | "environment";
}

const DEFAULTS: LlmSettingsState = {
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com",
  reasoningModel: "deepseek-chat",
  workerModel: "deepseek-chat",
  criticModel: "deepseek-chat",
  reasoningTemperature: 0.3,
  criticTemperature: 0.5,
  enableCritic: false,
  apiKey: "",
  apiKeySet: false,
  apiKeyPreview: null,
  inputCostPerMillion: 0,
  outputCostPerMillion: 0,
  dailyCostLimitUsd: 3,
  source: "environment",
};

const PRESETS: Record<Provider, Pick<LlmSettingsState, "baseUrl" | "reasoningModel" | "workerModel" | "criticModel">> = {
  deepseek: { baseUrl: "https://api.deepseek.com", reasoningModel: "deepseek-chat", workerModel: "deepseek-chat", criticModel: "deepseek-chat" },
  "openai-compatible": { baseUrl: "https://api.openai.com", reasoningModel: "gpt-4.1", workerModel: "gpt-4.1-mini", criticModel: "gpt-4.1" },
};

export function LlmSettingsPanel() {
  const [settings, setSettings] = useState<LlmSettingsState>(DEFAULTS);
  const [status, setStatus] = useState<string>("読み込み中");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/llm")
      .then((res) => res.json())
      .then((data) => {
        setSettings({ ...DEFAULTS, ...data, apiKey: "" });
        setStatus(data.source === "database" ? "GUI設定を使用中" : "環境変数を使用中");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "読み込み失敗"));
  }, []);

  function update<K extends keyof LlmSettingsState>(key: K, value: LlmSettingsState[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function applyPreset(provider: Provider) {
    setSettings((current) => ({ ...current, provider, ...PRESETS[provider] }));
  }

  async function save() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/llm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "保存に失敗しました");
      setSettings({ ...settings, ...data, apiKey: "" });
      setStatus("保存済み");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/llm/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await res.json();
      setTestResult(data.ok ? `接続成功: ${data.model} / ${data.latencyMs}ms` : `接続失敗: ${data.error ?? "unknown"}`);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "接続テストに失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="semantic-icon"><Bot size={18} /></span>
          <div>
            <div className="stat-label">LLM設定</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>フロンティアモデル切り替え</div>
            <p className="meaning-note">APIキーは保存時だけ送信され、画面には再表示しません。</p>
          </div>
        </div>
        <span className="badge badge-outline">{status}</span>
      </div>

      <div className="grid-cards" style={{ marginBottom: 12 }}>
        <Field label="Provider">
          <select value={settings.provider} onChange={(e) => applyPreset(e.target.value as Provider)} className="settings-input">
            <option value="deepseek">DeepSeek</option>
            <option value="openai-compatible">OpenAI compatible</option>
          </select>
        </Field>
        <Field label="Base URL">
          <input value={settings.baseUrl} onChange={(e) => update("baseUrl", e.target.value)} className="settings-input" />
        </Field>
        <Field label="Reasoning model">
          <input value={settings.reasoningModel} onChange={(e) => update("reasoningModel", e.target.value)} className="settings-input" />
        </Field>
        <Field label="Worker model">
          <input value={settings.workerModel} onChange={(e) => update("workerModel", e.target.value)} className="settings-input" />
        </Field>
        <Field label="Critic model">
          <input value={settings.criticModel} onChange={(e) => update("criticModel", e.target.value)} className="settings-input" />
        </Field>
        <Field label="API key">
          <input value={settings.apiKey} onChange={(e) => update("apiKey", e.target.value)} placeholder={settings.apiKeySet ? settings.apiKeyPreview ?? "保存済み" : "未設定"} type="password" className="settings-input" />
        </Field>
      </div>

      <div className="grid-stats" style={{ marginBottom: 12 }}>
        <NumberField label="Reasoning temp" value={settings.reasoningTemperature} onChange={(value) => update("reasoningTemperature", value)} step={0.1} />
        <NumberField label="Critic temp" value={settings.criticTemperature} onChange={(value) => update("criticTemperature", value)} step={0.1} />
        <NumberField label="Input $/1M" value={settings.inputCostPerMillion} onChange={(value) => update("inputCostPerMillion", value)} step={0.01} />
        <NumberField label="Output $/1M" value={settings.outputCostPerMillion} onChange={(value) => update("outputCostPerMillion", value)} step={0.01} />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-muted-clay)", marginBottom: 12 }}>
        <input type="checkbox" checked={settings.enableCritic} onChange={(e) => update("enableCritic", e.target.checked)} />
        Criticモデルを常時有効にする
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={save} disabled={busy}><Save size={14} />保存</button>
        <button className="btn btn-ghost" onClick={test} disabled={busy}><FlaskConical size={14} />接続テスト</button>
        {testResult ? <span className={testResult.startsWith("接続成功") ? "badge badge-outline" : "badge badge-ember"}>{testResult.startsWith("接続成功") ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{testResult}</span> : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span className="stat-label">{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (value: number) => void; step: number }) {
  return (
    <Field label={label}>
      <input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} className="settings-input" />
    </Field>
  );
}
