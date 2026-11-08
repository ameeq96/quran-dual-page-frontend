import React, { useEffect, useRef, useState } from 'react';
import {
  fetchFlags,
  fetchSettingByKey,
  fetchSettings,
  type PaginationMeta,
  toggleFlag,
  upsertSetting,
} from '../api';
import PaginationControls from '../components/PaginationControls';
import PageIntro from '../components/PageIntro';
import {
  Button,
  Card,
  ErrorBanner,
  FieldLabel,
  Input,
  Pill,
  StatusPill,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  formActionsClass,
  formRowClass,
  pageStackClass,
  pillRowClass,
  tableCellClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
  tableWrapClass,
} from '../components/ui';

type Setting = { id: number; key: string; value: string };
type Flag = { id: number; key: string; enabled: boolean };
type AiProviderMode = 'ollama';
const aiDefaultModel = 'qwen3:0.6b';
const aiDefaultEndpoint = 'http://127.0.0.1:11434';

const suggestedSettingKeys = [
  'app_title',
  'home_hero_title',
  'home_hero_subtitle',
  'home_quick_access_subtitle',
  'default_mushaf_edition',
  'default_app_dark_mode',
  'default_quran_page_dark_mode',
  'default_fullscreen_reading',
  'default_show_page_numbers',
  'default_low_memory_mode',
  'default_hifz_focus_mode',
  'default_page_preset',
  'default_page_preset_enabled',
  'default_page_overlay_enabled',
  'default_page_reflection_enabled',
  'ai_provider',
  'ai_model',
  'ai_endpoint',
  'ai_secret',
  'ai_status_label',
  'ai_system_prompt',
  'ai_custom_headers_json',
  'ai_default_language',
  'ai_default_depth',
];

const aiProviderOptions: Array<{
  value: AiProviderMode;
  label: string;
  description: string;
}> = [
  {
    value: 'ollama',
    label: 'Ollama',
    description: 'Mobile app will call the backend AI proxy, which forwards to Ollama.',
  },
];

