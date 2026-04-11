import React, { useEffect, useState } from 'react';
import {
  activateContentDataset,
  fetchContentDatasets,
  type PaginationMeta,
  uploadContentDataset,
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
  Select,
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

type Dataset = {
  id: number;
  key: string;
  version: string;
  active: boolean;
  sizeBytes: number;
  publicPath: string;
};

const DATASET_KEYS = [
  'navigation_index',
  'page_insights',
  'text_pages',
  'taj_navigation_overrides',
];

export default function ContentDatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [datasetKey, setDatasetKey] = useState(DATASET_KEYS[0]);
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = 10;

  const refresh = (targetPage = page) => {
    fetchContentDatasets({ page: targetPage, pageSize })
      .then((response) => {
        setDatasets(response.items);
        setMeta(response.meta);
        setPage(response.meta.page);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    refresh(1);
  }, []);

  const handleUpload = async () => {
    if (!file || !version.trim()) {
      setError('Pick a JSON file and version.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await uploadContentDataset(datasetKey, version.trim(), file);
      setVersion('');
      setFile(null);
      refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (item: Dataset) => {
    setBusy(true);
    setError(null);
    try {
      await activateContentDataset(item.key, item.version);
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
        eyebrow="Content"
        title="Content Datasets"
        description="Upload and activate JSON datasets that drive navigation, insights, text pages, and tajweed-related overrides."
        badge={`${meta?.totalItems ?? datasets.length} datasets`}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Upload Dataset</h2>
            <p className={cardSubtitleClass}>Every dataset version is stored remotely and can be activated without a mobile rebuild.</p>
          </div>
        </div>
        <div className={pillRowClass}>
          {DATASET_KEYS.map((item) => (
            <Pill key={item} asButton active={datasetKey === item} onClick={() => setDatasetKey(item)}>
              {item}
            </Pill>
          ))}
        </div>
        <div className={`${formRowClass} mt-4`}>
          <FieldLabel label="Dataset">
            <Select value={datasetKey} onChange={(e) => setDatasetKey(e.target.value)}>
              {DATASET_KEYS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel label="Version">
            <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2026.04.11" />
          </FieldLabel>
          <FieldLabel label="JSON file">
            <Input type="file" accept=".json,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </FieldLabel>
        </div>
        <div className={formActionsClass}>
          <Button disabled={busy} onClick={handleUpload}>
            Upload Dataset
          </Button>
        </div>
      </Card>

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Existing Datasets</h2>
            <p className={cardSubtitleClass}>Review published versions and promote the correct dataset into production.</p>
          </div>
        </div>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={tableHeadClass}>Key</th>
                <th className={tableHeadClass}>Version</th>
                <th className={tableHeadClass}>Status</th>
                <th className={tableHeadClass}>Size (MB)</th>
                <th className={tableHeadClass}>Path</th>
                <th className={tableHeadClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((item) => (
                <tr key={item.id} className={tableRowClass}>
                  <td className={tableCellClass}>{item.key}</td>
                  <td className={tableCellClass}>{item.version}</td>
                  <td className={tableCellClass}>
                    <StatusPill tone={item.active ? 'active' : 'muted'}>
                      {item.active ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </td>
                  <td className={tableCellClass}>{(item.sizeBytes / 1024 / 1024).toFixed(2)}</td>
                  <td className={tableCellClass}>{item.publicPath}</td>
                  <td className={tableCellClass}>
                    {!item.active && (
                      <Button variant="ghost" disabled={busy} onClick={() => handleActivate(item)}>
                        Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls meta={meta} onPageChange={refresh} />
      </Card>
    </section>
  );
}
