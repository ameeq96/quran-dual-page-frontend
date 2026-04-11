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
  avgSessionMinutes: number;
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
        description="Track reader engagement through high-level activity metrics coming from the synced admin backend."
        badge="Operational"
      />
      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <div className={statsGridClass}>
        <MetricCard label="Daily Active" value={summary?.dailyActiveUsers ?? '-'} hint="Readers active in the last 24 hours" />
        <MetricCard label="Weekly Active" value={summary?.weeklyActiveUsers ?? '-'} hint="Readers active in the last 7 days" />
        <MetricCard label="Monthly Active" value={summary?.monthlyActiveUsers ?? '-'} hint="Readers active in the last 30 days" />
        <MetricCard label="Avg Session" value={`${summary?.avgSessionMinutes ?? '-'} min`} hint="Average reading session duration" />
      </div>

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Engagement Notes</h2>
            <p className={cardSubtitleClass}>Use these metrics to shape content pushes, feature rollouts, and retention checks.</p>
          </div>
        </div>
        <div className={metricRowClass}>
          <span className={metricLabelClass}>Daily to Weekly retention signal</span>
          <strong className={metricValueClass}>
            {summary ? `${summary.dailyActiveUsers}/${summary.weeklyActiveUsers || 1}` : '-'}
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
