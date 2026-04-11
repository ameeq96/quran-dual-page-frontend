import React, { useEffect, useState } from 'react';
import {
  fetchAnnouncements,
  type PaginationMeta,
  toggleAnnouncement,
  upsertAnnouncement,
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
  Textarea,
  cardHeaderClass,
  cardSubtitleClass,
  cardTitleClass,
  cardTitleGroupClass,
  formActionsClass,
  formRowClass,
  pageStackClass,
  sectionGridClass,
} from '../components/ui';

type Announcement = {
  id: number;
  title: string;
  body: string;
  active: boolean;
  publishAt?: string | null;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [active, setActive] = useState(true);
  const [publishAt, setPublishAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = 6;

  const refresh = (targetPage = page) => {
    fetchAnnouncements({ page: targetPage, pageSize })
      .then((response) => {
        setAnnouncements(response.items);
        setMeta(response.meta);
        setPage(response.meta.page);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    refresh(1);
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Announcement title is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upsertAnnouncement({
        title: title.trim(),
        body: body.trim(),
        active,
        publishAt: publishAt.trim() || undefined,
      });
      setTitle('');
      setBody('');
      setActive(true);
      setPublishAt('');
      refresh(page);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (item: Announcement) => {
    setBusy(true);
    setError(null);
    try {
      await toggleAnnouncement(item.id, !item.active);
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
        eyebrow="Announcements"
        title="In-App Messages"
        description="Create homepage banners, maintenance notices, and reader-facing updates that reflect in the mobile app."
        badge={`${meta?.totalItems ?? announcements.length} items`}
      />
      {error && <ErrorBanner>Failed to load: {error}</ErrorBanner>}

      <Card>
        <div className={cardHeaderClass}>
          <div className={cardTitleGroupClass}>
            <h2 className={cardTitleClass}>Create Announcement</h2>
            <p className={cardSubtitleClass}>Publish a visible message, schedule it, or keep it hidden until needed.</p>
          </div>
        </div>
        <div className={formRowClass}>
          <FieldLabel label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maintenance tonight" />
          </FieldLabel>
          <FieldLabel label="Publish at">
            <Input value={publishAt} onChange={(e) => setPublishAt(e.target.value)} placeholder="2026-04-11T18:00:00Z" />
          </FieldLabel>
          <FieldLabel label="Status">
            <Select value={active ? 'true' : 'false'} onChange={(e) => setActive(e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Hidden</option>
            </Select>
          </FieldLabel>
        </div>
        <div className="grid gap-4">
          <FieldLabel label="Body">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell readers what changed in the app."
              rows={4}
            />
          </FieldLabel>
        </div>
        <div className={formActionsClass}>
          <Button disabled={busy} onClick={handleCreate}>
            Save Announcement
          </Button>
        </div>
      </Card>

      {announcements.length > 0 ? (
        <div className={sectionGridClass}>
          {announcements.map((item) => (
            <Card key={item.id}>
              <div className={cardHeaderClass}>
                <div className={cardTitleGroupClass}>
                  <h2 className={cardTitleClass}>{item.title}</h2>
                  <p className={cardSubtitleClass}>{item.body}</p>
                </div>
                <StatusPill tone={item.active ? 'active' : 'muted'}>
                  {item.active ? 'Active' : 'Hidden'}
                </StatusPill>
              </div>
              {item.publishAt && (
                <div className="flex flex-col gap-2 border-b border-[rgba(15,42,39,0.08)] py-3.5 md:flex-row md:items-center md:justify-between">
                  <span className="text-sm text-[#59716a]">Publish at</span>
                  <strong className="text-sm font-semibold text-[#10201c] md:text-right">{item.publishAt}</strong>
                </div>
              )}
              <div className={formActionsClass}>
                <Button variant="ghost" disabled={busy} onClick={() => handleToggle(item)}>
                  {item.active ? 'Hide' : 'Activate'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState>No announcements created yet.</EmptyState>
      )}
      <PaginationControls meta={meta} onPageChange={refresh} />
    </section>
  );
}
