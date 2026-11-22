import { useEffect, useState } from 'react';
import { dateOfMonth, prettyDate } from '../../engine/profile';
import { SCENARIO_LABELS, ScenarioId } from '../../engine/scenarios';
import { useStore } from '../../state/store';
import { Card, useMoney } from '../components/inputs';
import { ALL_SCENARIOS } from '../../engine/model';

export function MathView() {
  const { state, model, completeQuest } = useStore();
  const money = useMoney();
  const [sc, setSc] = useState<ScenarioId>('plan');
  const [m, setM] = useState(1);
  useEffect(() => completeQuest('openMath'), [completeQuest]);
  const res = model.results[sc];
  const r = res.rows[m - 1];
  const spending = r.essentials + r.discretionary + r.lifestyleFromExtra + r.spentSurplus;
  const potNames: Record<string, string> = Object.fromEntries(res.input.pots.map((p) => [p.id, p.label]));
  const pm = (v: number) => money(v, true);
  const h = model.horizon;

  return (
    <div className="stack">
      <Card title="Open the math" sub="One month-by-month engine drives every number in the app. Pick a scenario and month.">
        <div className="row wrap">
          <select value={sc} onChange={(e) => setSc(e.target.value as ScenarioId)} aria-label="Scenario">
            {ALL_SCENARIOS.map((id) => (
              <option key={id} value={id}>
                {SCENARIO_LABELS[id]}
              </option>
            ))}
          </select>
          <button className="btn ghost small" onClick={() => setM((x) => Math.max(1, x - 1))} aria-label="Previous month">‹</button>
          <input type="range" min={1} max={h} value={m} onChange={(e) => setM(+e.target.value)} aria-label="Month" className="grow" />
          <button className="btn ghost small" onClick={() => setM((x) => Math.min(h, x + 1))} aria-label="Next month">›</button>
          <b>
            Month {m} · {prettyDate(dateOfMonth(state.profile.startDate, m))}
          </b>
        </div>
      </Card>

      <Card title="Tracked-asset reconciliation">
        <ul className="ledger">
          <li><span>Opening tracked assets</span><b>{pm(r.openingAssets)}</b></li>
          <li><span>+ income received</span><b>{pm(r.income)}</b></li>
          <li><span>+ investment growth / loss</span><b>{pm(r.growth)}</b></li>
          <li><span>− actual spending (essentials {pm(r.essentials)}, discretionary {pm(r.discretionary)}{r.lifestyleFromExtra ? `, from extra income ${pm(r.lifestyleFromExtra)}` : ''}{r.spentSurplus ? `, spent surplus ${pm(r.spentSurplus)}` : ''})</span><b>−{pm(spending)}</b></li>
          <li><span>− training paid</span><b>−{pm(r.training)}</b></li>
          <li><span>− other expenses paid (deficit interest)</span><b>−{pm(r.deficitInterest)}</b></li>
          <li><span>− debt repayments (to liabilities)</span><b>−{pm(r.debtRepayments)}</b></li>
          <li className="total-line"><span>= closing tracked assets</span><b>{pm(r.closingAssets)}</b></li>
        </ul>
        <p className={`band ${r.reconciles ? 'tone-good' : 'tone-warn'}`}>{r.reconciles ? '✓ Reconciles to the penny with the account and pot balances below' : '✗ Does not reconcile'}</p>
        <h4>Closing balances</h4>
        <ul className="kv">
          <li><span>Cash (unallocated){r.cash < 0 ? ' — deficit' : ''}</span><b>{pm(r.cash)}</b></li>
          <li><span>Emergency reserve</span><b>{pm(r.emergency)}</b></li>
          {Object.entries(r.pots).map(([id, v]) => (
            <li key={id}><span>{potNames[id] || id}</span><b>{pm(v)}</b></li>
          ))}
          <li className="total-line"><span>Sum = closing tracked assets</span><b>{pm(r.cash + r.emergency + Object.values(r.pots).reduce((a, b) => a + b, 0))}</b></li>
          <li><span>Debts outstanding (liability, interest {pm(r.debtInterest)} added this month)</span><b>{pm(r.debt)}</b></li>
        </ul>
      </Card>

      <Card title="Where this month's surplus went">
        <ul className="ledger">
          <li><span>Surplus = income − essentials − repayments − spending</span><b>{pm(r.surplus)}</b></li>
          <li><span>Used to clear an earlier deficit first</span><b>{pm(r.deficitRepaid)}</b></li>
          <li><span>Available for the plan</span><b>{pm(r.available)}</b></li>
          <li><span>Self-tax requested / transferred</span><b>{pm(r.levyRequested)} / {pm(r.levy)}</b></li>
          <li><span>Charity rebate returned (kept as cash, excluded from sweep)</span><b>{pm(r.rebate)}</b></li>
          <li><span>Sweep / manual top-up</span><b>{pm(r.sweep)}</b></li>
          <li className="total-line"><span>Into plan (levy − rebate + sweep)</span><b>{pm(r.toPlan)}</b></li>
          <li><span>→ Emergency reserve</span><b>{pm(r.toEmergency)}</b></li>
          {Object.entries(r.toPots).map(([id, v]) => (
            <li key={id}><span>→ {potNames[id] || id}</span><b>{pm(v)}</b></li>
          ))}
          <li><span>→ Unallocated (all goals funded)</span><b>{pm(r.overflow)}</b></li>
        </ul>
      </Card>

      <Card title="Formulas">
        <ul className="small formula-list">
          <li>Monthly rate = (1 + annual)^(1/12) − 1, applied to opening pot balances; growth rounded to the penny.</li>
          <li>Income = absolute take-home of the active stage + calendar adjustments. A stage becomes active at max(earliest date, funded month + 1 + delay).</li>
          <li>Extra-income lifestyle spending = (stage take-home − starting take-home) × (1 − share to goals).</li>
          <li>Levy_c = round(max(0, spend_c − allowance_c) × rate_c); levy ≤ available; rebate ≤ levy; into plan = available − rebate (sweep) or min(ceiling, available) − rebate (manual).</li>
          <li>Emergency first / alongside (share) / starter-then-share; never more than the reserve still needs.</li>
          <li>Goal weights = priority × need ÷ months to deadline (or your own %); water-filled so no pot exceeds its need.</li>
          <li>Career pot pays a stage's budget once it holds it (expense). Career funded = paid + pot balance.</li>
          <li>Deficit: negative cash accrues the assumed deficit APR; positive surplus clears it before any contribution.</li>
        </ul>
      </Card>
    </div>
  );
}
