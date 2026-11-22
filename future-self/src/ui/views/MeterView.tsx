import { goalFunding } from '../../engine/delusion';
import { prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Card, ProvTag, useMoney } from '../components/inputs';
import { MeterGauge } from './Dashboard';

export function MeterView() {
  const { state, model } = useStore();
  const money = useMoney();
  const cur = model.meters.current;
  const plan = model.meters.plan;
  const noRise = goalFunding(state, model.results.planNoRise);
  const fh = (g: { firstHitMonth: number | null; firstHitDate: string | null }) =>
    g.firstHitMonth === null ? 'Not within 50 years' : g.firstHitMonth === 0 ? 'Already reached' : prettyDate(g.firstHitDate!);
  const yrs = (m: number | null) => (m === null || m === 0 ? '' : ` (${(m / 12).toFixed(1)} yrs)`);
  const p = state.plan;

  return (
    <div className="stack">
      <Card title="The Delusion Meter" sub="Do your habits, money, expected career progression and deadlines support your goals?">
        <div className="grid2">
          <div>
            <h4 className="center">Current habits</h4>
            <MeterGauge score={cur.score} />
          </div>
          <div>
            <h4 className="center">Proposed plan</h4>
            <MeterGauge score={plan.score} />
          </div>
        </div>
        <details className="formula">
          <summary>How the score is calculated</summary>
          <p>
            For each active goal: <code>shortfall % = max(0, 1 − funded amount at deadline ÷ target)</code>. Overall score = average shortfall % across active goals × 100. 0 = every goal funded at its deadline under these assumptions; 100 = nothing funded.
          </p>
          <p>This is a planning measure, not a probability of success and not a judgement of you. It does not mean a purchase is affordable or approved, or that a qualification will be gained.</p>
        </details>
      </Card>

      <Card title="Funding at each goal's deadline">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Goal</th>
                <th>Target</th>
                <th>Deadline</th>
                <th>Current habits at deadline</th>
                <th>Plan at deadline</th>
                <th>Remaining shortfall</th>
                <th>First projected target hit</th>
                <th>No pay rise: first hit</th>
              </tr>
            </thead>
            <tbody>
              {plan.goals.map((g, i) => (
                <tr key={g.goalId} className={g.included ? '' : 'dim'}>
                  <td>
                    {g.name || g.kind}
                    {!g.included && <div className="small muted">not scored (no target or inactive)</div>}
                  </td>
                  <td>{money(g.target)}</td>
                  <td>{prettyDate(g.deadline)}</td>
                  <td>{money(cur.goals[i].fundedAtDeadline)}</td>
                  <td>{money(g.fundedAtDeadline)}</td>
                  <td>{money(g.shortfall)} ({(g.shortfallPct * 100).toFixed(0)}%)</td>
                  <td>
                    {fh(g)}
                    {yrs(g.firstHitMonth)}
                    {g.dippedBelowAfterHit && <div className="small warn-text">Reached earlier but below target at the deadline</div>}
                  </td>
                  <td>
                    {fh(noRise[i])}
                    {yrs(noRise[i].firstHitMonth)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">"First target hit" is the first month the forecast reaches the target; "at deadline" is what is available at the deadline. They can differ — e.g. after negative returns or a payment.</p>
      </Card>

      <Card title="Assumptions responsible for the result" sub="Each row re-runs the same engine with one assumption changed.">
        <ul className="kv">
          {model.sensitivities.map((s) => (
            <li key={s.id}>
              <span>
                <b>{s.label}</b>
                <br />
                <span className="small muted">{s.explanation}</span>
              </span>
              <b>{s.score === null ? '—' : s.score.toFixed(0)}</b>
            </li>
          ))}
        </ul>
        <ul className="assumption-list small">
          <li>
            Investment return {(p.returns.investmentAnnual * 100).toFixed(1)}%/yr, cash {(p.returns.cashAnnual * 100).toFixed(1)}%/yr <ProvTag p={state.provenance['returns'] ?? 'assumption'} />
          </li>
          <li>
            Contribution mode: {p.contribution.mode === 'sweep' ? 'full sweep of unspent money' : `manual, ceiling ${money(p.contribution.ceiling)}/month`}
          </li>
          <li>Emergency reserve target {money(p.emergency.target)} ({p.emergency.mode})</li>
          <li>Career stage incomes and dates as entered <ProvTag p="assumption" /></li>
          <li>Spending stays flat in nominal terms; inflation, fees, taxes on returns and currency effects are not modelled.</li>
        </ul>
      </Card>

      <Card title="Changes that could close the gap" sub="Options to test — not instructions, and never a reason to spend more.">
        {model.suggestions.length === 0 ? (
          <p className="muted">{plan.score !== null && plan.score < 0.5 ? 'Your goals are funded at their deadlines under these assumptions. Try a 0% return in Settings to stress-test it.' : 'Add goal targets to see suggestions.'}</p>
        ) : (
          <ul className="kv">
            {model.suggestions.map((s) => (
              <li key={s.id}>
                <span>
                  <b>{s.amount ? `Find about ${money(s.amount)} more per month (earn more or spend less)` : s.label}</b>
                  <br />
                  <span className="small muted">{s.detail}</span>
                </span>
                <b>
                  {s.score === null ? '—' : s.score.toFixed(0)}
                  {s.delta !== null && <span className="small muted"> ({s.delta >= 0 ? '+' : ''}{s.delta.toFixed(0)})</span>}
                </b>
              </li>
            ))}
            {plan.goals
              .filter((g) => g.included && g.shortfallPct > 0)
              .map((g) => (
                <li key={`dl-${g.goalId}`}>
                  <span>
                    <b>Move "{g.name || g.kind}" deadline</b>
                    <br />
                    <span className="small muted">The forecast first reaches this target {g.firstHitMonth === null ? 'beyond 50 years' : prettyDate(g.firstHitDate!)}.</span>
                  </span>
                  <b>{g.firstHitMonth === null ? '—' : '→ 0 for this goal'}</b>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
