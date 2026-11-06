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
    <header className="flex min-w-0 flex-col gap-4 border-b border-[#dce5dc] pb-6 md:flex-row md:items-start md:justify-between">
      <div className="grid min-w-0 gap-2">
        <p className="m-0 text-[0.77rem] uppercase tracking-[0.18em] text-[#74857f]">{eyebrow}</p>
        <h1 className="m-0 text-[clamp(1.65rem,2.4vw,2.2rem)] font-semibold leading-[1.08] text-[#123c34]">
          {title}
        </h1>
        {description ? <p className="m-0 max-w-[760px] text-sm leading-[1.65] text-[#59716a]">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        {actions}
        {badge ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full border border-[#dbe7da] bg-[#eaf1e6] px-3 py-2 text-xs font-semibold text-[#376145]',
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
    </header>
  );
}
