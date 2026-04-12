import React, { useEffect, useState } from 'react';
import { fetchContentStatus, fetchOverview } from '../api';
import PageIntro from '../components/PageIntro';
import {
  Card,
  EmptyState,
  ErrorBanner,
  MetricCard,
  Pill,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  metricLabelClass,
  metricRowClass,
  metricValueClass,
  pageStackClass,
  sectionGridWideClass,
  statsGridClass,
} from '../components/ui';

type Overview = {
  appName: string;
  activeUsers: number;
  totalUsers: number;
  syncedUsers: number;
  activeSyncedUsers: number;
  totalNotes: number;
  totalFavoritePages: number;
  totalBookmarks: number;
  totalHistoryEntries: number;
  totalHifzEntries: number;
  totalSessions: number;
  enabledEditions: number;
  totalEditions: number;
  activeAssetPacks: number;
  totalAssetPacks: number;
  activeDatasets: number;
  totalDatasets: number;
  activeAnnouncements: number;
  totalAnnouncements: number;
  enabledFlags: number;
  totalFlags: number;
  settingsCount: number;
  defaultEdition: string;
  aiLanguage: string;
  aiDepth: string;
  aiProvider: string;
  aiModel: string;
  aiStatusLabel: string;
  lastAnnouncementTitle: string | null;
  lastSync: string | null;
};