function defaultAiStatusLabel() {
  return 'Ollama qwen3:0.6b is configured for AI requests.';
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [settingsMeta, setSettingsMeta] = useState<PaginationMeta | null>(null);
  const [flagsMeta, setFlagsMeta] = useState<PaginationMeta | null>(null);
  const [settingsPage, setSettingsPage] = useState(1);
  const [flagsPage, setFlagsPage] = useState(1);
  const [settingKey, setSettingKey] = useState(suggestedSettingKeys[0]);
  const [settingValue, setSettingValue] = useState('');
  const [settingLoading, setSettingLoading] = useState(false);
  const settingRequestId = useRef(0);
  const settingKeyRef = useRef(settingKey.trim());
  const settingEditRevision = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProviderMode>('ollama');
  const [aiStatusLabel, setAiStatusLabel] = useState('');

  const pageSize = 10;

  const refresh = (nextSettingsPage = settingsPage, nextFlagsPage = flagsPage) => {
    return Promise.all([
      fetchSettings({ page: nextSettingsPage, pageSize }),
      fetchFlags({ page: nextFlagsPage, pageSize }),
    ])
      .then(([settingsData, flagsData]) => {
        setSettings(settingsData.items);
        setFlags(flagsData.items);
        setSettingsMeta(settingsData.meta);
        setFlagsMeta(flagsData.meta);
        setSettingsPage(settingsData.meta.page);
        setFlagsPage(flagsData.meta.page);
      })
      .catch((err: Error) => setError(err.message));
  };

  const resolveSettingRecord = async (key: string) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return null;
    }

    const localMatch = settings.find((item) => item.key === normalizedKey);
    if (localMatch) {
      return localMatch;
    }

    return fetchSettingByKey(normalizedKey);
  };

  const changeSettingKey = (nextKey: string) => {
    settingRequestId.current += 1;
    settingKeyRef.current = nextKey.trim();
    setSettingKey(nextKey);
    setSettingLoading(false);
  };

  const changeSettingValue = (nextValue: string) => {
    settingEditRevision.current += 1;
    setSettingValue(nextValue);
  };

  const loadSettingValue = async (nextKey: string) => {
    const normalizedKey = nextKey.trim();
    const requestId = ++settingRequestId.current;
    const editRevision = settingEditRevision.current;
    settingKeyRef.current = normalizedKey;
    setSettingKey(nextKey);
    if (!normalizedKey) {
      setSettingValue('');
      setSettingLoading(false);
      return;
    }

    setSettingLoading(true);
    try {
      const matchedSetting = await fetchSettingByKey(normalizedKey);
      if (requestId === settingRequestId.current &&
          normalizedKey === settingKeyRef.current &&
          editRevision === settingEditRevision.current) {
        setSettingValue(matchedSetting?.value ?? '');
      }
    } catch (err) {
      if (requestId === settingRequestId.current) {
        setError((err as Error).message);
      }
    } finally {
      if (requestId === settingRequestId.current) {
        setSettingLoading(false);
      }
    }
  };

  const loadAiRuntime = async () => {
    try {
      const statusLabelSetting = await fetchSettingByKey('ai_status_label');
      const statusLabel = statusLabelSetting?.value?.trim();
      setAiStatusLabel(
        !statusLabel || /^(Ollama|ChatGPT|Custom AI endpoint|Local assistant) is active in the mobile app\.$/.test(statusLabel)
          ? defaultAiStatusLabel()
          : statusLabel,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const saveSettingByKey = async (key: string, value: string) => {
    const existing = await resolveSettingRecord(key);
    return upsertSetting({
      id: existing?.id,
      key,
      value,
    });
  };

  const handleSaveAiRuntime = async () => {
    const editRevision = settingEditRevision.current;
    setBusy(true);
    setError(null);
    try {
      const normalizedProvider = aiProvider;
      await Promise.all([
        saveSettingByKey('ai_provider', normalizedProvider),
        saveSettingByKey('ai_model', aiDefaultModel),
        saveSettingByKey('ai_endpoint', aiDefaultEndpoint),
        saveSettingByKey(
          'ai_status_label',
          aiStatusLabel.trim() || defaultAiStatusLabel(),
        ),
      ]);
      await Promise.all([
        refresh(settingsPage, flagsPage),
        loadAiRuntime(),
        editRevision === settingEditRevision.current
          ? loadSettingValue(settingKeyRef.current)
          : Promise.resolve(),
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selectedAiProviderMeta =
    aiProviderOptions.find((option) => option.value === aiProvider) ??
    aiProviderOptions[0];

  useEffect(() => {
    if (aiStatusLabel.trim().length === 0) {
      setAiStatusLabel(defaultAiStatusLabel());
      return;
    }
  }, [aiProvider, aiStatusLabel]);

  useEffect(() => {
    refresh(settingsPage, flagsPage);
    void loadAiRuntime();
  }, []);

  useEffect(() => {
    void loadSettingValue(settingKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (settingLoading) return;
    const savedKey = settingKey.trim();
    const editRevision = settingEditRevision.current;
    if (!savedKey) {
      setError('Setting key is required.');
      return;
    }
    if ((savedKey === 'ai_provider' && settingValue.trim() !== 'ollama') ||
        (savedKey === 'ai_model' && settingValue.trim() !== aiDefaultModel) ||
        (savedKey === 'ai_endpoint' && settingValue.trim() !== aiDefaultEndpoint)) {
      setError('AI requests use only Ollama qwen3:0.6b at http://127.0.0.1:11434.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const saved = await saveSettingByKey(savedKey, settingValue);
      if (savedKey === settingKeyRef.current &&
          editRevision === settingEditRevision.current) {
        setSettingValue(saved.value);
      }
      await refresh(settingsPage, flagsPage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (setting: Setting) => {
    changeSettingKey(setting.key);
    changeSettingValue(setting.value);
  };

  const handleToggleFlag = async (flag: Flag) => {
    setBusy(true);
    setError(null);
    try {
      await toggleFlag(flag.id, !flag.enabled);
      refresh(settingsPage, flagsPage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={pageStackClass}>
      <PageIntro
        eyebrow="Settings"
        title="App Configuration"
        description="Manage public app defaults, AI routing metadata, and mobile feature gates from the dashboard."
        badge={`${flagsMeta?.totalItems ?? flags.length} flags`}
      />
      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>AI Runtime Control</h2>
            <p className={cardSubtitleClass}>
              Configure server-hosted Ollama qwen3:0.6b for AI requests. Saving configuration does not verify model availability.
            </p>
          </div>
        </div>
        <div className={pillRowClass}>
          {aiProviderOptions.map((option) => (
            <Pill
              key={option.value}
              asButton
              active={aiProvider === option.value}
              onClick={() => setAiProvider(option.value)}
            >
              {option.label}
            </Pill>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-[#59716a]">
          {selectedAiProviderMeta.description}
        </p>
        <div className={`${formRowClass} mt-4`}>
          <FieldLabel label="AI mode">
            <Input value={selectedAiProviderMeta.label} readOnly />
          </FieldLabel>
          <FieldLabel label="Model">
            <Input
              value={aiDefaultModel}
              readOnly
            />
          </FieldLabel>
          <FieldLabel label="Endpoint">
            <Input
              value={aiDefaultEndpoint}
              readOnly
            />
          </FieldLabel>
          <FieldLabel label="Status label">
            <Input
              value={aiStatusLabel}
              onChange={(e) => setAiStatusLabel(e.target.value)}
              placeholder={defaultAiStatusLabel()}
            />
          </FieldLabel>
        </div>
        <div className={formActionsClass}>
          <Button disabled={busy} onClick={handleSaveAiRuntime}>
            Apply AI Mode
          </Button>
        </div>
      </Card>

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Save Setting</h2>
            <p className={cardSubtitleClass}>
              Advanced public settings for reader defaults, prompts, copy, and power-user configuration.
            </p>
          </div>
        </div>
        <div className="mb-4 rounded-2xl border border-[rgba(214,165,75,0.18)] bg-[linear-gradient(135deg,#f8edd3,#fff5de)] px-4 py-3.5 text-sm text-[#76541a]">
          Do not store private provider secrets in public settings. Mobile apps receive public config directly.
        </div>
        <div className={pillRowClass}>
          {suggestedSettingKeys.map((item) => (
            <Pill key={item} asButton active={settingKey === item} onClick={() => void loadSettingValue(item)}>
              {item}
            </Pill>
          ))}
        </div>
        <div className={`${formRowClass} mt-4`}>
          <FieldLabel label="Key">
            <Input
              list="setting-key-suggestions"
              value={settingKey}
              onChange={(e) => changeSettingKey(e.target.value)}
              onBlur={() => void loadSettingValue(settingKey)}
              placeholder="app_title"
            />
            <datalist id="setting-key-suggestions">
              {suggestedSettingKeys.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </FieldLabel>
          <FieldLabel label="Value">
            <Input value={settingValue} onChange={(e) => changeSettingValue(e.target.value)} placeholder={settingLoading ? 'Loading setting...' : 'Enter setting value'} aria-busy={settingLoading} />
          </FieldLabel>
        </div>
        <div className={formActionsClass}>
          <Button disabled={busy || settingLoading} onClick={handleSave}>
            Save Setting
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Settings</h2>
              <p className={cardSubtitleClass}>Public key/value settings consumed by the mobile app and admin backend.</p>
            </div>
          </div>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={tableHeadClass}>Key</th>
                  <th className={tableHeadClass}>Value</th>
                  <th className={tableHeadClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <tr key={setting.id} className={tableRowClass}>
                    <td className={tableCellClass}>{setting.key}</td>
                    <td className={tableCellClass}>{setting.value}</td>
                    <td className={tableCellClass}>
                      <Button variant="ghost" onClick={() => handleEdit(setting)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            meta={settingsMeta}
            onPageChange={(nextPage) => refresh(nextPage, flagsPage)}
          />
        </Card>
        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Feature Flags</h2>
              <p className={cardSubtitleClass}>Control which app modules and tools are visible to the reader.</p>
            </div>
          </div>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={tableHeadClass}>Flag</th>
                  <th className={tableHeadClass}>Status</th>
                  <th className={tableHeadClass}>Action</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.id} className={tableRowClass}>
                    <td className={tableCellClass}>{flag.key}</td>
                    <td className={tableCellClass}>
                      <StatusPill tone={flag.enabled ? 'active' : 'muted'}>
                        {flag.enabled ? 'Enabled' : 'Disabled'}
                      </StatusPill>
                    </td>
                    <td className={tableCellClass}>
                      <Button variant="ghost" disabled={busy} onClick={() => handleToggleFlag(flag)}>
                        {flag.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            meta={flagsMeta}
            onPageChange={(nextPage) => refresh(settingsPage, nextPage)}
          />
        </Card>
      </div>
    </section>
  );
}
