import React, { useMemo, useRef, useState } from 'react';
import { Pence } from '../../engine/money';
import { dateOfMonth, prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { useMoney } from './inputs';

export interface ChartSeries {
  id: string;
  label: string;
  color: string; // CSS var reference, e.g. 'var(--series-1)'
  dashed?: boolean;
  points: { m: number; v: Pence }[];
}

function niceTicks(min: number, max: number, n = 5): number[] {
  if (min === max) {
    max = min + 1;
  }
  const span = max - min;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => span / s <= n) ?? 10 * mag;
  const t: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) t.push(v);
  return t;
}

function compact(p: Pence, fmt: (p: Pence) => string) {
  const a = Math.abs(p / 100);
  if (a >= 1e6) return fmt(Math.round(p / 1e6) * 1e6).replace(/,000,000$/, 'm');
  if (a >= 1e4) return fmt(Math.round(p / 1e5) * 1e5).replace(/,000$/, 'k');
  return fmt(p);
}

export function LineChart({ series, height = 260, title, markers = [] }: { series: ChartSeries[]; height?: number; title: string; markers?: { m: number; label: string }[] }) {
  const money = useMoney();
  const { state } = useStore();
  const W = 720;
  const H = height;
  const pad = { l: 64, r: 16, t: 12, b: 28 };
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const { xMin, xMax, ticks, yMin, yMax } = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const xs = all.map((p) => p.m);
    const ys = all.map((p) => p.v);
    const lo = Math.min(0, ...ys);
    const hi = Math.max(1, ...ys);
    const t = niceTicks(lo, hi);
    return { xMin: Math.min(...xs), xMax: Math.max(...xs), ticks: t, yMin: t[0], yMax: t[t.length - 1] };
  }, [series]);

  const x = (m: number) => pad.l + ((m - xMin) / Math.max(1, xMax - xMin)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * (H - pad.t - pad.b);
  const years = Math.max(1, Math.round((xMax - xMin) / 12));
  const yearStep = years > 30 ? 10 : years > 12 ? 5 : years > 5 ? 2 : 1;

  const onMove = (e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const m = Math.round(xMin + ((px - pad.l) / (W - pad.l - pad.r)) * (xMax - xMin));
    setHover(Math.max(xMin, Math.min(xMax, m)));
  };

  const start = state.profile.startDate;
  const dateLabel = (m: number) => (m === 0 ? 'Start' : prettyDate(dateOfMonth(start, m)));

  return (
    <figure className="chart viz-root">
      <figcaption className="sr-only">{title}</figcaption>
      <div className="legend" aria-label="Legend">
        {series.map((s) => (
          <span key={s.id} className="legend-item">
            <svg width="22" height="10" aria-hidden>
              <line x1="1" y1="5" x2="21" y2="5" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? '5 3' : undefined} strokeLinecap="round" />
            </svg>
            {s.label}
          </span>
        ))}
        <button type="button" className="link small" onClick={() => setTable((t) => !t)}>
          {table ? 'Show chart' : 'Show table'}
        </button>
      </div>
      {table ? (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Month</th>
                {series.map((s) => (
                  <th key={s.id}>{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series[0]?.points
                .filter((p) => p.m % 12 === 0 || p.m === xMin)
                .map((p) => (
                  <tr key={p.m}>
                    <td>{dateLabel(p.m)}</td>
                    {series.map((s) => (
                      <td key={s.id}>{money(s.points.find((q) => q.m === p.m)?.v ?? 0)}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-box">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} style={{ touchAction: 'pan-y' }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-zero' : 'grid'} />
                <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="tick">
                  {compact(t, money)}
                </text>
              </g>
            ))}
            {Array.from({ length: Math.floor((xMax - xMin) / 12 / yearStep) + 1 }, (_, i) => xMin + i * 12 * yearStep).map((m) => (
              <text key={m} x={x(m)} y={H - 8} textAnchor="middle" className="tick">
                {m === 0 ? 'Now' : `${Math.round(m / 12)}y`}
              </text>
            ))}
            {markers.map((mk, i) =>
              mk.m >= xMin && mk.m <= xMax ? (
                <g key={mk.label + mk.m}>
                  <line x1={x(mk.m)} x2={x(mk.m)} y1={pad.t} y2={H - pad.b} className="marker-line" />
                  <text x={x(mk.m) + 3} y={pad.t + 10 + i * 12} className="tick small-tick">
                    {mk.label}
                  </text>
                </g>
              ) : null,
            )}
            {series.map((s) => (
              <path
                key={s.id}
                d={s.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.m).toFixed(1)},${y(p.v).toFixed(1)}`).join('')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dashed ? '6 4' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="crosshair" />
                {series.map((s) => {
                  const p = s.points.find((q) => q.m === hover);
                  return p ? <circle key={s.id} cx={x(p.m)} cy={y(p.v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null;
                })}
              </g>
            )}
          </svg>
          {hover !== null && (
            <div className="tooltip" style={{ left: `${Math.min(70, Math.max(2, ((x(hover) - 0) / W) * 100))}%` }}>
              <strong>{dateLabel(hover)}</strong>
              {series.map((s) => (
                <div key={s.id} className="tt-row">
                  <span className="tt-swatch" style={{ background: s.color }} />
                  <span className="tt-label">{s.label}</span>
                  <span className="tt-val">{money(s.points.find((q) => q.m === hover)?.v ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