type ContentStatus = {
  editionsAvailable: string[];
  editions: { key: string; label: string; enabled: boolean }[];
  assetsOnDevice: boolean;
  assetPacks: { edition: string; version: string; pageCount: number }[];
  contentDatasets: { key: string; version: string }[];
  enabledFlags: string[];
  settings: { key: string; value: string }[];
  announcements: { id: number; title: string; body: string }[];
  lastIndexBuild: string | null;
};

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [content, setContent] = useState<ContentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchOverview(), fetchContentStatus()])
      .then(([overviewData, contentData]) => {
        setOverview(overviewData);
        setContent(contentData);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className={pageStackClass}>
      <PageIntro
        eyebrow="Quran Admin Overview"
        title={overview?.appName ?? 'Quran Dual Page & Multi-Line Reader'}
        description="Monitor Quran reader sync, page pack readiness, AI defaults, and the live controls shaping the app experience."
        badge="Quran Control Center"
      />

      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className={statsGridClass}>
        <MetricCard
          label="Active Users"
          value={overview?.activeUsers ?? '-'}
          hint={overview ? `${overview.totalUsers} total readers` : 'Waiting for data'}
        />
        <MetricCard
          label="Synced Users"
          value={overview?.syncedUsers ?? '-'}
          hint={overview?.lastSync ? `Last sync ${overview.lastSync}` : 'No recent sync'}
        />
        <MetricCard
          label="Active Packs"
          value={overview?.activeAssetPacks ?? '-'}
          hint={overview ? `${overview.totalAssetPacks} total packs` : 'Waiting for data'}
        />
        <MetricCard
          label="Datasets Live"
          value={overview?.activeDatasets ?? '-'}
          hint={overview ? `${overview.totalDatasets} dataset versions` : 'Waiting for data'}
        />
        <MetricCard
          label="Feature Flags"
          value={overview?.enabledFlags ?? '-'}
          hint={overview ? `${overview.totalFlags} total toggles` : 'Waiting for data'}
        />
        <MetricCard
          label="Announcements"
          value={overview?.activeAnnouncements ?? '-'}
          hint={overview?.lastAnnouncementTitle ?? 'No current announcement'}
        />
      </div>

      <div className={sectionGridWideClass}>
        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Reader Sync Snapshot</h2>
              <p className={cardSubtitleClass}>Aggregated synced data collected from mobile readers.</p>
            </div>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Bookmarks</span>
            <strong className={metricValueClass}>{overview?.totalBookmarks ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Notes</span>
            <strong className={metricValueClass}>{overview?.totalNotes ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Favorites</span>
            <strong className={metricValueClass}>{overview?.totalFavoritePages ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>History</span>
            <strong className={metricValueClass}>{overview?.totalHistoryEntries ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Hifz</span>
            <strong className={metricValueClass}>{overview?.totalHifzEntries ?? '-'}</strong>
          </div>
        </Card>

        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Reader Defaults</h2>
              <p className={cardSubtitleClass}>Settings that the mobile app should reflect immediately.</p>
            </div>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>AI Provider</span>
            <strong className={metricValueClass}>{overview?.aiProvider ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>AI Model</span>
            <strong className={metricValueClass}>{overview?.aiModel ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Default Edition</span>
            <strong className={metricValueClass}>{overview?.defaultEdition ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>AI Language</span>
            <strong className={metricValueClass}>{overview?.aiLanguage ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>AI Depth</span>
            <strong className={metricValueClass}>{overview?.aiDepth ?? '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>AI Status</span>
            <strong className={metricValueClass}>{overview?.aiStatusLabel ?? '-'}</strong>
          </div>
        </Card>

        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Content Pipeline</h2>
              <p className={cardSubtitleClass}>Remote content availability and publishing readiness.</p>
            </div>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Enabled Editions</span>
            <strong className={metricValueClass}>{overview ? `${overview.enabledEditions}/${overview.totalEditions}` : '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Active Packs</span>
            <strong className={metricValueClass}>{overview ? `${overview.activeAssetPacks}/${overview.totalAssetPacks}` : '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Active Datasets</span>
            <strong className={metricValueClass}>{overview ? `${overview.activeDatasets}/${overview.totalDatasets}` : '-'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Assets Ready</span>
            <strong className={metricValueClass}>{content?.assetsOnDevice ? 'Yes' : 'No'}</strong>
          </div>
          <div className={metricRowClass}>
            <span className={metricLabelClass}>Active Synced Users</span>
            <strong className={metricValueClass}>{overview?.activeSyncedUsers ?? '-'}</strong>
          </div>
        </Card>
      </div>

      <div className={sectionGridWideClass}>
        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Enabled Editions</h2>
              <p className={cardSubtitleClass}>Editions currently visible inside the mobile app.</p>
            </div>
          </div>
          {(content?.editionsAvailable ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {(content?.editionsAvailable ?? []).map((edition) => (
                <Pill key={edition}>
                  {edition}
                </Pill>
              ))}
            </div>
          ) : (
            <EmptyState>No enabled editions found.</EmptyState>
          )}
        </Card>

        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Active Asset Packs</h2>
              <p className={cardSubtitleClass}>Remote image packs currently serving page requests.</p>
            </div>
          </div>
          {(content?.assetPacks ?? []).length > 0 ? (
            <ul className="grid gap-2.5">
              {(content?.assetPacks ?? []).map((pack) => (
                <li
                  key={`${pack.edition}-${pack.version}`}
                  className="flex flex-col gap-2 rounded-2xl border border-[rgba(15,42,39,0.08)] bg-white/70 px-4 py-3.5 md:flex-row md:items-center md:justify-between"
                >
                  <strong>{pack.edition}</strong>
                  <span className="text-sm text-[#59716a]">
                    v{pack.version} - {pack.pageCount} pages
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No active asset packs published yet.</EmptyState>
          )}
        </Card>

        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Active Content Datasets</h2>
              <p className={cardSubtitleClass}>Navigation, text, and insight files active for readers.</p>
            </div>
          </div>
          {(content?.contentDatasets ?? []).length > 0 ? (
            <ul className="grid gap-2.5">
              {(content?.contentDatasets ?? []).map((item) => (
                <li
                  key={`${item.key}-${item.version}`}
                  className="flex flex-col gap-2 rounded-2xl border border-[rgba(15,42,39,0.08)] bg-white/70 px-4 py-3.5 md:flex-row md:items-center md:justify-between"
                >
                  <strong>{item.key}</strong>
                  <span className="text-sm text-[#59716a]">v{item.version}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No active content datasets found.</EmptyState>
          )}
        </Card>

        <Card>
          <div className={cardHeaderClass}>
            <div className={cardTitleGroupClass}>
              <h2 className={cardTitleClass}>Enabled Flags</h2>
              <p className={cardSubtitleClass}>Feature gates currently switched on for app clients.</p>
            </div>
          </div>
          {(content?.enabledFlags ?? []).length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {(content?.enabledFlags ?? []).map((flag) => (
                <Pill key={flag}>
                  {flag}
                </Pill>
              ))}
            </div>
          ) : (
            <EmptyState>No feature flags enabled right now.</EmptyState>
          )}
        </Card>
      </div>
    </section>
  );
}
