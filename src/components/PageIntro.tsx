import React from 'react';
import { cn } from './ui';

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
};

export default function PageIntro({
  eyebrow,
  title,
  description,
  badge,
  actions,
}: PageIntroProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,251,243,0.94))] p-6 shadow-[0_18px_48px_rgba(17,24,39,0.09)] backdrop-blur-[14px] md:flex-row md:items-start md:justify-between">
      <div className="grid gap-2">
        <p className="m-0 text-[0.77rem] uppercase tracking-[0.18em] text-[#74857f]">{eyebrow}</p>
        <h1 className="m-0 text-[clamp(1.9rem,2vw,2.7rem)] font-semibold leading-[1.08] text-[#102042]">
          {title}
        </h1>
        {description ? <p className="m-0 max-w-[760px] text-sm leading-[1.65] text-[#59716a]">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {actions}
        {badge ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full bg-[linear-gradient(135deg,#0f766e,#128a80)] px-3.5 py-[9px] text-sm font-bold text-white',
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </header>
  );
}
