import React, { useEffect, useState } from 'react';
import { fetchAnalytics } from '../api';
import PageIntro from '../components/PageIntro';
import {
  Card,
  ErrorBanner,
  MetricCard,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  metricLabelClass,
  metricRowClass,
  metricValueClass,
  pageStackClass,
  statsGridClass,
} from '../components/ui';

type Summary = {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionMinutes: number | null;
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setSummary)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className={pageStackClass}>
      <PageIntro
        eyebrow="Analytics"
        title="Usage Summary"
        description="Track readers who synced recently. Offline reading and session duration are not measured by the backend."
        badge="Sync activity"
      />
      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className={statsGridClass}>
        <MetricCard label="Daily Active" value={summary?.dailyActiveUsers ?? '-'} hint="Readers synced in the last 24 hours" />
        <MetricCard label="Weekly Active" value={summary?.weeklyActiveUsers ?? '-'} hint="Readers synced in the last 7 days" />
        <MetricCard label="Monthly Active" value={summary?.monthlyActiveUsers ?? '-'} hint="Readers synced in the last 30 days" />
        <MetricCard label="Avg Session" value={summary?.avgSessionMinutes == null ? 'Not measured' : `${summary.avgSessionMinutes} min`} hint="Session duration is not collected" />
      </div>

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Engagement Notes</h2>
            <p className={cardSubtitleClass}>Use these metrics to shape content pushes, feature rollouts, and retention checks.</p>
          </div>
        </div>
        <div className={metricRowClass}>
          <span className={metricLabelClass}>Daily / weekly synced readers</span>
          <strong className={metricValueClass}>
            {summary ? `${summary.dailyActiveUsers}/${summary.weeklyActiveUsers}` : '-'}
          </strong>
        </div>
        <div className={metricRowClass}>
          <span className={metricLabelClass}>Monthly trend baseline</span>
          <strong className={metricValueClass}>{summary?.monthlyActiveUsers ?? '-'}</strong>
        </div>
      </Card>
    </section>
  );
}
