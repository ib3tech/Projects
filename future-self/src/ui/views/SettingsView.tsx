import { useState } from 'react';
import { emptyState, uid } from '../../engine/defaults';
import { suggestPlan } from '../../engine/suggest';
import { useStore } from '../../state/store';
import { Card, Field, MoneyInput, PctInput, ProvTag, useMoney } from '../components/inputs';

export function SettingsView({ editProfile }: { editProfile: () => void }) {
  const { state, update, replace, completeQuest } = useStore();
  const money = useMoney();
  const r = state.plan.returns;
  const prov = Object.entries(state.provenance);

  const [confirmReset, setConfirmReset] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState('');
  const json = JSON.stringify(state, null, 2);
  const copyJson = async () => {
    setShowJson(true);
    try {
      await navigator.clipboard.writeText(json);
      setCopied('Copied to clipboard.');
    } catch {
      setCopied('Copy is blocked here — select the text below and copy it.');
    }
  };

  return (
    <div className="stack">
      <Card title="Your answers">
        <p className="muted small">Change anything you told us. Your plan settings are kept unless you choose to regenerate suggestions.</p>
        <div className="row wrap">
          <button className="btn primary" onClick={editProfile}>Edit questionnaire answers</button>
          <button className="btn ghost" onClick={() => update((d) => void (d.plan = suggestPlan(d.profile)), { rules: 'assumption', returns: 'assumption', emergency: 'assumption' })}>
            Regenerate suggested plan from my answers
          </button>
        </div>
      </Card>

      <Card title="Forecast assumptions" sub="All editable. Changing a deadline never changes these.">
        <div className="grid3">
          <Field label="Investment return / yr" prov={state.provenance.returns ?? 'assumption'} hint="Can be 0% or negative.">
            <PctInput value={r.investmentAnnual} min={-50} max={20} onChange={(v) => { update((d) => void (d.plan.returns.investmentAnnual = v), { returns: 'confirmed' }); if (v <= 0) completeQuest('testReturns'); }} />
          </Field>
          <Field label="Cash savings return / yr">
            <PctInput value={r.cashAnnual} min={-10} max={15} step={0.25} onChange={(v) => update((d) => void (d.plan.returns.cashAnnual = v), { returns: 'confirmed' })} />
          </Field>
          <Field label="Cost of a cash deficit (APR)" hint="Borrowing is never assumed to be free.">
            <PctInput value={r.deficitApr} min={0} max={100} onChange={(v) => update((d) => void (d.plan.returns.deficitApr = v))} />
          </Field>
        </div>
        <h4>Calendar-based income changes</h4>
        <p className="small muted">Changes that happen regardless of career development (e.g. contract change, parental leave). Applied identically in every scenario, including no pay rise.</p>
        {state.plan.calendar.map((c, i) => (
          <div className="row wrap" key={c.id}>
            <input aria-label="Label" value={c.label} placeholder="Label" onChange={(e) => update((d) => void (d.plan.calendar[i].label = e.target.value))} />
            <Field label="From month #">
              <input type="number" min={1} value={c.startMonth} onChange={(e) => update((d) => void (d.plan.calendar[i].startMonth = Math.max(1, +e.target.value || 1)))} />
            </Field>
            <Field label="Until month # (blank = ongoing)">
              <input type="number" min={1} value={c.endMonth ?? ''} onChange={(e) => update((d) => void (d.plan.calendar[i].endMonth = e.target.value ? +e.target.value : undefined))} />
            </Field>
            <Field label="Change to monthly take-home">
              <MoneyInput allowNegative value={c.amount} onChange={(v) => update((d) => void (d.plan.calendar[i].amount = v))} />
            </Field>
            <button className="icon-btn" aria-label="Remove" onClick={() => update((d) => void d.plan.calendar.splice(i, 1))}>×</button>
          </div>
        ))}
        <button className="btn ghost small" onClick={() => update((d) => void d.plan.calendar.push({ id: uid('cal'), label: '', startMonth: 12, amount: 0 }))}>+ Add income change</button>
        <h4>What is (and is not) modelled</h4>
        <ul className="small assumption-list">
          <li>Included: income and career-stage changes, essential and discretionary spending, self-tax, rebates and sweep, emergency allocation, pot contributions, growth/loss, training expenses, debts, unallocated cash and deficits.</li>
          <li>Not included: inflation, investment fees, taxes on returns, currency effects, changes in future living costs, employer pension contributions.</li>
          <li>Gross salary is informational; only take-home income enters the forecast.</li>
        </ul>
      </Card>

      <Card title="Confirmed information vs assumptions">
        <ul className="kv">
          {prov.length === 0 && <li className="muted small">Nothing recorded yet.</li>}
          {prov.map(([k, v]) => (
            <li key={k}><span className="small">{k}</span><ProvTag p={v} /></li>
          ))}
        </ul>
        <p className="small muted">Your income: {money(state.profile.takeHome)} (you entered). Example figures are never presented as facts about you.</p>
      </Card>

      <Card title="Data">
        <p className="notice">Everything is simulated and stored only in this browser's local storage. No bank connection, no real accounts, no real transfers.</p>
        <div className="row wrap">
          <button className="btn ghost" onClick={copyJson}>Copy my plan (JSON)</button>
          {confirmReset ? (
            <>
              <span className="small">Delete everything in this browser and start again?</span>
              <button className="btn danger" onClick={() => { replace(emptyState()); setConfirmReset(false); }}>Yes, delete</button>
              <button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn danger" onClick={() => setConfirmReset(true)}>Reset everything</button>
          )}
        </div>
        {copied && <p className="small muted">{copied}</p>}
        {showJson && <textarea id="plan-json" readOnly rows={8} value={json} onFocus={(e) => e.currentTarget.select()} />}
      </Card>
    </div>
  );
}
