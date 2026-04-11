import React, { useEffect, useMemo, useState } from 'react';
import {
  activateAssetPack,
  assetPreviewUrl,
  AssetPackPage,
  AssetPackSummary,
  deleteAssetPage,
  fetchAssetPackPages,
  fetchAssetPacks,
  type PaginationMeta,
  importMobileAppAssets,
  updateAssetPage,
  uploadAssetPack,
  uploadAssetPage,
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
  Pill,
  Select,
  StatusPill,
  assetPageActionsClass,
  assetPageCardClass,
  assetPageGridClass,
  assetPageMetaClass,
  assetPagePreviewClass,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  formActionsClass,
  formRowClass,
  inlineActionsClass,
  managePageEditorClass,
  pageStackClass,
  pillRowClass,
  tableCellClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
  tableWrapClass,
} from '../components/ui';

const EDITIONS = ['10_line', '13_line', '14_line', '15_line', '16_line', '17_line', 'kanzul_iman'];
const DEFAULT_MOBILE_ASSETS_PATH =
  'C:\\Users\\AMEEQ EMAAD PC\\Documents\\GitHub\\qurandualpagemultilinereader\\assets\\quran_pages';

type PackDetail = {
  edition: string;
  version: string;
  active: boolean;
  pageCount: number;
  fileExtension: string;
  sizeBytes: number;
  availableImportedPages: number[];
  pages: AssetPackPage[];
  meta: PaginationMeta;
};

function packKey(edition: string, version: string) {
  return `${edition}::${version}`;
}

