import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_UNAUTHORIZED_EVENT, clearAdminToken, hasAdminToken } from '../auth';
import { appBackgroundClass, cn } from './ui';

const navSections = [
  { title: 'Workspace', items: [
    { to: '/overview', label: 'Overview', icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z' },
    { to: '/users', label: 'Readers', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0' },
    { to: '/analytics', label: 'Analytics', icon: 'M3 3v18h18 M8 16v-4 M13 16V8 M18 16V5' },
  ] },
  { title: 'Content', items: [
    { to: '/editions', label: 'Quran editions', icon: 'M12 5v16 M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2' },
    { to: '/content-datasets', label: 'Content datasets', icon: 'M4 6c0-4 16-4 16 0s-16 4-16 0 M4 6v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0' },
  ] },
  { title: 'Manage', items: [
    { to: '/announcements', label: 'Announcements', icon: 'M3 10v4h4l12 5V5L7 10H3 M7 14l2 7h4l-2-5 M22 9v6' },
    { to: '/settings', label: 'Settings', icon: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6' },
  ] },
];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAdminToken();
      navigate('/login', { replace: true });
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [navigate]);

  if (!hasAdminToken()) return <Navigate to="/login" replace />;

  const brand = <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d8b66f] font-bold text-[#123c34]">Q</span><span><strong className="block text-sm font-semibold">Quran Reader</strong><span className="text-xs text-[#acc8bf]">Administration</span></span></>;

  return (
    <div className={cn(appBackgroundClass, 'lg:grid lg:grid-cols-[248px_minmax(0,1fr)]')}>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between bg-[#123c34] px-4 text-white shadow-sm lg:hidden">
        <div className="flex items-center gap-3">{brand}</div>
        <button type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="admin-navigation" onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 text-xl">{menuOpen ? '×' : '☰'}</button>
      </header>
      {menuOpen && <button type="button" aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/30 lg:hidden" />}
      <aside id="admin-navigation" className={cn('z-50 w-[248px] shrink-0 flex-col bg-[#123c34] text-[#eef5f1] lg:sticky lg:top-0 lg:flex lg:h-screen', menuOpen ? 'fixed bottom-0 left-0 top-16 flex shadow-2xl' : 'hidden')}>
        <div className="hidden items-center gap-3 border-b border-white/10 px-6 py-7 lg:flex">{brand}</div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {navSections.map(section => <section key={section.title} className="mb-7 last:mb-0">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8fb5a8]">{section.title}</p>
            <nav aria-label={section.title} className="grid gap-1">
              {section.items.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium no-underline transition-colors', isActive ? 'bg-[#e9f3ec] text-[#123c34]' : 'text-[#c6dcd3] hover:bg-white/10 hover:text-white')}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0"><path d={item.icon} /></svg>{item.label}
              </NavLink>)}
            </nav>
          </section>)}
        </div>
        <div className="border-t border-white/10 p-4">
          <p className="mb-3 px-2 text-xs text-[#9fbdb1]">Quran control center</p>
          <button type="button" className="min-h-11 w-full rounded-xl border border-white/15 px-3 py-2 text-left text-sm font-medium transition hover:bg-white/10" onClick={() => { clearAdminToken(); navigate('/login'); }}>Sign out <span aria-hidden="true" className="float-right">↗</span></button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:p-8">
        <div className="mx-auto grid min-w-0 w-full max-w-[1440px] gap-6 [&>*]:min-w-0"><Outlet /></div>
      </main>
    </div>
  );
}
