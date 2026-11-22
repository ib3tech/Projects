import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Pence } from '../engine/money';
import { dateOfMonth, prettyDate } from '../engine/profile';
import { useStore } from '../state/store';
import { cx, useMoney } from './kit';

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  dashed?: boolean;
  points: { m: number; v: Pence }[];
}

export const SERIES_COLORS = {
  plan: '#5d8a72',
  index: '#d4a04a',
  career: '#8a7fd0',
  spend: '#c06060',
  current: '#7d8a96',
};

function compact(p: Pence, fmt: (p: Pence) => string) {
  const v = p / 100;
  const sym = fmt(0).replace(/[0-9.,−-]/g, '').trim();
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1e6) return `${sign}${sym}${(a / 1e6).toFixed(1)}m`;
  if (a >= 1e3) return `${sign}${sym}${Math.round(a / 1e3)}k`;
  return `${sign}${sym}${Math.round(a)}`;
}

/** Line chart for engine series. Legend always shown; a table view keeps every value reachable. */
export function EngineChart({ series, height = 260, title, markers = [], unit = 'balance' }: { series: ChartSeries[]; height?: number; title: string; markers?: { m: number; label: string }[]; unit?: string }) {
  const money = useMoney();
  const { state } = useStore();
  const [table, setTable] = useState(false);
  const data = (series[0]?.points ?? []).map((pt, i) => {
    const row: Record<string, number> = { m: pt.m };
    for (const s of series) row[s.id] = s.points[i]?.v ?? 0;
    return row;
  });
  const maxM = data.at(-1)?.m ?? 12;
  const yearStep = maxM > 360 ? 120 : maxM > 144 ? 60 : maxM > 60 ? 24 : 12;
  const ticks = data.filter((d) => d.m % yearStep === 0).map((d) => d.m);
  const label = (m: number) => (m === 0 ? 'Now' : prettyDate(dateOfMonth(state.profile.startDate, m)));

  return (
    <figure className="m-0 min-w-0" aria-label={title}>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
        {series.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <svg width="18" height="8" aria-hidden><line x1="1" y1="4" x2="17" y2="4" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={s.dashed ? '4 3' : undefined} /></svg>
            {s.label}
          </span>
        ))}
        <button className="ml-auto text-xs font-semibold text-sage-deep hover:underline" onClick={() => setTable((t) => !t)}>{table ? 'Show chart' : 'Show table'}</button>
      </div>
      {table ? (
        <div className="max-h-[320px] overflow-auto">
          <table className="table-data">
            <thead><tr><th>Month</th>{series.map((s) => <th key={s.id}>{s.label}</th>)}</tr></thead>
            <tbody>
              {data.filter((d) => d.m % 12 === 0).map((d) => (
                <tr key={d.m}><td>{label(d.m)}</td>{series.map((s) => <td key={s.id}>{money(d[s.id])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ height }} className="-ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid stroke="#e9eee8" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="m" type="number" domain={[data[0]?.m ?? 0, maxM]} ticks={ticks} tickFormatter={(m) => (m === 0 ? 'Now' : `${Math.round(m / 12)}y`)} tick={{ fill: '#8a978f', fontSize: 11 }} axisLine={{ stroke: '#e3e8e2' }} tickLine={false} />
              <YAxis tickFormatter={(v) => compact(v, money)} tick={{ fill: '#8a978f', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
              <ReferenceLine y={0} stroke="#c8d0c9" />
              {markers.map((mk) => (
                <ReferenceLine key={mk.label + mk.m} x={mk.m} stroke="#d4a04a" strokeDasharray="2 4" label={{ value: mk.label, position: 'insideTopLeft', fill: '#a8741f', fontSize: 10 }} />
              ))}
              <Tooltip
                cursor={{ stroke: '#9aa79f', strokeDasharray: '3 3' }}
                content={({ active, payload, label: m }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg">
                      <div className="mb-1 font-semibold">{label(Number(m))}</div>
                      {payload.map((p) => {
                        const s = series.find((x) => x.id === p.dataKey)!;
                        return (
                          <div key={s.id} className="flex items-center gap-2 py-0.5">
                            <span className="h-[3px] w-3 rounded" style={{ background: s.color }} />
                            <b className="num">{money(Number(p.value))}</b>
                            <span className="text-muted">{s.label}</span>
                          </div>
                        );
                      })}
                      <div className="mt-1 text-[10px] text-faint">{unit}</div>
                    </div>
                  ) : null
                }
              />
              {series.map((s) => (
                <Line key={s.id} type="monotone" dataKey={s.id} stroke={s.color} strokeWidth={2.2} strokeDasharray={s.dashed ? '6 4' : undefined} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}

export function Legendish({ className }: { className?: string }) {
  return <p className={cx('mt-2 text-[11px] text-faint', className)}>Excludes inflation, fees and taxes. Investment returns are illustrative — not guaranteed.</p>;
}
