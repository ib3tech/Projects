import { useState } from 'react';
import { SCENARIO_LABELS, ScenarioId } from '../../engine/scenarios';
import { useStore } from '../../state/store';
import { Card, Field, PctInput, Stat, useMoney } from '../components/inputs';
import { LineChart } from '../components/LineChart';

const LINES: { id: ScenarioId; color: string; dashed?: boolean }[] = [
  { id: 'plan', color: 'var(--series-1)' },
  { id: 'index', color: 'var(--series-2)' },
  { id: 'careerThenIndex', color: 'var(--series-3)' },
  { id: 'careerThenIndexNoRise', color: 'var(--series-3)', dashed: true },
  { id: 'spend', color: 'var(--series-4)' },
];

export function CompareView() {
  const { state, model, update, completeQuest } = useStore();
  const money = useMoney();
  const [shown, setShown] = useState<ScenarioId[]>(LINES.map((l) => l.id));
  const series = model.series(shown, 'netAssets');
  const h = model.horizon;
  const r = state.plan.returns;

  return (
    <div className="stack">
      <Card title="Alternative uses of the same available cash" sub="What this graph measures: NET TRACKED ASSETS = cash + emergency reserve + pots/investment account − debts. Salary is never added in. Course fees are expenses when paid; future wages are not assets.">
        <div className="chips">
          {LINES.map((l) => {
            const on = shown.includes(l.id);
            return (
              <button key={l.id} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => setShown(on ? shown.filter((x) => x !== l.id) : [...shown, l.id])}>
                {SCENARIO_LABELS[l.id]}
              </button>
            );
          })}
        </div>
        <LineChart
          title="Net tracked assets by scenario"
          series={series.map((s) => {
            const l = LINES.find((x) => x.id === s.id)!;
            return { id: s.id, label: SCENARIO_LABELS[s.id], color: l.color, dashed: l.dashed, points: s.points };
          })}
          height={300}
        />
        <div className="stats">
          {LINES.map((l) => (
            <Stat key={l.id} label={`${SCENARIO_LABELS[l.id]} — after ${state.plan.horizonYears} yrs`} value={money(model.netAssets(l.id, h))} />
          ))}
        </div>
      </Card>
      <Card title="Shared assumptions (identical in every line)">
        <div className="grid3">
          <Field label="Investment return (all scenarios)" hint="Try 0% or negative. Illustrative only — past index returns do not predict future returns.">
            <PctInput
              value={r.investmentAnnual}
              min={-50}
              max={20}
              step={0.5}
              onChange={(v) => {
                update((d) => void (d.plan.returns.investmentAnnual = v), { returns: 'confirmed' });
                if (v <= 0) completeQuest('testReturns');
              }}
            />
          </Field>
          <Field label="Cash savings return">
            <PctInput value={r.cashAnnual} min={-10} max={15} step={0.25} onChange={(v) => update((d) => void (d.plan.returns.cashAnnual = v), { returns: 'confirmed' })} />
          </Field>
          <Field label="Horizon shown (years)">
            <input type="number" min={1} max={50} value={state.plan.horizonYears} onChange={(e) => update((d) => void (d.plan.horizonYears = Math.max(1, Math.min(50, +e.target.value || 1))))} />
          </Field>
        </div>
        <ul className="small assumption-list">
          <li>Same starting balances, same emergency priority and target, same take-home income and calendar changes, same spending and same return in every line.</li>
          <li><b>Index investing:</b> plan money after the emergency share goes into one illustrative S&P 500-style index fund. No career change, so income stays at today's level.</li>
          <li><b>Career, then investing:</b> plan money first pays your stage development budgets, then is invested. The dashed line shows the same spending with <b>no pay rise</b>.</li>
          <li><b>Spending the money:</b> the emergency share is still saved; the rest is spent.</li>
          <li><b>Your plan:</b> three pots split by your priorities and deadlines.</li>
          <li>Changing a deadline never changes the return assumption.</li>
          <li>
            <b>Not included:</b> inflation, investment fees, taxes on returns, currency effects and future changes in living costs. All figures are nominal and simulated.
          </li>
        </ul>
      </Card>
    </div>
  );
}
