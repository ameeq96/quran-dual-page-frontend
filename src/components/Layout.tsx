import React, { useEffect } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ADMIN_UNAUTHORIZED_EVENT, clearAdminToken, hasAdminToken } from '../auth';
import { appBackgroundClass, cn } from './ui';

const navSections = [
  {
    title: 'Command',
    items: [
      { to: '/overview', label: 'Overview', hint: 'Health, sync, AI, and pipeline status' },
      { to: '/users', label: 'Users', hint: 'Reader profiles, sync snapshots, and activity' },
      { to: '/analytics', label: 'Analytics', hint: 'Reader engagement and usage summary' },
    ],
  },
  {
    title: 'Content',
    items: [
      { to: '/editions', label: 'Editions', hint: 'Control available line editions in app' },
      { to: '/asset-packs', label: 'Asset Packs', hint: 'Upload, activate, and manage page images' },
      { to: '/content-datasets', label: 'Content Datasets', hint: 'Remote indexes, insights, and JSON packs' },
    ],
  },
  {
    title: 'Runtime',
    items: [
      { to: '/announcements', label: 'Announcements', hint: 'Push visible app messages and notices' },
      { to: '/settings', label: 'Settings', hint: 'Defaults, AI config, and feature flags' },
    ],
  },
];

export default function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAdminToken();
      navigate('/login', { replace: true });
    };

    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [navigate]);

  if (!hasAdminToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={cn(appBackgroundClass, 'grid min-h-screen xl:grid-cols-[minmax(280px,320px)_1fr]')}>
      <aside className="px-4 pb-0 pt-4 xl:p-6">
        <div className="grid gap-6 overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top,rgba(214,165,75,0.18),transparent_38%),linear-gradient(180deg,#0d2624_0%,#11302d_100%)] p-6 text-[#ecf7f3] shadow-[0_22px_60px_rgba(7,15,13,0.22)] xl:sticky xl:top-6 xl:h-[calc(100vh-48px)] xl:grid-rows-[auto_minmax(0,1fr)_auto]">
          <div className="grid gap-[18px]">
            <div className="flex items-center gap-3.5">
              <span className="grid h-[52px] w-[52px] place-items-center rounded-2xl bg-[linear-gradient(135deg,#0f766e,#1da28a)] text-sm font-bold tracking-[0.08em] text-[#fff7e9] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                QD
              </span>
              <div>
                <strong className="block text-[1.05rem] font-semibold">Quran Admin</strong>
                <small className="text-[#9fcabf]">Reader control hub</small>
              </div>
            </div>
            <div className="text-[0.95rem] leading-[1.55] text-[#b7d4cc]">
              Manage the mobile app from one place: assets, remote content, AI routing, sync, and app defaults.
            </div>
          </div>
          <div className="grid min-h-0 gap-[18px] overflow-visible xl:overflow-y-auto xl:pr-1.5">
            {navSections.map((section) => (
              <section key={section.title} className="grid gap-2.5">
                <span className="px-1 text-[0.74rem] uppercase tracking-[0.16em] text-[#8eb7ad]">
                  {section.title}
                </span>
                <nav className="grid gap-2.5 lg:grid-cols-2 xl:grid-cols-1">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'group relative grid gap-1 rounded-[18px] border px-4 py-[14px] pl-[18px] no-underline transition hover:translate-x-0.5',
                          isActive
                            ? 'border-[rgba(214,165,75,0.45)] bg-[linear-gradient(135deg,#fff8e9,#f4e8cb)] text-[#0f2a27]'
                            : 'border-transparent bg-white/[0.02] text-[#e6f7f3] hover:border-white/10 hover:bg-white/[0.05]',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              'absolute bottom-[14px] left-0 top-[14px] w-1 rounded-full',
                              isActive
                                ? 'bg-[linear-gradient(180deg,#0f766e,#d6a54b)]'
                                : 'bg-transparent',
                            )}
                          />
                          <span className="font-bold">{item.label}</span>
                          <small className="hidden text-[0.82rem] leading-5 opacity-75 sm:block xl:block">
                            {item.hint}
                          </small>
                        </>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </section>
            ))}
          </div>
          <div className="grid gap-3.5">
            <div className="grid gap-1.5 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3.5">
              <span className="text-[0.75rem] uppercase tracking-[0.14em] text-[#9fcabf]">Control mode</span>
              <strong>Remote-first mobile app</strong>
            </div>
            <button
              className="w-full rounded-[14px] border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-[#effaf7] transition hover:bg-white/[0.08]"
              onClick={() => {
                clearAdminToken();
                navigate('/login');
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
      <main className="px-4 pb-8 pt-4 xl:px-0 xl:pb-10 xl:pr-7 xl:pt-7">
        <div className="mx-auto grid max-w-[1520px] gap-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
