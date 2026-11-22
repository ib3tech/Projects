import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ALL_SCENARIOS } from '../../engine/model';
import { dateOfMonth, prettyDate } from '../../engine/profile';
import { SCENARIO_LABELS, ScenarioId } from '../../engine/scenarios';
import { useStore } from '../../state/store';
import { Card, cx, useMoney } from '../kit';

function Row({ k, v, strong, neg }: { k: React.ReactNode; v: string; strong?: boolean; neg?: boolean }) {
  return (
    <li className={cx('flex justify-between gap-4 py-2 text-[14px] num', strong ? 'border-t-2 border-ink font-extrabold' : 'border-b border-dashed border-line')}>
      <span className="min-w-0 text-ink/80">{k}</span>
      <b className={cx('shrink-0', neg && 'text-rose')}>{v}</b>
    </li>
  );
}

/** Ledger for one month of one scenario: tracked-asset reconciliation + where the surplus went. */
export function MathLedger({ scenario, m }: { scenario: ScenarioId; m: number }) {
  const { model } = useStore();
  const money = useMoney();
  const res = model.results[scenario];
  const r = res.rows[m - 1];
  const pm = (v: number) => money(v, true);
  const names: Record<string, string> = Object.fromEntries(res.input.pots.map((p) => [p.id, p.label]));
  const spending = r.essentials + r.discretionary + r.lifestyleFromExtra + r.spentSurplus;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="eyebrow mb-1">Tracked-asset reconciliation</div>
        <ul>
          <Row k="Opening tracked assets" v={pm(r.openingAssets)} />
          <Row k="+ income received" v={pm(r.income)} />
          <Row k="+ investment growth / loss" v={pm(r.growth)} neg={r.growth < 0} />
          <Row k={`− actual spending${r.lifestyleFromExtra ? ' (incl. lifestyle from pay rise)' : ''}`} v={`−${pm(spending)}`} />
          <Row k="− training paid" v={`−${pm(r.training)}`} />
          <Row k="− deficit interest" v={`−${pm(r.deficitInterest)}`} />
          <Row k="− debt repayments (to liabilities)" v={`−${pm(r.debtRepayments)}`} />
          <Row k="= closing tracked assets" v={pm(r.closingAssets)} strong />
        </ul>
        <p className={cx('mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold', r.reconciles ? 'bg-sage-soft text-sage-deep' : 'bg-rose/10 text-rose')}>
          {r.reconciles ? '✓ Reconciles to the penny with the balances' : '✗ Does not reconcile'}
        </p>
        <div className="eyebrow mb-1 mt-4">Closing balances</div>
        <ul>
          <Row k={`Cash (unallocated)${r.cash < 0 ? ' — deficit' : ''}`} v={pm(r.cash)} neg={r.cash < 0} />
          <Row k="Emergency reserve" v={pm(r.emergency)} />
          {Object.entries(r.pots).map(([id, v]) => <Row key={id} k={names[id] || id} v={pm(v)} />)}
          <Row k="Debts outstanding (liability)" v={pm(r.debt)} />
        </ul>
      </div>
      <div>
        <div className="eyebrow mb-1">Where this month's surplus went</div>
        <ul>
          <Row k="Surplus after essentials, repayments, spending" v={pm(r.surplus)} neg={r.surplus < 0} />
          <Row k="Cleared an earlier deficit first" v={pm(r.deficitRepaid)} />
          <Row k="Available for the plan" v={pm(r.available)} />
          <Row k="Self-tax requested / moved" v={`${pm(r.levyRequested)} / ${pm(r.levy)}`} />
          <Row k="Charity rebate kept as spendable cash" v={pm(r.rebate)} />
          <Row k="Sweep / manual top-up" v={pm(r.sweep)} />
          <Row k="Into plan (self-tax − rebate + sweep)" v={pm(r.toPlan)} strong />
          <Row k="→ Emergency reserve" v={pm(r.toEmergency)} />
          {Object.entries(r.toPots).map(([id, v]) => <Row key={id} k={`→ ${names[id] || id}`} v={pm(v)} />)}
          <Row k="→ Unallocated (every goal funded)" v={pm(r.overflow)} />
        </ul>
      </div>
    </div>
  );
}

export function MathView() {
  const { state, model, completeQuest } = useStore();
  const [sc, setSc] = useState<ScenarioId>('plan');
  const [m, setM] = useState(1);
  const h = model.horizon;
  useEffect(() => completeQuest('openMath'), [completeQuest]);
  return (
    <div className="flex flex-col gap-4">
      <Card eyebrow="One engine" title="Open the math" sub="Pick a scenario and month. Every dashboard, chart and meter reads from these same rows.">
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" aria-label="Scenario" value={sc} onChange={(e) => setSc(e.target.value as ScenarioId)}>
            {ALL_SCENARIOS.map((id) => <option key={id} value={id}>{SCENARIO_LABELS[id]}</option>)}
          </select>
          <button className="btn-ghost btn-sm" aria-label="Previous month" onClick={() => setM((x) => Math.max(1, x - 1))}><ChevronLeft size={16} /></button>
          <input type="range" min={1} max={h} value={m} onChange={(e) => setM(+e.target.value)} aria-label="Month" className="min-w-[120px] flex-1" />
          <button className="btn-ghost btn-sm" aria-label="Next month" onClick={() => setM((x) => Math.min(h, x + 1))}><ChevronRight size={16} /></button>
          <b className="text-sm num">Month {m} · {prettyDate(dateOfMonth(state.profile.startDate, m))}</b>
        </div>
      </Card>
      <Card><MathLedger scenario={sc} m={m} /></Card>
      <Card eyebrow="Documented" title="Formulas">
        <ul className="list-disc space-y-1.5 pl-5 text-[13px] text-ink/80">
          <li>Monthly rate = (1 + annual)^(1/12) − 1 on opening pot balances, rounded to the penny.</li>
          <li>Income = absolute take-home of the active career stage + calendar changes. A stage starts at max(earliest date, month funded + 1 + delay).</li>
          <li>Self-tax = Σ round(max(0, spend − allowance) × rate) + payday set-aside, never more than the money available. Rebates ≤ self-tax.</li>
          <li>Into plan = available − rebate (full sweep) or min(max(ceiling, set-aside), available) − rebate (manual).</li>
          <li>Emergency first / alongside / starter-then-split; never more than the reserve still needs.</li>
          <li>Goal weights = priority × money still needed ÷ months left; no pot gets more than it needs.</li>
          <li>A cash deficit costs the assumed APR and is cleared before any goal is funded.</li>
        </ul>
      </Card>
    </div>
  );
}
