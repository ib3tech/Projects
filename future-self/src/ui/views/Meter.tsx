import { useEffect } from 'react';
import { goalFunding } from '../../engine/delusion';
import { prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Card, cx, Pill, TableWrap, useMoney } from '../kit';
import { bandCopy, Gauge } from './Overview';

export function Meter() {
  const { state, model, completeQuest } = useStore();
  const money = useMoney();
  useEffect(() => completeQuest('meter'), [completeQuest]);
  const cur = model.meters.current;
  const plan = model.meters.plan;
  const noRise = goalFunding(state, model.results.planNoRise);
  const fh = (g: { firstHitMonth: number | null; firstHitDate: string | null }) =>
    g.firstHitMonth === null ? 'Not within 50 years' : g.firstHitMonth === 0 ? 'Already reached' : `${prettyDate(g.firstHitDate!)} (${(g.firstHitMonth / 12).toFixed(1)} yrs)`;
  const r = state.plan.returns;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        {[['Current habits', cur.score, 'Existing saving only, no self-tax, actual spending'], ['Proposed plan', plan.score, 'Your plan, self-tax and planned spending']].map(([t, s, d]) => (
          <Card key={t as string} eyebrow="Delusion Meter" title={t as string} actions={<Pill>Planning measure</Pill>}>
            <div className="flex items-center gap-5">
              <Gauge score={s as number | null} size={120} />
              <div><div className="font-bold">{bandCopy(s as number | null)}</div><p className="mt-1 text-[13px] text-muted">{d as string}</p></div>
            </div>
          </Card>
        ))}
      </div>
      <Card eyebrow="How it's calculated" title="A planning measure — not a probability or a judgement">
        <p className="text-sm text-ink/80">For each active goal: <code className="rounded bg-mist px-1.5">shortfall = max(0, 1 − funded at deadline ÷ target)</code>. Score = average shortfall × 100. 0 means every goal is funded at its deadline under these assumptions. It does not mean a purchase is affordable or approved, or that a qualification will be gained.</p>
      </Card>
      <Card eyebrow="Goal by goal" title="Funding at each deadline">
        <TableWrap>
          <table className="table-data">
            <thead><tr><th>Goal</th><th>Target</th><th>Deadline</th><th>Current habits</th><th>Plan</th><th>Shortfall</th><th>First target hit</th><th>No pay rise: first hit</th></tr></thead>
            <tbody>
              {plan.goals.map((g, i) => (
                <tr key={g.goalId} className={cx(!g.included && 'opacity-50')}>
                  <td className="min-w-[120px] font-semibold">{g.name}{!g.included && <div className="text-[11px] font-normal text-faint">not scored</div>}</td>
                  <td>{money(g.target)}</td><td>{prettyDate(g.deadline)}</td>
                  <td>{money(cur.goals[i].fundedAtDeadline)}</td><td>{money(g.fundedAtDeadline)}</td>
                  <td>{money(g.shortfall)} ({Math.round(g.shortfallPct * 100)}%)</td>
                  <td className="min-w-[140px]">{fh(g)}{g.dippedBelowAfterHit && <div className="text-[11px] text-amber-ink">Reached earlier, below target at deadline</div>}</td>
                  <td className="min-w-[140px]">{fh(noRise[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="mt-2 text-xs text-faint">"First target hit" is when the forecast first reaches the target; "at deadline" is what's available then. They can differ — after negative returns or a payment.</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card eyebrow="What drives the result" title="Assumptions responsible" sub="Each row re-runs the same engine with one assumption changed.">
          <ul className="divide-y divide-line">
            {model.sensitivities.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                <span><b className="text-sm">{s.label}</b><br /><span className="text-xs text-muted">{s.explanation}</span></span>
                <b className="text-lg num">{s.score === null ? '—' : Math.round(s.score)}</b>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-faint">Returns {(r.investmentAnnual * 100).toFixed(1)}% invested / {(r.cashAnnual * 100).toFixed(1)}% cash. Inflation, fees, taxes on returns and currency effects are not modelled.</p>
        </Card>
        <Card eyebrow="Options to test" title="Changes that could close the gap" sub="Not instructions — and never a reason to spend more.">
          {model.suggestions.length === 0 ? (
            <p className="text-sm text-muted">{plan.score !== null && plan.score < 0.5 ? 'Every goal is funded at its deadline under these assumptions. Try a 0% return to stress-test it.' : 'Add goal targets to see options.'}</p>
          ) : (
            <ul className="divide-y divide-line">
              {model.suggestions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
                  <span><b className="text-sm">{s.amount ? `Find about ${money(s.amount)} more per month` : s.label}</b><br /><span className="text-xs text-muted">{s.detail}</span></span>
                  <b className="shrink-0 num">{s.score === null ? '—' : Math.round(s.score)}<span className="text-xs font-normal text-sage-deep"> {s.delta !== null && `(${s.delta >= 0 ? '+' : ''}${Math.round(s.delta)})`}</span></b>
                </li>
              ))}
              {plan.goals.filter((g) => g.included && g.shortfallPct > 0 && g.firstHitMonth !== null).map((g) => (
                <li key={g.goalId} className="flex items-center justify-between gap-4 py-2.5">
                  <span><b className="text-sm">Move "{g.name}" deadline</b><br /><span className="text-xs text-muted">The forecast first reaches it {prettyDate(g.firstHitDate!)}.</span></span>
                  <b className="shrink-0 text-xs text-sage-deep">→ 0 for this goal</b>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
