import React, { useEffect, useState } from 'react';
import { formatMoney, Pence } from '../../engine/money';
import { Provenance } from '../../engine/profile';
import { useStore } from '../../state/store';

export function useMoney() {
  const { state } = useStore();
  return (p: Pence, pennies = false) => formatMoney(p, state.profile.currency, { pennies });
}

export function ProvTag({ p, title }: { p: Provenance; title?: string }) {
  return (
    <span className={`prov prov-${p}`} title={title ?? (p === 'confirmed' ? 'Entered or confirmed by you' : 'Editable assumption — not a fact about you')}>
      {p === 'confirmed' ? 'You entered' : 'Assumption'}
    </span>
  );
}

export function Field({ label, hint, prov, children }: { label: string; hint?: React.ReactNode; prov?: Provenance; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">
        {label} {prov && <ProvTag p={prov} />}
      </span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** Money input in major units; stores integer pence. Empty stays visibly empty (no fake figures). */
export function MoneyInput({ value, onChange, placeholder, allowNegative, ariaLabel }: { value: Pence | null | undefined; onChange: (p: Pence) => void; placeholder?: string; allowNegative?: boolean; ariaLabel?: string }) {
  const { state } = useStore();
  const [text, setText] = useState(value ? String(value / 100) : '');
  useEffect(() => {
    const cur = text === '' ? 0 : Math.round(parseFloat(text) * 100);
    if ((value ?? 0) !== cur) setText(value ? String(value / 100) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const sym = formatMoney(0, state.profile.currency).replace(/[0-9.,−-]/g, '');
  return (
    <span className="money-input">
      <span className="money-sym">{sym}</span>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder ?? '0'}
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
    const cur = parseFloat(text) / 100;
    if (Math.abs(cur - value) > 1e-9) setText(String(+(value * 100).toFixed(2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span className="pct-input">
      <input
        type="number"
        aria-label={ariaLabel}
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)) / 100);
        }}
      />
      <span>%</span>
    </span>
  );
}

export function MonthInput({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  return <input type="month" aria-label={ariaLabel} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />;
}

export function Card({ title, sub, children, className = '', actions }: { title?: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="muted small">{sub}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: 'good' | 'warn' | 'mid' }) {
  return (
    <div className={`stat ${tone ? 'tone-' + tone : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function Bar({ value, max, label, tone }: { value: number; max: number; label?: string; tone?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`bar-fill ${tone ?? ''}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-ui" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; ariaLabel?: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SimBadge() {
  return <span className="sim-badge">Simulated</span>;
}
