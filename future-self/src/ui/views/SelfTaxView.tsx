import { useState } from 'react';
import { CATEGORIES, CategoryId, catDef, clampRate } from '../../engine/categories';
import { explainPurchase } from '../../engine/selfTax';
import { suggestRules } from '../../engine/suggest';
import { useStore } from '../../state/store';
import { Card, Field, MoneyInput, PctInput, ProvTag, Seg, Toggle, useMoney } from '../components/inputs';

export function SelfTaxView() {
  const { state, model, update } = useStore();
  const money = useMoney();
  const plan = state.plan;
  const p = state.profile;
  const r1 = model.summary.month1;
  const reasons = suggestRules(p).reasons;
  const [cat, setCat] = useState<CategoryId>('eatingOut');
  const [price, setPrice] = useState(0);
  const [spent, setSpent] = useState(0);
  const ex = explainPurchase(cat, price, spent, plan.rules[cat]);
  const conf = { rules: 'confirmed' as const };
  const availableAfterEssentials = r1.income - r1.essentials - r1.debtRepayments - r1.lifestyleFromExtra;

  return (
    <div className="stack">
      <Card title="Self-tax & the unspent-money sweep" sub="Self-tax is a voluntary transfer of your own existing money into your future plan. It is not income, not government tax, and not free money.">
        <div className="explain-flow">
          <div><span>Available after essentials</span><b>{money(availableAfterEssentials)}</b></div>
          <div><span>− Purchases (planned)</span><b>{money(r1.discretionary)}</b></div>
          <div><span>Self-tax moved immediately</span><b>{money(r1.levy, true)}</b></div>
          {r1.rebate > 0 && <div><span>− Charity rebate returned to you (kept as spendable cash)</span><b>{money(r1.rebate, true)}</b></div>}
          <div><span>Remaining swept at month end</span><b>{money(r1.sweep, true)}</b></div>
          <div className="total-line"><span>Total progress this month</span><b>{money(r1.toPlan, true)}</b></div>
        </div>
        <p className="small muted">
          Total = available − purchases − rebate = {money(r1.toPlan)}. The levy is part of that money, not added on top. With a full sweep, rates and allowances change <em>when</em> money is earmarked, not how much you save — only spending less creates more surplus.
          {r1.deficitRepaid > 0 && ` ${money(r1.deficitRepaid)} first cleared an earlier deficit.`}
        </p>
        <Toggle checked={plan.selfTaxEnabled} onChange={(v) => update((d) => void (d.plan.selfTaxEnabled = v))} label="Self-tax enabled" />
        <Field label="Transfer mode">
          <Seg
            value={plan.contribution.mode}
            onChange={(v) => update((d) => void (d.plan.contribution = v === 'sweep' ? { mode: 'sweep' } : { mode: 'manual', ceiling: Math.max(d.profile.existingMonthlySaving, 0) }))}
            options={[
              { v: 'sweep', label: 'Full sweep of unspent money' },
              { v: 'manual', label: 'Manual transfers with a ceiling' },
            ]}
          />
        </Field>
        {plan.contribution.mode === 'manual' && (
          <>
            <Field label="Monthly contribution ceiling (levy + top-up)">
              <MoneyInput value={plan.contribution.ceiling} onChange={(v) => update((d) => void (d.plan.contribution = { mode: 'manual', ceiling: v }))} />
            </Field>
            <p className="notice">Unallocated cash this month (stays in your account, not counted toward goals): <b>{money(Math.max(0, r1.available - r1.toPlan))}</b></p>
          </>
        )}
      </Card>

      <Card title="Category rules" sub="Rates apply only to spending above each monthly tax-free allowance. Higher rates are NOT assumed to change your behaviour — test that with 'planned spending'.">
        <div className="table-wrap">
          <table className="data rules">
            <thead>
              <tr>
                <th>Category</th>
                <th>Actual</th>
                <th>Planned (your test)</th>
                <th>Protected</th>
                <th>Rate</th>
                <th>Tax-free allowance</th>
                <th>Levy (month 1)</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const rule = plan.rules[c.id] ?? { rate: 0, allowance: 0, protected: true };
                const locked = c.kind === 'zero' || c.kind === 'internal';
                const plannedV = plan.plannedSpending[c.id] ?? p.actualSpending[c.id] ?? 0;
                const levy = Math.round(Math.max(0, plannedV - rule.allowance) * clampRate(c.id, rule.rate, rule.protected));
                return (
                  <tr key={c.id} className={locked ? 'dim' : ''}>
                    <td title={reasons[c.id]}>
                      <b>{c.label}</b>
                      <div className="small muted">{locked ? (c.kind === 'zero' ? 'Zero-rated' : 'Not spending — never taxed') : c.hint}</div>
                    </td>
                    <td>{c.kind === 'internal' ? '—' : money(p.actualSpending[c.id] ?? 0)}</td>
                    <td>{c.kind === 'internal' || c.kind === 'zero' ? '—' : <MoneyInput ariaLabel={`Planned ${c.label}`} value={plannedV} onChange={(v) => update((d) => void (d.plan.plannedSpending[c.id] = v), { plannedSpending: 'confirmed' })} />}</td>
                    <td>{locked ? 'Always' : c.kind === 'charity' ? '—' : <input type="checkbox" aria-label={`Protect ${c.label}`} checked={rule.protected} onChange={(e) => update((d) => void (d.plan.rules[c.id] = { ...rule, protected: e.target.checked }), conf)} />}</td>
                    <td>
                      {locked || (rule.protected && c.kind !== 'charity') ? (
                        '0%'
                      ) : (
                        <PctInput ariaLabel={`${c.label} rate`} value={rule.rate} min={c.kind === 'charity' ? -5 : 0} max={c.kind === 'charity' ? 0 : 100} step={c.kind === 'charity' ? 0.5 : 1} onChange={(v) => update((d) => void (d.plan.rules[c.id] = { ...rule, rate: clampRate(c.id, v, rule.protected) }), conf)} />
                      )}
                      {!locked && <ProvTag p={state.provenance.rules ?? 'assumption'} />}
                    </td>
                    <td>{locked || (rule.protected && c.kind !== 'charity') ? '—' : <MoneyInput ariaLabel={`${c.label} allowance`} value={rule.allowance} onChange={(v) => update((d) => void (d.plan.rules[c.id] = { ...rule, allowance: v }), conf)} />}</td>
                    <td>{levy < 0 ? `rebate ${money(-levy, true)}` : money(levy, true)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="row">
          <button className="btn ghost small" onClick={() => update((d) => void (d.plan.rules = suggestRules(d.profile).rules), { rules: 'assumption' })}>
            Reset to suggested rates
          </button>
          <button className="btn ghost small" onClick={() => update((d) => void (d.plan.plannedSpending = { ...d.profile.actualSpending }))}>
            Reset planned spending to actual
          </button>
        </div>
        <p className="small muted">
          Charity rebates (up to 5%) are funded only from positive levies, can never create an overdraft, and are returned as spendable money — so they are excluded from the sweep and reduce goal funding by exactly the rebate ({money(r1.rebate, true)} in month 1). Requested this month: {money(model.summary.month1.levyRequested, true)} levy.
        </p>
      </Card>

      <Card title="Explain a purchase" sub="See the purchase price, the self-tax, and the total cash that leaves your spending money straight away.">
        <div className="grid3">
          <Field label="Category">
            <select value={cat} onChange={(e) => setCat(e.target.value as CategoryId)}>
              {CATEGORIES.filter((c) => c.kind !== 'internal').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Already spent this month">
            <MoneyInput value={spent} onChange={setSpent} />
          </Field>
          <Field label="Purchase price">
            <MoneyInput value={price} onChange={setPrice} />
          </Field>
        </div>
        <ul className="kv">
          <li><span>Purchase price (to the shop)</span><b>{money(ex.price, true)}</b></li>
          <li><span>Allowance left before this purchase</span><b>{money(ex.allowanceLeftBefore, true)}</b></li>
          <li><span>Part above allowance × {(ex.rate * 100).toFixed(1)}%</span><b>{money(ex.taxablePart, true)}</b></li>
          <li><span>Self-tax (to your own plan{ex.rate < 0 ? ' — rebate, if levies can fund it' : ''})</span><b>{money(ex.selfTax, true)}</b></li>
          <li><span>Total immediate cash movement</span><b>{money(ex.immediateCashMovement, true)}</b></li>
        </ul>
        <p className="small muted">{ex.note} ({catDef(cat).label})</p>
      </Card>
    </div>
  );
}
