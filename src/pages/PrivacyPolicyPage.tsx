import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, appBackgroundClass, cn } from '../components/ui';

const sections = [
  {
    title: '1. Information we collect',
    body: (
      <>
        <p>
          The app is designed primarily as a Quran reading application.
          Depending on the features you use, the app may process the following
          categories of data:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Reading and app interaction data:</strong> current page,
            last page, reading history, reading plan, hifz progress, and similar
            app usage state.
          </li>
          <li>
            <strong>User-generated content:</strong> bookmarks, page notes,
            favorites, backup exports, and AI prompts or typed questions you
            enter.
          </li>
          <li>
            <strong>Device or other identifiers:</strong> a generated sync
            client or device identifier used to restore or sync reader state.
          </li>
          <li>
            <strong>Audio usage data:</strong> selected reciter, selected surah,
            playback state, and optional downloaded audio files stored on your
            device.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '2. Information we do not collect',
    body: (
      <p>
        Based on the current app features, we do not intentionally collect your
        precise location, contacts, calendar data, phone number, payment
        information, health data, photos, or videos.
      </p>
    ),
  },
  {
    title: '3. How we use data',
    body: (
      <ul className="list-disc pl-5">
        <li>To remember your reading position and app settings.</li>
        <li>To save bookmarks, notes, favorites, and hifz review state.</li>
        <li>To enable optional cloud sync and restore features.</li>
        <li>
          To provide optional AI tools using your page context and question
          input.
        </li>
        <li>
          To provide Quran content, tafsir excerpts, insights, and audio
          recitation features.
        </li>
      </ul>
    ),
  },
  {
    title: '4. When data is sent off your device',
    body: (
      <ul className="list-disc pl-5">
        <li>
          If you enable cloud sync, reader state may be sent to the app backend.
        </li>
        <li>
          If you use AI Studio or related AI tools, your typed input and current
          page context may be sent to the configured admin AI service.
        </li>
        <li>
          If you stream recitation or fetch online Quran content, network
          requests may be made to supported content providers.
        </li>
      </ul>
    ),
  },
  {
    title: '5. Third-party and backend services',
    body: (
      <>
        <p>
          The app may communicate with the following services depending on
          feature use and configuration:
        </p>
        <ul className="list-disc pl-5">
          <li>
            <strong>Opplexify admin services</strong> for configuration, sync,
            remote datasets, and AI proxy features.
          </li>
          <li>
            <strong>Quran content providers</strong> such as Quran.com APIs for
            chapters, tafsir, recitation metadata, and audio resources.
          </li>
        </ul>
        <div className="mt-4 rounded-[18px] border-l-4 border-[#d8b15c] bg-[rgba(216,177,92,0.12)] px-4 py-3 text-sm leading-6 text-[#4d5d5b]">
          We do not state that your data is sold. We also do not state that
          your data is shared for advertising purposes.
        </div>
      </>
    ),
  },
  {
    title: '6. Data storage and retention',
    body: (
      <>
        <p>
          Many settings and reader features are stored locally on your device
          using on-device storage.
        </p>
        <p>
          If you use optional sync features, data may also be retained on the
          configured backend for backup and restore purposes. If you export a
          backup file, the exported file remains where you save or share it.
        </p>
      </>
    ),
  },
  {
    title: '7. Your choices',
    body: (
      <ul className="list-disc pl-5">
        <li>
          You can use the app in local-only mode for many core reading features.
        </li>
        <li>
          You can choose whether to enable cloud sync related functionality.
        </li>
        <li>
          You can delete bookmarks, notes, favorites, downloaded audio, and
          other local app state from within the app or by clearing app storage
          on your device.
        </li>
        <li>
          You can choose whether to submit text to AI tools by deciding whether
          to use those features.
        </li>
      </ul>
    ),
  },
  {
    title: '8. Security',
    body: (
      <p>
        We take reasonable steps to protect information processed by the app.
        However, no method of storage or transmission is completely secure, and
        we cannot guarantee absolute security.
      </p>
    ),
  },
  {
    title: '9. Children',
    body: (
      <p>
        The app is a general-use Quran reading application. If you believe data
        was provided inappropriately, contact the publisher so the issue can be
        reviewed.
      </p>
    ),
  },
  {
    title: '10. Changes to this Privacy Policy',
    body: (
      <p>
        We may update this Privacy Policy from time to time. Updated versions
        will be posted at this same URL with a revised effective date.
      </p>
    ),
  },
  {
    title: '11. Contact',
    body: (
      <p>
        For privacy-related questions, contact the publisher through the support
        contact provided for Quran Pak Dual Page Reader on Google Play or your
        official Opplexify support channel.
      </p>
    ),
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className={cn(appBackgroundClass, 'px-4 py-4 xl:px-6 xl:py-6')}>
      <div className="mx-auto grid max-w-[1080px] gap-6">
        <Card className="grid gap-5 overflow-hidden rounded-[32px] border border-white/90 bg-[radial-gradient(circle_at_right_top,rgba(15,118,110,0.16),transparent_28%),linear-gradient(160deg,rgba(255,255,255,0.98),rgba(255,248,237,0.92))] p-7 xl:p-9">
          <div className="inline-flex w-fit items-center rounded-full bg-[rgba(15,118,110,0.1)] px-4 py-2 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-[#0f766e]">
            Privacy Policy
          </div>
          <div className="grid gap-3">
            <h1 className="m-0 text-[2.1rem] font-semibold leading-tight text-[#102042] xl:text-[3rem]">
              Quran Pak Dual Page Reader
            </h1>
            <p className="m-0 max-w-[760px] text-[1.02rem] leading-7 text-[#59716a]">
              This Privacy Policy explains how Quran Pak Dual Page Reader
              collects, uses, stores, and protects information when you use the
              mobile app and related services.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-[#59716a]">
            <span className="rounded-[16px] border border-[rgba(15,42,39,0.12)] bg-white/75 px-4 py-2.5">
              Effective date: April 19, 2026
            </span>
            <span className="rounded-[16px] border border-[rgba(15,42,39,0.12)] bg-white/75 px-4 py-2.5">
              Package: com.opplexify.quranpakdualpagereader
            </span>
            <span className="rounded-[16px] border border-[rgba(15,42,39,0.12)] bg-white/75 px-4 py-2.5">
              Publisher: Opplexify
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login">
              <Button variant="ghost">Back to admin login</Button>
            </Link>
          </div>
        </Card>

        <div className="grid gap-5">
          {sections.map((section) => (
            <Card key={section.title} className="grid gap-4 p-6 xl:p-7">
              <h2 className="m-0 text-[1.22rem] font-semibold text-[#102042]">
                {section.title}
              </h2>
              <div className="grid gap-3 text-[1rem] leading-7 text-[#314645]">
                {section.body}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
