import { useState } from 'react';
import { SCENARIO_LABELS, ScenarioId } from '../../engine/scenarios';
import { useStore } from '../../state/store';
import { EngineChart, Legendish, SERIES_COLORS } from '../Chart';
import { Card, cx, Field, PctInput, Stat, useMoney } from '../kit';

const LINES: { id: ScenarioId; label: string; color: string; dashed?: boolean }[] = [
  { id: 'plan', label: 'Your plan', color: SERIES_COLORS.plan },
  { id: 'index', label: 'Index investing (illustrative S&P 500-style)', color: SERIES_COLORS.index },
  { id: 'careerThenIndex', label: 'Career → invest', color: SERIES_COLORS.career },
  { id: 'careerThenIndexNoRise', label: 'Career → invest, no pay rise', color: SERIES_COLORS.career, dashed: true },
  { id: 'spend', label: 'Spend it', color: SERIES_COLORS.spend },
  { id: 'current', label: 'Current habits', color: SERIES_COLORS.current, dashed: true },
];

export function Compare() {
  const { state, model, update, completeQuest } = useStore();
  const money = useMoney();
  const [shown, setShown] = useState<ScenarioId[]>(['plan', 'index', 'careerThenIndex', 'careerThenIndexNoRise', 'spend']);
  const series = model.series(shown, 'netAssets');
  const r = state.plan.returns;
  return (
    <div className="flex flex-col gap-4">
      <Card eyebrow="Projected tracked assets" title="Same cash, different paths" sub="Measures NET TRACKED ASSETS: cash + emergency reserve + pots/investments − debts. Salary is never added in; course fees are expenses; future wages are not assets.">
        <div className="mb-4 flex flex-wrap gap-2">
          {LINES.map((l) => {
            const on = shown.includes(l.id);
            return (
              <button key={l.id} aria-pressed={on} onClick={() => setShown(on ? shown.filter((x) => x !== l.id) : [...shown, l.id])} className={cx('chip text-xs', on && 'chip-on')}>
                <span className="mr-1.5 inline-block h-[3px] w-3 rounded align-middle" style={{ background: l.color }} />{l.label}
              </button>
            );
          })}
        </div>
        <EngineChart title="Net tracked assets by strategy" height={300} series={series.map((s) => { const l = LINES.find((x) => x.id === s.id)!; return { id: s.id, label: l.label, color: l.color, dashed: l.dashed, points: s.points }; })} unit="net tracked assets" />
        <Legendish />
      </Card>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {LINES.map((l) => <Stat key={l.id} label={`${l.label} · ${state.plan.horizonYears} yrs`} value={money(model.netAssets(l.id, model.horizon))} />)}
      </div>
      <Card eyebrow="Identical in every line" title="Shared assumptions">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Investment return" hint="Try 0% or negative. Never changed by a deadline.">
            <PctInput value={r.investmentAnnual} min={-50} max={20} onChange={(v) => { update((d) => void (d.plan.returns.investmentAnnual = v), { returns: 'confirmed' }); if (v <= 0) completeQuest('testReturns'); }} />
          </Field>
          <Field label="Cash return"><PctInput value={r.cashAnnual} min={-10} max={15} step={0.25} onChange={(v) => update((d) => void (d.plan.returns.cashAnnual = v), { returns: 'confirmed' })} /></Field>
          <Field label="Years shown"><input type="number" min={1} max={50} className="input num" value={state.plan.horizonYears} onChange={(e) => update((d) => void (d.plan.horizonYears = Math.max(1, Math.min(50, +e.target.value || 1))))} /></Field>
        </div>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[13px] text-ink/80">
          <li>Same starting balances, emergency priority and target, take-home income, calendar changes, spending and return in every line.</li>
          <li><b>Index investing:</b> plan money after the emergency share goes into one illustrative index fund; no career change.</li>
          <li><b>Career → invest:</b> development budgets are paid first, then everything is invested. The dashed line assumes no pay rise.</li>
          <li><b>Spend it:</b> the emergency share is still saved; the rest is spent.</li>
          <li><b>Not included:</b> inflation, fees, taxes on returns, currency effects, future living-cost changes. All figures are nominal and simulated.</li>
        </ul>
        <p className="mt-2 text-xs text-faint">{SCENARIO_LABELS.plan} uses your three pots, split by priority and deadline.</p>
      </Card>
    </div>
  );
}