export default function AssetPacksPage() {
  const [packs, setPacks] = useState<AssetPackSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [zipEdition, setZipEdition] = useState(EDITIONS[0]);
  const [zipVersion, setZipVersion] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [pageEdition, setPageEdition] = useState(EDITIONS[0]);
  const [pageVersion, setPageVersion] = useState('');
  const [pageNumber, setPageNumber] = useState('1');
  const [pageFile, setPageFile] = useState<File | null>(null);
  const [importSourcePath, setImportSourcePath] = useState(DEFAULT_MOBILE_ASSETS_PATH);
  const [importVersion, setImportVersion] = useState('mobile-app-source');
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackDetail | null>(null);
  const [selectedPackPage, setSelectedPackPage] = useState(1);
  const [editingPage, setEditingPage] = useState<AssetPackPage | null>(null);
  const [editingPageNumber, setEditingPageNumber] = useState('');
  const [editingPageFile, setEditingPageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = 8;
  const packDetailPageSize = 24;

  const loadSelectedPack = async (
    edition: string,
    version: string,
    targetPage = selectedPackPage,
  ) => {
    const detail = await fetchAssetPackPages(edition, version, {
      page: targetPage,
      pageSize: packDetailPageSize,
    });
    setSelectedPack(detail);
    setSelectedPackKey(packKey(edition, version));
    setSelectedPackPage(detail.meta.page);
    setPageEdition(edition);
    setPageVersion(version);
    setEditingPage(null);
    setEditingPageFile(null);
    setEditingPageNumber('');
    return detail;
  };

  const refresh = async (targetPage = page, preserveSelection = true) => {
    try {
      const response = await fetchAssetPacks({ page: targetPage, pageSize });
      const nextPacks = response.items;
      setPacks(nextPacks);
      setMeta(response.meta);
      setPage(response.meta.page);

      if (!preserveSelection || !selectedPackKey) {
        return;
      }

      const [selectedEdition, selectedVersion] = selectedPackKey.split('::');
      await loadSelectedPack(selectedEdition, selectedVersion, selectedPackPage);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    refresh(1, false);
  }, []);

  const sortedPacks = useMemo(
    () =>
      [...packs].sort((left, right) => {
        if (left.edition !== right.edition) {
          return left.edition.localeCompare(right.edition);
        }
        return right.version.localeCompare(left.version);
      }),
    [packs],
  );

  const handleZipUpload = async () => {
    if (!zipFile || !zipVersion.trim()) {
      setError('Pick a zip file and enter a version.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await uploadAssetPack(zipEdition, zipVersion.trim(), zipFile);
      setZipVersion('');
      setZipFile(null);
      await refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePageUpload = async () => {
    const normalizedVersion = pageVersion.trim();
    const normalizedPageNumber = Number(pageNumber);

    if (!pageFile || !normalizedVersion) {
      setError('Pick an image file and enter a version.');
      return;
    }

    if (!Number.isInteger(normalizedPageNumber) || normalizedPageNumber < 1 || normalizedPageNumber > 604) {
      setError('Page number must be between 1 and 604.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await uploadAssetPage(pageEdition, normalizedVersion, normalizedPageNumber, pageFile);
      setPageFile(null);
      await loadSelectedPack(pageEdition, normalizedVersion, selectedPackPage);
      await refresh(page, false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleImportMobileAssets = async () => {
    const normalizedSourcePath = importSourcePath.trim();
    const normalizedVersion = importVersion.trim();

    if (!normalizedSourcePath || !normalizedVersion) {
      setError('Source path and version are required for mobile asset import.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await importMobileAppAssets(normalizedSourcePath, normalizedVersion);
      setSelectedPack(null);
      setSelectedPackKey(null);
      await refresh(page, false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = async (pack: AssetPackSummary) => {
    setBusy(true);
    setError(null);
    try {
      await activateAssetPack(pack.edition, pack.version);
      await refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleInspect = async (pack: AssetPackSummary) => {
    setBusy(true);
    setError(null);
    try {
      await loadSelectedPack(pack.edition, pack.version, 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePage = async (packPage: AssetPackPage) => {
    if (!selectedPack) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (editingPage?.logicalPageNumber === packPage.logicalPageNumber) {
        handleCancelEditPage();
      }
      await deleteAssetPage(
        selectedPack.edition,
        selectedPack.version,
        packPage.logicalPageNumber,
      );
      await loadSelectedPack(
        selectedPack.edition,
        selectedPack.version,
        selectedPackPage,
      );
      await refresh(page, false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStartEditPage = (packPage: AssetPackPage) => {
    setEditingPage(packPage);
    setEditingPageNumber(String(packPage.logicalPageNumber));
    setEditingPageFile(null);
    setError(null);
  };

  const handleCancelEditPage = () => {
    setEditingPage(null);
    setEditingPageNumber('');
    setEditingPageFile(null);
  };

  const handleSaveEditedPage = async () => {
    if (!selectedPack || !editingPage) {
      return;
    }

    const normalizedPageNumber = Number(editingPageNumber);
    if (
      !Number.isInteger(normalizedPageNumber) ||
      normalizedPageNumber < 1 ||
      normalizedPageNumber > 604
    ) {
      setError('Edited Quran page number must be between 1 and 604.');
      return;
    }

    if (normalizedPageNumber === editingPage.logicalPageNumber && !editingPageFile) {
      setError('Change the page number or choose a replacement image first.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateAssetPage(selectedPack.edition, selectedPack.version, editingPage.logicalPageNumber, {
        nextPageNumber: normalizedPageNumber,
        file: editingPageFile,
      });
      await loadSelectedPack(selectedPack.edition, selectedPack.version, selectedPackPage);
      await refresh(page, false);
      handleCancelEditPage();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSelectedPackPageChange = async (nextPage: number) => {
    if (!selectedPack) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await loadSelectedPack(selectedPack.edition, selectedPack.version, nextPage);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={pageStackClass}>
      <PageIntro
        eyebrow="Assets"
        title="Edition Packs"
        description="Import source page folders, upload full pack archives, replace single pages, and publish the remote image packs used by the mobile app."
        badge={`${meta?.totalItems ?? packs.length} packs`}
      />

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="grid gap-6">
        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Import Mobile App Assets</h2>
              <p className={cardSubtitleClass}>
                Pull all Quran page folders from the Flutter app source path and publish them as remote packs for API loading.
              </p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2.35fr)_minmax(250px,0.9fr)] lg:items-end">
            <FieldLabel label="Source path">
              <Input
                value={importSourcePath}
                onChange={(event) => setImportSourcePath(event.target.value)}
                placeholder="C:\\path\\to\\quran_pages"
              />
            </FieldLabel>
            <FieldLabel label="Version">
              <Input
                value={importVersion}
                onChange={(event) => setImportVersion(event.target.value)}
                placeholder="mobile-app-source"
              />
            </FieldLabel>
          </div>
          <div className={formActionsClass}>
            <Button disabled={busy} onClick={handleImportMobileAssets} type="button">
              Import App Assets
            </Button>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="h-full">
            <div className={cardHeaderClass}>
              <div className={cardTitleGroupClass}>
                <h2 className={cardTitleClass}>Upload Full Pack</h2>
                <p className={cardSubtitleClass}>Use this when you already have a full zip for one edition/version.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Edition">
                <Select value={zipEdition} onChange={(event) => setZipEdition(event.target.value)}>
                  {EDITIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FieldLabel>
              <FieldLabel label="Version">
                <Input
                  value={zipVersion}
                  onChange={(event) => setZipVersion(event.target.value)}
                  placeholder="2026.04.11"
                />
              </FieldLabel>
              <FieldLabel label="Zip file" className="md:col-span-2">
                <Input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files?.[0] ?? null)} />
              </FieldLabel>
            </div>
            <div className={formActionsClass}>
              <Button disabled={busy} onClick={handleZipUpload} type="button">
                Upload Pack
              </Button>
            </div>
          </Card>

          <Card className="h-full">
            <div className={cardHeaderClass}>
              <div className={cardTitleGroupClass}>
                <h2 className={cardTitleClass}>Upload Single Page</h2>
                <p className={cardSubtitleClass}>
                  Upload or replace one Quran page. Page number is the real Quran page, not the internal file number.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldLabel label="Edition">
                <Select value={pageEdition} onChange={(event) => setPageEdition(event.target.value)}>
                  {EDITIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FieldLabel>
              <FieldLabel label="Version">
                <Input
                  value={pageVersion}
                  onChange={(event) => setPageVersion(event.target.value)}
                  placeholder="2026.04.11"
                />
              </FieldLabel>
              <FieldLabel label="Quran page">
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={pageNumber}
                  onChange={(event) => setPageNumber(event.target.value)}
                  placeholder="84"
                />
              </FieldLabel>
              <FieldLabel label="Image file" className="md:col-span-2">
                <Input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={(event) => setPageFile(event.target.files?.[0] ?? null)}
                />
              </FieldLabel>
            </div>
            <div className={formActionsClass}>
              <Button disabled={busy} onClick={handlePageUpload} type="button">
                Upload Page
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Existing Packs</h2>
            <p className={cardSubtitleClass}>Review stored versions, inspect page uploads, and activate the correct pack.</p>
          </div>
        </div>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={tableHeadClass}>Edition</th>
                <th className={tableHeadClass}>Version</th>
                <th className={tableHeadClass}>Status</th>
                <th className={tableHeadClass}>Pages</th>
                <th className={tableHeadClass}>Format</th>
                <th className={tableHeadClass}>Size (MB)</th>
                <th className={tableHeadClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPacks.map((pack) => (
                <tr key={pack.id} className={tableRowClass}>
                  <td className={tableCellClass}>{pack.edition}</td>
                  <td className={tableCellClass}>{pack.version}</td>
                  <td className={tableCellClass}>
                    <StatusPill tone={pack.active ? 'active' : 'muted'}>
                      {pack.active ? 'Active' : 'Inactive'}
                    </StatusPill>
                  </td>
                  <td className={tableCellClass}>{pack.availableImportedPages.length || pack.pageCount}</td>
                  <td className={tableCellClass}>.{pack.fileExtension}</td>
                  <td className={tableCellClass}>{(pack.sizeBytes / 1024 / 1024).toFixed(2)}</td>
                  <td className={tableCellClass}>
                    <div className={inlineActionsClass}>
                      <Button variant="ghost" disabled={busy} onClick={() => handleInspect(pack)} type="button">
                        Manage Pages
                      </Button>
                      {!pack.active && (
                        <Button variant="ghost" disabled={busy} onClick={() => handleActivate(pack)} type="button">
                          Activate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls meta={meta} onPageChange={(nextPage) => refresh(nextPage)} />
      </Card>

      {selectedPack && (
        <Card>
          <header className="mb-[22px] flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={cardTitleClass}>Manage Pages</h2>
              <p className="m-0 text-sm leading-6 text-[#59716a]">
                {selectedPack.edition} / {selectedPack.version} / {selectedPack.meta.totalItems} uploaded pages
              </p>
            </div>
            <div className={pillRowClass}>
              <StatusPill tone={selectedPack.active ? 'active' : 'muted'}>
                {selectedPack.active ? 'Active pack' : 'Inactive pack'}
              </StatusPill>
              <Pill>.{selectedPack.fileExtension}</Pill>
            </div>
          </header>

          {editingPage && (
            <div className={managePageEditorClass}>
              <div className={cardHeaderClass}>
                <div className={cardTitleGroupClass}>
                  <h2 className={cardTitleClass}>Edit Page {editingPage.logicalPageNumber}</h2>
                  <p className={cardSubtitleClass}>
                    Change the logical Quran page number, replace the image, or do both in one save.
                  </p>
                </div>
                <StatusPill tone="info">Editing</StatusPill>
              </div>
              <div className={formRowClass}>
                <FieldLabel label="Current page">
                  <Input value={editingPage.logicalPageNumber} disabled />
                </FieldLabel>
                <FieldLabel label="New page number">
                  <Input
                    type="number"
                    min={1}
                    max={604}
                    value={editingPageNumber}
                    onChange={(event) => setEditingPageNumber(event.target.value)}
                  />
                </FieldLabel>
                <FieldLabel label="Replace image">
                  <Input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(event) => setEditingPageFile(event.target.files?.[0] ?? null)}
                  />
                </FieldLabel>
              </div>
              <div className={formActionsClass}>
                <Button disabled={busy} onClick={handleSaveEditedPage} type="button">
                  Save Page Changes
                </Button>
                <Button variant="ghost" disabled={busy} onClick={handleCancelEditPage} type="button">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {selectedPack.pages.length === 0 ? (
            <EmptyState>No pages uploaded in this version yet.</EmptyState>
          ) : (
            <>
              <div className={assetPageGridClass}>
                {selectedPack.pages.map((packPage) => (
                  <article key={packPage.fileName} className={assetPageCardClass}>
                    <img
                      src={assetPreviewUrl(packPage.relativePath)}
                      alt={`Quran page ${packPage.logicalPageNumber}`}
                      className={assetPagePreviewClass}
                    />
                    <div className={assetPageMetaClass}>
                      <strong>Page {packPage.logicalPageNumber}</strong>
                      <span className="text-sm text-[#59716a]">Imported file {packPage.importedPageNumber}</span>
                      <small className="text-xs text-[#74857f]">{packPage.fileName}</small>
                    </div>
                    <div className={assetPageActionsClass}>
                      <Button variant="ghost" disabled={busy} onClick={() => handleStartEditPage(packPage)} type="button">
                        Edit
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={() => handleDeletePage(packPage)} type="button">
                        Delete
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <PaginationControls
                meta={selectedPack.meta}
                onPageChange={handleSelectedPackPageChange}
              />
            </>
          )}
        </Card>
      )}
    </section>
  );
}
