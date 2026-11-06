import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../api';
import { hasAdminToken, setAdminToken } from '../auth';
import { appBackgroundClass, Button, Card, ErrorBanner, FieldLabel, Input } from '../components/ui';

declare global {
  interface Window {
    grecaptcha?: {
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      ready: (callback: () => void) => void;
    };
  }
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-script';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [captchaReady, setCaptchaReady] = useState(!RECAPTCHA_SITE_KEY);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (hasAdminToken()) {
    return <Navigate to="/overview" replace />;
  }

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      return;
    }

    const prepareCaptcha = () => {
      window.grecaptcha?.ready(() => setCaptchaReady(true));
    };
    const handleCaptchaError = () => {
      setError('Unable to load reCAPTCHA. Check your site key and domain configuration.');
    };
    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existingScript || document.createElement('script');
    script.addEventListener('load', prepareCaptcha);
    script.addEventListener('error', handleCaptchaError);

    if (existingScript) {
      prepareCaptcha();
    } else {
      script.id = RECAPTCHA_SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    return () => {
      script.removeEventListener('load', prepareCaptcha);
      script.removeEventListener('error', handleCaptchaError);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (RECAPTCHA_SITE_KEY && (!captchaReady || !window.grecaptcha)) {
      setError('reCAPTCHA is not ready. Refresh the page and try again.');
      return;
    }

    setSubmitting(true);
    try {
      let captchaToken: string | undefined;
      if (RECAPTCHA_SITE_KEY) {
        try {
          captchaToken = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action: 'login' });
        } catch {
          throw new Error('reCAPTCHA check failed. Try again.');
        }
        if (!captchaToken) {
          throw new Error('reCAPTCHA check failed. Try again.');
        }
      }
      const result = await login(email, password, captchaToken);
      setAdminToken(result.accessToken);
      navigate('/overview');
    } catch (err) {
      const message = (err as Error).message;
      setError(
        message === 'Login failed: 401'
          ? 'Invalid email or password.'
          : message === 'Login failed: 403'
            ? 'reCAPTCHA check failed. Try again.'
            : message,
      );
    } finally {
      setSubmitting(false);
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
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="admin@opplexify.com"
                required
              />
            </FieldLabel>
            <FieldLabel label="Password">
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Enter password"
                required
              />
            </FieldLabel>

            {RECAPTCHA_SITE_KEY ? (
              <p className="m-0 text-xs text-[#74857f]">
                {captchaReady ? 'Protected by reCAPTCHA.' : 'Loading reCAPTCHA...'}
              </p>
            ) : (
              <div className="rounded-[18px] border border-[rgba(218,167,76,0.24)] bg-[rgba(255,247,221,0.86)] px-4 py-3 text-sm text-[#7c5b12]">
                reCAPTCHA is disabled because `VITE_RECAPTCHA_SITE_KEY` is not configured yet.
              </div>
            )}

            {error ? <ErrorBanner>{error}</ErrorBanner> : null}
            <Button
              type="submit"
              disabled={submitting || (Boolean(RECAPTCHA_SITE_KEY) && !captchaReady)}
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </Card>
        </form>
      </div>
    </div>
  );
}
