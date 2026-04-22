import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  fetchUserSync,
  fetchUsers,
  type PaginationMeta,
  updateUserActive,
} from '../api';
import PaginationControls from '../components/PaginationControls';
import PageIntro from '../components/PageIntro';
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  MetricCard,
  StatusPill,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  cn,
  detailFilterInputClass,
  detailGridClass,
  detailStackClass,
  formActionsClass,
  inlineActionsClass,
  jsonPanelClass,
  metricLabelClass,
  metricRowClass,
  metricValueClass,
  pageStackClass,
  statsGridClass,
  tableCellClass,
  tableClass,
  tableHeadClass,
  tableRowClass,
  tableWrapClass,
} from '../components/ui';

type User = {
  id: number;
  email: string | null;
  deviceId: string | null;
  active: boolean;
  lastPageNumber: number | null;
  syncUpdatedAt: string | null;
  appVersion: string | null;
  hasSyncPayload: boolean;
  notesCount: number;
  favoritePagesCount: number;
  bookmarksCount: number;
  historyCount: number;
  hifzCount: number;
};

type UserSyncDetail = {
  id: number;
  email: string | null;
  deviceId: string | null;
  active: boolean;
  lastPageNumber: number | null;
  syncUpdatedAt: string | null;
  appVersion: string | null;
  notesCount: number;
  favoritePagesCount: number;
  bookmarksCount: number;
  historyCount: number;
  hifzCount: number;
  payload: Record<string, unknown>;
};

type BookmarkEntry = {
  pageNumber: number | null;
  label: string;
  folder: string;
  createdAtIso: string;
};

type HistoryEntry = {
  pageNumber: number | null;
  viewedAtIso: string;
};

type HifzEntry = {
  pageNumber: number | null;
  strength: string;
  updatedAtIso: string;
  reviewCount: number | null;
};

type NoteEntry = {
  pageNumber: number;
  note: string;
};

type DetailRow = {
  label: string;
  value: string;
};

type DetailSection = {
  key: string;
  title: string;
  rows: DetailRow[];
};

type DetailTabKey =
  | 'summary'
  | 'bookmarks'
  | 'notes'
  | 'favorites'
  | 'history'
  | 'hifz'
  | 'raw';

const detailTabs: { key: DetailTabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'bookmarks', label: 'Bookmarks' },
  { key: 'notes', label: 'Notes' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'history', label: 'History' },
  { key: 'hifz', label: 'Hifz' },
  { key: 'raw', label: 'Raw JSON' },
];

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeBookmarks(payload: Record<string, unknown>): BookmarkEntry[] {
  return toArray(payload.bookmarks)
    .map((entry) => toRecord(entry))
    .map((entry) => ({
      pageNumber: toNumber(entry.pageNumber),
      label: toText(entry.label, 'Untitled bookmark'),
      folder: toText(entry.folder, 'General'),
      createdAtIso: toText(entry.createdAtIso),
    }));
}

