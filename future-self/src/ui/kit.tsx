import React, { useEffect, useState } from 'react';
import { formatMoney, Pence } from '../engine/money';
import { Provenance } from '../engine/profile';
import { useStore } from '../state/store';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function useMoney() {
  const { state } = useStore();
  return (p: Pence, pennies = false) => formatMoney(p, state.profile.currency, { pennies });
}

export function ProvTag({ p, title }: { p: Provenance; title?: string }) {
  return (
    <span
      title={title ?? (p === 'confirmed' ? 'Entered or confirmed by you' : 'Editable assumption — not a fact about you')}
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
        p === 'confirmed' ? 'bg-sage-soft text-sage-deep' : 'bg-cream text-amber-ink ring-1 ring-amber/30',
      )}
    >
      {p === 'confirmed' ? 'You entered' : 'Assumption'}
    </span>
  );
}

export function Pill({ children, tone = 'sage' }: { children: React.ReactNode; tone?: 'sage' | 'amber' | 'rose' | 'ink' }) {
  const t = { sage: 'bg-sage-soft text-sage-deep', amber: 'bg-cream text-amber-ink', rose: 'bg-rose/10 text-rose', ink: 'bg-ink text-white' }[tone];
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap', t)}>{children}</span>;
}

export function Card({ eyebrow, title, sub, actions, children, className }: { eyebrow?: React.ReactNode; title?: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cx('card min-w-0', className)}>
      {(eyebrow || title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            {title && <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>}
            {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, prov, children, className }: { label: React.ReactNode; hint?: React.ReactNode; prov?: Provenance; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
        {label} {prov && <ProvTag p={prov} />}
      </span>
      {children}
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </label>
  );
}

/** Money input in major units; stores integer pence. Empty stays visibly empty — never a fake figure. */
export function MoneyInput({ value, onChange, placeholder, allowNegative, ariaLabel, id }: { value: Pence | null | undefined; onChange: (p: Pence) => void; placeholder?: string; allowNegative?: boolean; ariaLabel?: string; id?: string }) {
  const { state } = useStore();
  const [text, setText] = useState(value ? String(value / 100) : '');
  useEffect(() => {
    const cur = text === '' ? 0 : Math.round(parseFloat(text) * 100);
    if ((value ?? 0) !== cur) setText(value ? String(value / 100) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const sym = formatMoney(0, state.profile.currency).replace(/[0-9.,−-]/g, '').trim();
  return (
    <span className="flex min-w-[96px] items-center rounded-xl border border-line bg-white pl-3 focus-within:border-sage-deep focus-within:ring-2 focus-within:ring-sage-soft">
      <span className="text-sm text-faint">{sym}</span>
      <input
        id={id}
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder ?? ''}
        className="w-full min-w-0 bg-transparent px-2 py-2.5 text-[15px] outline-none num"
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.\-]/g, '');
          setText(t);
          let n = parseFloat(t);
          if (!Number.isFinite(n)) n = 0;
          if (!allowNegative) n = Math.max(0, n);
          onChange(Math.round(n * 100));
        }}
      />
    </span>
  );
}

export function PctInput({ value, onChange, min = -100, max = 100, step = 0.5, ariaLabel }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; ariaLabel?: string }) {
  const [text, setText] = useState(String(+(value * 100).toFixed(2)));
  useEffect(() => {
    if (Math.abs(parseFloat(text) / 100 - value) > 1e-9) setText(String(+(value * 100).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        aria-label={ariaLabel}
        value={text}
        min={min}
        max={max}
        step={step}
        className="input w-[88px] num"
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)) / 100);
        }}
      />
      <span className="text-sm text-muted">%</span>
    </span>
  );
}

export function MonthInput({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  return <input type="month" aria-label={ariaLabel} className="input" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />;
}

export function Choice<T extends string>({ value, options, onChange, ariaLabel, className }: { value: T; options: { v: T; label: React.ReactNode }[]; onChange: (v: T) => void; ariaLabel?: string; className?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={cx('chip', value === o.v && 'chip-on')} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-1">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-sage after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
      <span className="text-[15px]">{label}</span>
    </label>
  );
}

export function Bar({ value, max, tone = 'sage', label }: { value: number; max: number; tone?: 'sage' | 'amber' | 'rose' | 'violet'; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const c = { sage: 'bg-sage', amber: 'bg-amber', rose: 'bg-rose', violet: 'bg-violet' }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx('h-full rounded-full transition-all', c)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, note, tone }: { label: React.ReactNode; value: React.ReactNode; note?: React.ReactNode; tone?: 'sage' | 'ink' }) {
  return (
    <div className="rounded-xl border border-line bg-paper/60 px-4 py-3 text-center">
      <div className={cx('text-xl font-extrabold num', tone === 'ink' ? 'text-ink' : 'text-sage-deep')}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
      {note && <div className="mt-1 text-[11px] text-faint">{note}</div>}
    </div>
  );
}

export function Notice({ children, tone = 'mist' }: { children: React.ReactNode; tone?: 'mist' | 'amber' | 'rose' }) {
  const t = { mist: 'bg-mist border-line text-ink/80', amber: 'bg-cream border-amber/30 text-amber-ink', rose: 'bg-rose/5 border-rose/30 text-rose' }[tone];
  return <div className={cx('rounded-xl border px-4 py-3 text-[13px]', t)}>{children}</div>;
}

export function KV({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <ul className="divide-y divide-line/70">
      {rows.map(([k, v], i) => (
        <li key={i} className="flex items-center justify-between gap-4 py-2 text-[14px]">
          <span className="min-w-0 text-ink/80">{k}</span>
          <b className="text-right font-semibold num">{v}</b>
        </li>
      ))}
    </ul>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1">{children}</div>;
}
