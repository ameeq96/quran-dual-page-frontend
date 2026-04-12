import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

const Layout = lazy(() => import('./components/Layout'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const EditionsPage = lazy(() => import('./pages/EditionsPage'));
const AssetPacksPage = lazy(() => import('./pages/AssetPacksPage'));
const ContentDatasetsPage = lazy(() => import('./pages/ContentDatasetsPage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f7f3ea_0%,#f5ecdd_45%,#efe3d1_100%)] px-6 text-center">
      <div className="grid gap-3 rounded-[26px] border border-white/80 bg-white/80 px-8 py-7 shadow-[0_18px_48px_rgba(17,24,39,0.08)] backdrop-blur-[12px]">
        <strong className="text-lg font-semibold text-[#102042]">Loading dashboard</strong>
        <span className="text-sm text-[#59716a]">Preparing the next workspace view.</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/editions" element={<EditionsPage />} />
            <Route path="/asset-packs" element={<AssetPacksPage />} />
            <Route path="/content-datasets" element={<ContentDatasetsPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
