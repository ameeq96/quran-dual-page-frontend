import React from 'react';

type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]) {
  return values.filter(Boolean).join(' ');
}

export const appBackgroundClass =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(25,123,103,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(218,167,76,0.16),transparent_26%),linear-gradient(180deg,#f7f2e7_0%,#f1ebde_100%)] font-['IBM_Plex_Sans','Segoe_UI',sans-serif] text-[#10201c]";

export const pageStackClass = 'grid gap-8';
export const statsGridClass = 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6';
export const sectionGridClass = 'grid gap-6 xl:grid-cols-2';
export const sectionGridWideClass = 'grid gap-6 xl:grid-cols-2 2xl:grid-cols-3';
export const cardHeaderClass =
  'mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between';
export const cardTitleGroupClass = 'grid gap-1.5';
export const cardTitleClass = 'm-0 text-[1.28rem] font-semibold leading-tight text-[#102042]';
export const cardSubtitleClass = 'm-0 text-sm leading-6 text-[#59716a]';
export const metricRowClass =
  'flex flex-col gap-2 border-b border-[rgba(15,42,39,0.08)] py-3.5 last:border-b-0 md:flex-row md:items-center md:justify-between';
export const metricLabelClass = 'text-sm text-[#59716a]';
export const metricValueClass = 'text-sm font-semibold text-[#10201c] md:text-right';
export const detailGridClass = 'grid gap-3 sm:grid-cols-2 xl:grid-cols-4';
export const detailStackClass = 'grid gap-3';
export const formRowClass = 'grid gap-4 md:grid-cols-2 xl:grid-cols-3';
export const formRowWideClass = 'grid gap-4';
export const formActionsClass = 'mb-3 mt-6 flex flex-wrap gap-3';
export const pillRowClass = 'flex flex-wrap gap-2.5';
export const inlineActionsClass = 'flex flex-wrap gap-2';
export const tabBarClass = 'mt-6 flex flex-wrap gap-2.5';
export const tableWrapClass =
  'overflow-auto rounded-[20px] border border-[rgba(15,42,39,0.08)] bg-white/70';
export const tableClass = 'min-w-[760px] w-full border-collapse text-sm';
export const tableHeadClass =
  'border-b border-[rgba(15,42,39,0.08)] bg-[rgba(15,118,110,0.04)] px-4 py-3 text-left text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-[#74857f]';
export const tableCellClass =
  'border-b border-[rgba(15,42,39,0.08)] px-4 py-3 align-top text-sm text-[#10201c]';
export const tableRowClass = 'transition-colors hover:bg-[rgba(15,118,110,0.03)]';
export const detailFilterInputClass =
  'w-full rounded-[14px] border border-[rgba(15,42,39,0.12)] bg-white/90 px-4 py-3 text-sm text-[#10201c] outline-none transition focus:border-[rgba(15,118,110,0.55)] focus:ring-4 focus:ring-[rgba(15,118,110,0.1)]';
export const jsonPanelClass =
  'mt-4 overflow-x-auto rounded-[18px] bg-[#101826] p-4 text-[0.82rem] text-[#dbe7f5]';
export const assetPageGridClass = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';
export const assetPageCardClass =
  'grid gap-3 rounded-[20px] border border-[rgba(15,42,39,0.08)] bg-white/70 p-4';
export const assetPagePreviewClass =
  'aspect-[0.68] w-full rounded-[14px] border border-[rgba(15,42,39,0.08)] bg-white object-contain';
export const assetPageMetaClass = 'grid gap-1';
export const assetPageActionsClass = 'flex flex-wrap gap-2';
export const managePageEditorClass =
  'mb-6 grid gap-4 rounded-[22px] border border-[rgba(15,118,110,0.12)] bg-[rgba(15,118,110,0.04)] p-5';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[26px] border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(252,249,243,0.98))] p-6 shadow-[0_18px_48px_rgba(17,24,39,0.09)] backdrop-blur-xl',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-2 rounded-[20px] border border-[rgba(15,118,110,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,251,249,0.98))] p-[18px] shadow-[0_12px_28px_rgba(17,24,39,0.05)]',
        className,
      )}
    >
      <span className="text-[0.77rem] uppercase tracking-[0.14em] text-[#74857f]">{label}</span>
      <strong className="text-[1.7rem] leading-none text-[#102042]">{value}</strong>
      {hint ? <small className="text-sm leading-6 text-[#59716a]">{hint}</small> : null}
    </div>
  );
}

export function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
}) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 py-[11px] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
        variant === 'primary'
          ? 'border border-transparent bg-[linear-gradient(135deg,#0f766e,#139184)] text-white shadow-[0_12px_24px_rgba(15,118,110,0.2)] hover:-translate-y-px'
          : 'border border-[rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.04)] text-[#0b5f59] hover:border-[rgba(15,118,110,0.35)] hover:bg-[rgba(15,118,110,0.08)]',
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: 'active' | 'muted' | 'info';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full px-[11px] py-[7px] text-[0.82rem] font-bold',
        tone === 'active' && 'bg-[#dcfae6] text-[#0f5132]',
        tone === 'muted' && 'bg-[#eff2f5] text-[#475467]',
        tone === 'info' && 'bg-[#dff3fb] text-[#0e5a72]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Pill({
  children,
  active,
  className,
  asButton = false,
  ...props
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  asButton?: boolean;
} & (React.ButtonHTMLAttributes<HTMLButtonElement> | React.HTMLAttributes<HTMLSpanElement>)) {
  const baseClass = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold',
    active
      ? 'border-[rgba(15,118,110,0.28)] bg-[rgba(15,118,110,0.12)] text-[#0b5f59]'
      : 'border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] text-[#0b5f59]',
    className,
  );

  if (asButton) {
    return (
      <button className={baseClass} type="button" {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }

  return (
    <span className={baseClass} {...(props as React.HTMLAttributes<HTMLSpanElement>)}>
      {children}
    </span>
  );
}

export function EmptyState({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-2 rounded-[18px] border border-dashed border-[rgba(15,42,39,0.16)] bg-white/55 px-5 py-[18px] text-center text-sm text-[#59716a]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ErrorBanner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[18px] border border-[rgba(180,35,24,0.14)] bg-[#fef0f0] px-4 py-3 text-sm text-[#7a271a]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FieldLabel({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('grid gap-2 text-sm text-[#59716a]', className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full min-w-0 rounded-[14px] border border-[rgba(15,42,39,0.12)] bg-white/95 px-[14px] py-3 text-sm text-[#10201c] outline-none transition placeholder:text-[#74857f] focus:border-[rgba(15,118,110,0.55)] focus:ring-4 focus:ring-[rgba(15,118,110,0.1)] file:mr-3 file:rounded-xl file:border-0 file:bg-[rgba(15,118,110,0.1)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0b5f59]',
        props.className,
      )}
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full min-w-0 rounded-[14px] border border-[rgba(15,42,39,0.12)] bg-white/95 px-[14px] py-3 text-sm text-[#10201c] outline-none transition focus:border-[rgba(15,118,110,0.55)] focus:ring-4 focus:ring-[rgba(15,118,110,0.1)]',
        props.className,
      )}
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full min-w-0 rounded-[14px] border border-[rgba(15,42,39,0.12)] bg-white/95 px-[14px] py-3 text-sm text-[#10201c] outline-none transition placeholder:text-[#74857f] focus:border-[rgba(15,118,110,0.55)] focus:ring-4 focus:ring-[rgba(15,118,110,0.1)]',
        props.className,
      )}
      {...props}
    />
  );
}