function normalizeNotes(payload: Record<string, unknown>): NoteEntry[] {
  return Object.entries(toRecord(payload.pageNotes))
    .map(([key, value]) => ({
      pageNumber: Number(key),
      note: toText(value).trim(),
    }))
    .filter((entry) => Number.isFinite(entry.pageNumber) && entry.note.length > 0)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

function normalizeFavorites(payload: Record<string, unknown>): number[] {
  return toArray(payload.favoritePages)
    .map((entry) => toNumber(entry))
    .filter((entry): entry is number => entry !== null)
    .sort((a, b) => a - b);
}

function normalizeHistory(payload: Record<string, unknown>): HistoryEntry[] {
  return toArray(payload.readingHistory)
    .map((entry) => toRecord(entry))
    .map((entry) => ({
      pageNumber: toNumber(entry.pageNumber),
      viewedAtIso: toText(entry.viewedAtIso),
    }));
}

function normalizeHifz(payload: Record<string, unknown>): HifzEntry[] {
  return toArray(payload.hifzReviewEntries)
    .map((entry) => toRecord(entry))
    .map((entry) => ({
      pageNumber: toNumber(entry.pageNumber),
      strength: toText(entry.strength, 'steady'),
      updatedAtIso: toText(entry.updatedAtIso),
      reviewCount: toNumber(entry.reviewCount),
    }));
}

function matchesFilter(values: Array<string | number | null>, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  const normalizedQuery = query.trim().toLowerCase();
  return values.some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function formatIso(value: string | null | undefined): string {
  if (!value || !value.trim()) {
    return '-';
  }
  return value;
}

function humanizeStorageValue(value: unknown, fallback = '-'): string {
  const raw = toText(value).trim();
  if (!raw) {
    return fallback;
  }

  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBoolean(value: unknown, trueLabel = 'On', falseLabel = 'Off'): string {
  if (value === true) {
    return trueLabel;
  }
  if (value === false) {
    return falseLabel;
  }
  return '-';
}

function formatMillis(value: unknown): string {
  const millis = toNumber(value);
  if (millis === null || millis <= 0) {
    return '00:00';
  }
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildSummarySections(sync: UserSyncDetail | null): DetailSection[] {
  if (!sync) {
    return [];
  }

  const payload = sync.payload ?? {};
  const settings = toRecord(payload.settings);
  const aiSettings = toRecord(payload.aiSettings);
  const readingPlan = toRecord(payload.readingPlan);
  const experienceSettings = toRecord(payload.experienceSettings);
  const dailyProgress = toRecord(payload.dailyProgressState);
  const readingStreak = toRecord(payload.readingStreak);
  const audio = toRecord(payload.audio);

  return [
    {
      key: 'meta',
      title: 'Snapshot',
      rows: [
        { label: 'Email', value: sync.email ?? '-' },
        { label: 'Device ID', value: sync.deviceId ?? '-' },
        { label: 'App Version', value: sync.appVersion ?? '-' },
        { label: 'Status', value: sync.active ? 'Active' : 'Disabled' },
        { label: 'Last Page', value: String(sync.lastPageNumber ?? '-') },
        { label: 'Updated', value: formatIso(sync.syncUpdatedAt) },
        { label: 'Payload Updated', value: formatIso(toText(payload.updatedAtIso)) },
      ],
    },
    {
      key: 'reader',
      title: 'Reader Settings',
      rows: [
        { label: 'Edition', value: humanizeStorageValue(settings.mushafEdition) },
        { label: 'Fullscreen', value: formatBoolean(settings.fullscreenReading) },
        { label: 'Page Numbers', value: formatBoolean(settings.showPageNumbers, 'Shown', 'Hidden') },
        { label: 'Image Mode', value: formatBoolean(settings.preferImageMode, 'Preferred', 'Disabled') },
        { label: 'Night Mode', value: formatBoolean(settings.nightMode) },
        { label: 'Low Memory', value: formatBoolean(settings.lowMemoryMode) },
        { label: 'Hifz Focus', value: formatBoolean(settings.hifzFocusMode) },
        { label: 'Page Preset', value: humanizeStorageValue(settings.pagePreset) },
      ],
    },
    {
      key: 'ai',
      title: 'AI State',
      rows: [
        { label: 'Language', value: humanizeStorageValue(aiSettings.responseLanguage) },
        { label: 'Depth', value: humanizeStorageValue(aiSettings.responseDepth) },
      ],
    },
    {
      key: 'plan',
      title: 'Reading Plan',
      rows: [
        { label: 'Preset', value: humanizeStorageValue(readingPlan.preset) },
        { label: 'Target Days', value: String(toNumber(readingPlan.targetDays) ?? '-') },
        { label: 'Pages / Day', value: String(toNumber(readingPlan.customPagesPerDay) ?? '-') },
        { label: 'Created', value: formatIso(toText(readingPlan.createdAtIso)) },
      ],
    },
    {
      key: 'experience',
      title: 'Experience',
      rows: [
        { label: 'Sync Mode', value: humanizeStorageValue(experienceSettings.syncMode) },
        { label: 'Larger Text', value: formatBoolean(experienceSettings.largerTextMode) },
        { label: 'High Contrast', value: formatBoolean(experienceSettings.highContrastMode) },
        { label: 'Reduced Motion', value: formatBoolean(experienceSettings.reducedMotion) },
        { label: 'Tajweed Mode', value: formatBoolean(experienceSettings.tajweedMode) },
        { label: 'Recitation Sync', value: formatBoolean(experienceSettings.recitationSyncEnabled) },
      ],
    },
    {
      key: 'progress',
      title: 'Progress',
      rows: [
        { label: 'Daily Target', value: String(toNumber(payload.dailyTargetPages) ?? '-') },
        { label: 'Progress Date', value: toText(dailyProgress.dateKey, '-') || '-' },
        { label: 'Progress Start', value: String(toNumber(dailyProgress.startPage) ?? '-') },
        { label: 'Streak Count', value: String(toNumber(readingStreak.count) ?? 0) },
        { label: 'Streak Date', value: toText(readingStreak.lastDateKey, '-') || '-' },
      ],
    },
    {
      key: 'audio',
      title: 'Audio',
      rows: [
        { label: 'Surah ID', value: String(toNumber(audio.chapterId) ?? '-') },
        { label: 'Surah', value: toText(audio.chapterName, '-') || '-' },
        { label: 'Reciter ID', value: String(toNumber(audio.reciterId) ?? '-') },
        { label: 'Reciter', value: toText(audio.reciterName, '-') || '-' },
        { label: 'Resume', value: formatMillis(audio.positionMillis) },
        { label: 'Repeat', value: formatBoolean(audio.repeatEnabled) },
      ],
    },
  ];
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedSync, setSelectedSync] = useState<UserSyncDetail | null>(null);
  const [selectedTab, setSelectedTab] = useState<DetailTabKey>('summary');
  const [filterQuery, setFilterQuery] = useState('');
  const deferredFilterQuery = useDeferredValue(filterQuery);

  const pageSize = 10;

  const refresh = (targetPage = page) => {
    fetchUsers({ page: targetPage, pageSize })
      .then((response) => {
        setUsers(response.items);
        setMeta(response.meta);
        setPage(response.meta.page);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    refresh(page);
  }, []);

  const handleToggle = async (user: User) => {
    setBusyId(user.id);
    setError(null);
    try {
      await updateUserActive(user.id, !user.active);
      refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleViewSync = async (user: User) => {
    setBusyId(user.id);
    setError(null);
    try {
      const detail = await fetchUserSync(user.id);
      setSelectedUserId(user.id);
      setSelectedSync(detail);
      setSelectedTab('summary');
      setFilterQuery('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const parsedSync = useMemo(() => {
    const payload = selectedSync?.payload ?? {};
    return {
      bookmarks: normalizeBookmarks(payload),
      notes: normalizeNotes(payload),
      favorites: normalizeFavorites(payload),
      history: normalizeHistory(payload),
      hifz: normalizeHifz(payload),
    };
  }, [selectedSync]);

  const summarySections = useMemo(
    () => buildSummarySections(selectedSync),
    [selectedSync],
  );

  const filteredBookmarks = useMemo(
    () =>
      parsedSync.bookmarks.filter((entry) =>
        matchesFilter([entry.pageNumber, entry.label, entry.folder, entry.createdAtIso], deferredFilterQuery),
      ),
    [deferredFilterQuery, parsedSync.bookmarks],
  );

  const filteredNotes = useMemo(
    () =>
      parsedSync.notes.filter((entry) =>
        matchesFilter([entry.pageNumber, entry.note], deferredFilterQuery),
      ),
    [deferredFilterQuery, parsedSync.notes],
  );

  const filteredFavorites = useMemo(
    () =>
      parsedSync.favorites.filter((entry) => matchesFilter([entry], deferredFilterQuery)),
    [deferredFilterQuery, parsedSync.favorites],
  );

  const filteredHistory = useMemo(
    () =>
      parsedSync.history.filter((entry) =>
        matchesFilter([entry.pageNumber, entry.viewedAtIso], deferredFilterQuery),
      ),
    [deferredFilterQuery, parsedSync.history],
  );

  const filteredHifz = useMemo(
    () =>
      parsedSync.hifz.filter((entry) =>
        matchesFilter([entry.pageNumber, entry.strength, entry.updatedAtIso, entry.reviewCount], deferredFilterQuery),
      ),
    [deferredFilterQuery, parsedSync.hifz],
  );

  const listedActiveUsers = useMemo(
    () => users.filter((user) => user.active).length,
    [users],
  );

  const listedSyncedUsers = useMemo(
    () => users.filter((user) => user.hasSyncPayload).length,
    [users],
  );

  const showFilter =
    selectedTab !== 'summary' && selectedTab !== 'raw' && selectedSync !== null;

  return (
    <section className={pageStackClass}>
      <PageIntro
        eyebrow="Users"
        title="App Users"
        description="Inspect mobile readers, toggle access, and review synced bookmarks, notes, history, favorites, and hifz progress."
        badge={`${meta?.totalItems ?? users.length} users`}
      />
      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className={statsGridClass}>
        <MetricCard
          label="Users On This Page"
          value={users.length}
          hint={meta ? `${meta.totalItems} total users` : 'Waiting for data'}
        />
        <MetricCard
          label="Active Listed"
          value={listedActiveUsers}
          hint="Enabled users in the current table page"
        />
        <MetricCard
          label="Synced Listed"
          value={listedSyncedUsers}
          hint="Users with sync payloads on this page"
        />
      </div>

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Reader Directory</h2>
            <p className={cardSubtitleClass}>Review reader state and jump into a user sync snapshot when needed.</p>
          </div>
        </div>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={tableHeadClass}>ID</th>
                <th className={tableHeadClass}>Email</th>
                <th className={tableHeadClass}>Device ID</th>
                <th className={tableHeadClass}>Last Page</th>
                <th className={tableHeadClass}>Bookmarks</th>
                <th className={tableHeadClass}>Notes</th>
                <th className={tableHeadClass}>Favorites</th>
                <th className={tableHeadClass}>Hifz</th>
                <th className={tableHeadClass}>Last Sync</th>
                <th className={tableHeadClass}>App</th>
                <th className={tableHeadClass}>Status</th>
                <th className={tableHeadClass}>Sync</th>
                <th className={tableHeadClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={tableRowClass}>
                  <td className={tableCellClass}>{user.id}</td>
                  <td className={tableCellClass}>{user.email ?? '-'}</td>
                  <td className={tableCellClass}>{user.deviceId ?? '-'}</td>
                  <td className={tableCellClass}>{user.lastPageNumber ?? '-'}</td>
                  <td className={tableCellClass}>{user.bookmarksCount}</td>
                  <td className={tableCellClass}>{user.notesCount}</td>
                  <td className={tableCellClass}>{user.favoritePagesCount}</td>
                  <td className={tableCellClass}>{user.hifzCount}</td>
                  <td className={tableCellClass}>{user.syncUpdatedAt ?? '-'}</td>
                  <td className={tableCellClass}>{user.appVersion ?? '-'}</td>
                  <td className={tableCellClass}>
                    <StatusPill tone={user.active ? 'active' : 'muted'}>
                      {user.active ? 'Active' : 'Disabled'}
                    </StatusPill>
                  </td>
                  <td className={tableCellClass}>
                    <StatusPill tone={user.hasSyncPayload ? 'info' : 'muted'}>
                      {user.hasSyncPayload ? 'Available' : 'Empty'}
                    </StatusPill>
                  </td>
                  <td className={tableCellClass}>
                    <div className={inlineActionsClass}>
                      <Button variant="ghost" disabled={busyId === user.id} onClick={() => handleViewSync(user)}>
                        {selectedUserId === user.id ? 'Refresh Sync' : 'View Sync'}
                      </Button>
                      <Button variant="ghost" disabled={busyId === user.id} onClick={() => handleToggle(user)}>
                        {user.active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls meta={meta} onPageChange={refresh} />
      </Card>

      {selectedSync && (
        <Card>
          <header className="mb-[22px] flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className={cardTitleClass}>User Sync Snapshot</h2>
              <p className="m-0 text-sm leading-6 text-[#59716a]">
                Review and filter the live synced reader data for this user.
              </p>
            </div>
          </header>

          <div className={detailGridClass}>
            <MetricCard label="Device ID" value={selectedSync.deviceId ?? '-'} />
            <MetricCard label="Last Page" value={selectedSync.lastPageNumber ?? '-'} />
            <MetricCard label="Updated" value={formatIso(selectedSync.syncUpdatedAt)} />
            <MetricCard label="Bookmarks" value={selectedSync.bookmarksCount} />
            <MetricCard label="Notes" value={selectedSync.notesCount} />
            <MetricCard label="Favorites" value={selectedSync.favoritePagesCount} />
            <MetricCard label="History" value={selectedSync.historyCount} />
            <MetricCard label="Hifz" value={selectedSync.hifzCount} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {detailTabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  'rounded-full border px-3.5 py-2.5 text-sm font-bold transition',
                  selectedTab === tab.key
                    ? 'border-[rgba(15,118,110,0.35)] bg-[linear-gradient(135deg,#0f766e,#139184)] text-white'
                    : 'border-[rgba(15,42,39,0.1)] bg-white/70 text-[#10201c]',
                )}
                onClick={() => setSelectedTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {showFilter && (
            <div>
              <input
                className={detailFilterInputClass}
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder={`Filter ${selectedTab}`}
              />
            </div>
          )}

          {selectedTab === 'summary' && (
            <div className={detailGridClass}>
              {summarySections.map((section) => (
                <div
                  key={section.key}
                  className="grid gap-2 rounded-[22px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4"
                >
                  <h3 className="m-0 text-sm font-bold uppercase tracking-[0.12em] text-[#0f3d32]">
                    {section.title}
                  </h3>
                  {section.rows.map((row) => (
                    <div key={`${section.key}-${row.label}`} className={metricRowClass}>
                      <span className={metricLabelClass}>{row.label}</span>
                      <strong className={metricValueClass}>{row.value}</strong>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {selectedTab === 'bookmarks' && (
            <div className={detailStackClass}>
              {filteredBookmarks.length === 0 ? (
                <EmptyState>No bookmarks matched this filter.</EmptyState>
              ) : (
                filteredBookmarks.map((entry, index) => (
                  <div
                    key={`${entry.pageNumber}-${entry.createdAtIso}-${index}`}
                    className="grid gap-1.5 rounded-[18px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4"
                  >
                    <strong className="text-base">{entry.label}</strong>
                    <span className="text-sm leading-6 text-[#59716a]">Page {entry.pageNumber ?? '-'} - {entry.folder}</span>
                    <small className="text-xs text-[#74857f]">{formatIso(entry.createdAtIso)}</small>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'notes' && (
            <div className={detailStackClass}>
              {filteredNotes.length === 0 ? (
                <EmptyState>No notes matched this filter.</EmptyState>
              ) : (
                filteredNotes.map((entry) => (
                  <div key={entry.pageNumber} className="grid gap-1.5 rounded-[18px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4">
                    <strong className="text-base">Page {entry.pageNumber}</strong>
                    <span className="text-sm leading-6 text-[#59716a]">{entry.note}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'favorites' && (
            <div className={detailStackClass}>
              {filteredFavorites.length === 0 ? (
                <EmptyState>No favorite pages matched this filter.</EmptyState>
              ) : (
                filteredFavorites.map((pageNumber) => (
                  <div key={pageNumber} className="grid gap-1.5 rounded-[18px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4">
                    <strong className="text-base">Page {pageNumber}</strong>
                    <span className="text-sm leading-6 text-[#59716a]">Favorite page</span>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'history' && (
            <div className={detailStackClass}>
              {filteredHistory.length === 0 ? (
                <EmptyState>No history entries matched this filter.</EmptyState>
              ) : (
                filteredHistory.map((entry, index) => (
                  <div
                    key={`${entry.pageNumber}-${entry.viewedAtIso}-${index}`}
                    className="grid gap-1.5 rounded-[18px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4"
                  >
                    <strong className="text-base">Page {entry.pageNumber ?? '-'}</strong>
                    <span className="text-sm leading-6 text-[#59716a]">Viewed at {formatIso(entry.viewedAtIso)}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'hifz' && (
            <div className={detailStackClass}>
              {filteredHifz.length === 0 ? (
                <EmptyState>No hifz entries matched this filter.</EmptyState>
              ) : (
                filteredHifz.map((entry, index) => (
                  <div
                    key={`${entry.pageNumber}-${entry.updatedAtIso}-${index}`}
                    className="grid gap-1.5 rounded-[18px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4"
                  >
                    <strong className="text-base">Page {entry.pageNumber ?? '-'}</strong>
                    <span className="text-sm leading-6 text-[#59716a]">{entry.strength} - reviews {entry.reviewCount ?? 0}</span>
                    <small className="text-xs text-[#74857f]">{formatIso(entry.updatedAtIso)}</small>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === 'raw' && (
            <pre className={jsonPanelClass}>
              {JSON.stringify(selectedSync.payload, null, 2)}
            </pre>
          )}
        </Card>
      )}
    </section>
  );
}
