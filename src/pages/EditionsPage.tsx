import React, { useEffect, useState } from 'react';
import {
  fetchEditions,
  type PaginationMeta,
  toggleEdition,
  upsertEdition,
} from '../api';
import PaginationControls from '../components/PaginationControls';
import PageIntro from '../components/PageIntro';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  FieldLabel,
  Input,
  Select,
  StatusPill,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  formActionsClass,
  formRowClass,
  pageStackClass,
  sectionGridClass,
} from '../components/ui';

type Edition = { id: number; key: string; label: string; enabled: boolean };

export default function EditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [keyInput, setKeyInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [enabledInput, setEnabledInput] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = 8;

  const refresh = (targetPage = page) => {
    fetchEditions({ page: targetPage, pageSize })
      .then((response) => {
        setEditions(response.items);
        setMeta(response.meta);
        setPage(response.meta.page);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    refresh(1);
  }, []);

  const handleCreate = async () => {
    if (!keyInput.trim() || !labelInput.trim()) {
      setError('Edition key and label are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertEdition({
        key: keyInput.trim(),
        label: labelInput.trim(),
        enabled: enabledInput,
      });
      setKeyInput('');
      setLabelInput('');
      setEnabledInput(true);
      refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (edition: Edition) => {
    setBusy(true);
    setError(null);
    try {
      await toggleEdition(edition.id, !edition.enabled);
      refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={pageStackClass}>
      <PageIntro
        eyebrow="Editions"
        title="Quran Editions"
        description="Define which line-based Mushaf editions exist in the ecosystem and control whether they appear in the mobile app."
        badge={`${meta?.totalItems ?? editions.length} editions`}
      />
      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Add Edition</h2>
            <p className={cardSubtitleClass}>Use a stable key and a clear reader-facing label for each edition.</p>
          </div>
        </div>
        <div className={formRowClass}>
          <FieldLabel label="Key">
            <Input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="16_lines" />
          </FieldLabel>
          <FieldLabel label="Label">
            <Input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} placeholder="16 lines" />
          </FieldLabel>
          <FieldLabel label="Enabled">
            <Select
              value={enabledInput ? 'true' : 'false'}
              onChange={(e) => setEnabledInput(e.target.value === 'true')}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Select>
          </FieldLabel>
        </div>
        <div className={formActionsClass}>
          <Button disabled={busy} onClick={handleCreate}>
            Save Edition
          </Button>
        </div>
      </Card>

      {editions.length > 0 ? (
        <div className={sectionGridClass}>
          {editions.map((edition) => (
            <Card key={edition.id}>
              <div className={cardHeaderClass}>
                <div className={cardTitleGroupClass}>
                  <h2 className={cardTitleClass}>{edition.label}</h2>
                  <p className={cardSubtitleClass}>{edition.key}</p>
                </div>
                <StatusPill tone={edition.enabled ? 'active' : 'muted'}>
                  {edition.enabled ? 'Enabled' : 'Disabled'}
                </StatusPill>
              </div>
              <div className={formActionsClass}>
                <Button variant="ghost" disabled={busy} onClick={() => handleToggle(edition)}>
                  {edition.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState>No editions created yet.</EmptyState>
      )}
      <PaginationControls meta={meta} onPageChange={refresh} />
    </section>
  );
}
