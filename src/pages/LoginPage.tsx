import React, { useState } from 'react';
import { login } from '../api';
import { Navigate, useNavigate } from 'react-router-dom';
import { hasAdminToken, setAdminToken } from '../auth';
import { appBackgroundClass, Button, Card, ErrorBanner, FieldLabel, Input } from '../components/ui';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (hasAdminToken()) {
    return <Navigate to="/overview" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await login(email, password);
      setAdminToken(result.accessToken);
      navigate('/overview');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className={`${appBackgroundClass} grid min-h-screen place-items-center p-5 md:p-8`}>
      <div className="grid w-full max-w-[1120px] gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,440px)]">
        <section className="rounded-[32px] bg-[radial-gradient(circle_at_top,rgba(214,165,75,0.18),transparent_40%),linear-gradient(180deg,#0d2724_0%,#133632_100%)] p-7 text-[#ecf7f4] shadow-[0_28px_64px_rgba(9,16,15,0.22)] md:p-9">
          <p className="m-0 text-[0.77rem] uppercase tracking-[0.18em] text-[#9fcabf]">Admin Access</p>
          <h1 className="mb-3 mt-0 text-[clamp(2rem,3vw,3.2rem)] font-semibold leading-[1.05] text-[#f8faf8]">
            Control the entire reader from one dashboard.
          </h1>
          <p className="m-0 leading-7 text-[#c6ded7]">
            Manage Quran page packs, editions, announcements, AI routing, content datasets,
            feature flags, and synced reader data without touching the mobile build.
          </p>
          <div className="mt-7 grid gap-3.5">
            <div className="grid gap-1.5 rounded-[20px] border border-white/10 bg-white/[0.05] px-[18px] py-4">
              <strong className="text-[#fff3d7]">Assets</strong>
              <span className="leading-6 text-[#bfd6d1]">Upload full packs or single pages and reflect them in the app.</span>
            </div>
            <div className="grid gap-1.5 rounded-[20px] border border-white/10 bg-white/[0.05] px-[18px] py-4">
              <strong className="text-[#fff3d7]">App Defaults</strong>
              <span className="leading-6 text-[#bfd6d1]">Set AI provider, language, depth, edition availability, and flags.</span>
            </div>
            <div className="grid gap-1.5 rounded-[20px] border border-white/10 bg-white/[0.05] px-[18px] py-4">
              <strong className="text-[#fff3d7]">User Sync</strong>
              <span className="leading-6 text-[#bfd6d1]">Inspect bookmarks, notes, history, favorites, and hifz snapshots.</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          <Card className="grid gap-4 self-center">
            <div className="mb-1 grid gap-1.5">
              <p className="m-0 text-[0.77rem] uppercase tracking-[0.18em] text-[#74857f]">Secure Sign In</p>
              <h2 className="m-0 text-[1.28rem] font-semibold leading-tight text-[#102042]">Admin Login</h2>
              <p className="m-0 text-sm leading-6 text-[#59716a]">
                Use the seeded admin account or your configured dashboard credentials.
              </p>
            </div>

            <FieldLabel label="Email">
              <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="admin@quran.local"
              required
              />
            </FieldLabel>
            <FieldLabel label="Password">
              <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter password"
              required
              />
            </FieldLabel>
            <div className="grid gap-1 rounded-2xl border border-[rgba(15,118,110,0.12)] bg-[rgba(15,118,110,0.05)] px-4 py-3.5">
              <span className="text-[0.75rem] uppercase tracking-[0.14em] text-[#74857f]">Default seeded account</span>
              <strong className="text-[#10201c]">admin@quran.local / ChangeMe123!</strong>
            </div>
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <Button type="submit">Sign In</Button>
          </Card>
        </form>
      </div>
    </div>
  );
}
