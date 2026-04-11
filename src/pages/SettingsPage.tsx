import React, { useEffect, useState } from 'react';
import {
  fetchFlags,
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

const suggestedSettingKeys = [
  'app_title',
  'home_hero_title',
  'home_hero_subtitle',
  'home_quick_access_subtitle',
  'default_mushaf_edition',
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [settingsMeta, setSettingsMeta] = useState<PaginationMeta | null>(null);
  const [flagsMeta, setFlagsMeta] = useState<PaginationMeta | null>(null);
  const [settingsPage, setSettingsPage] = useState(1);
  const [flagsPage, setFlagsPage] = useState(1);
  const [settingKey, setSettingKey] = useState(suggestedSettingKeys[0]);
  const [settingValue, setSettingValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pageSize = 10;

  const refresh = (nextSettingsPage = settingsPage, nextFlagsPage = flagsPage) => {
    Promise.all([
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

  useEffect(() => {
    refresh(settingsPage, flagsPage);
  }, []);

  const handleSave = async () => {
    if (!settingKey.trim()) {
      setError('Setting key is required.');
      return;
    }

    const existing = settings.find((item) => item.key === settingKey.trim());
    setBusy(true);
    setError(null);
    try {
      await upsertSetting({
        id: existing?.id,
        key: settingKey.trim(),
        value: settingValue,
      });
      setSettingValue('');
      refresh(settingsPage, flagsPage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = (setting: Setting) => {
    setSettingKey(setting.key);
    setSettingValue(setting.value);
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
            <h2 className={cardTitleClass}>Save Setting</h2>
            <p className={cardSubtitleClass}>
              AI provider, model, endpoint, reader defaults, and home copy can all be driven from here.
            </p>
          </div>
        </div>
        <div className="mb-4 rounded-2xl border border-[rgba(214,165,75,0.18)] bg-[linear-gradient(135deg,#f8edd3,#fff5de)] px-4 py-3.5 text-sm text-[#76541a]">
          Do not store private provider secrets in public settings. Mobile apps receive public config directly.
        </div>
        <div className={pillRowClass}>
          {suggestedSettingKeys.map((item) => (
            <Pill key={item} asButton active={settingKey === item} onClick={() => setSettingKey(item)}>
              {item}
            </Pill>
          ))}
        </div>
        <div className={`${formRowClass} mt-4`}>
          <FieldLabel label="Key">
            <Input
              list="setting-key-suggestions"
              value={settingKey}
              onChange={(e) => setSettingKey(e.target.value)}
              placeholder="app_title"
            />
            <datalist id="setting-key-suggestions">
              {suggestedSettingKeys.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </FieldLabel>
          <FieldLabel label="Value">
            <Input value={settingValue} onChange={(e) => setSettingValue(e.target.value)} placeholder="Enter setting value" />
          </FieldLabel>
        </div>
        <div className={formActionsClass}>
          <Button disabled={busy} onClick={handleSave}>
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
