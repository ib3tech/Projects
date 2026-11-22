import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { emptyState, uid } from '../../engine/defaults';
import { suggestPlan } from '../../engine/suggest';
import { useStore } from '../../state/store';
import { Card, Field, MoneyInput, Notice, PctInput, ProvTag, useMoney } from '../kit';

export function Settings({ onEdit }: { onEdit: () => void }) {
  const { state, update, replace, completeQuest } = useStore();
  const money = useMoney();
  const r = state.plan.returns;
  const [confirmReset, setConfirmReset] = useState(false);
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState('');
  const copy = async () => {
    const t = JSON.stringify(state, null, 2);
    setJson(t);
    try { await navigator.clipboard.writeText(t); setCopied('Copied to clipboard.'); } catch { setCopied('Copy is blocked here — select the text below and copy it.'); }
  };
  return (
    <div className="flex flex-col gap-4">
      <Card eyebrow="Your answers" title="Edit what you told us" sub="Your plan settings are kept unless you choose to regenerate suggestions.">
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={onEdit}>Edit questionnaire answers</button>
          <button className="btn-ghost" onClick={() => update((d) => void (d.plan = { ...suggestPlan(d.profile), fixedSetAside: d.plan.fixedSetAside }), { rules: 'assumption', returns: 'assumption', emergency: 'assumption' })}>Regenerate suggested plan</button>
        </div>
      </Card>
      <Card eyebrow="Forecast" title="Assumptions" sub="All editable. Changing a deadline never changes these." actions={<ProvTag p={state.provenance.returns ?? 'assumption'} />}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Investment return / yr" hint="Can be 0% or negative."><PctInput value={r.investmentAnnual} min={-50} max={20} onChange={(v) => { update((d) => void (d.plan.returns.investmentAnnual = v), { returns: 'confirmed' }); if (v <= 0) completeQuest('testReturns'); }} /></Field>
          <Field label="Cash return / yr"><PctInput value={r.cashAnnual} min={-10} max={15} step={0.25} onChange={(v) => update((d) => void (d.plan.returns.cashAnnual = v), { returns: 'confirmed' })} /></Field>
          <Field label="Cost of a cash deficit (APR)" hint="Borrowing is never free."><PctInput value={r.deficitApr} min={0} max={100} onChange={(v) => update((d) => void (d.plan.returns.deficitApr = v))} /></Field>
        </div>
        <div className="eyebrow mb-1 mt-6">Calendar income changes</div>
        <p className="mb-3 text-xs text-faint">Changes that happen regardless of career development (contract change, parental leave). Applied identically in every scenario, including no pay rise.</p>
        <div className="flex flex-col gap-2">
          {state.plan.calendar.map((c, i) => (
            <div key={c.id} className="grid items-end gap-2 rounded-xl bg-paper p-3 sm:grid-cols-[1.5fr_.7fr_.7fr_1fr_auto]">
              <Field label="Label"><input className="input" value={c.label} onChange={(e) => update((d) => void (d.plan.calendar[i].label = e.target.value))} /></Field>
              <Field label="From month #"><input type="number" min={1} className="input num" value={c.startMonth} onChange={(e) => update((d) => void (d.plan.calendar[i].startMonth = Math.max(1, +e.target.value || 1)))} /></Field>
              <Field label="Until (blank = ongoing)"><input type="number" min={1} className="input num" value={c.endMonth ?? ''} onChange={(e) => update((d) => void (d.plan.calendar[i].endMonth = e.target.value ? +e.target.value : undefined))} /></Field>
              <Field label="Change to take-home"><MoneyInput allowNegative value={c.amount} onChange={(v) => update((d) => void (d.plan.calendar[i].amount = v))} /></Field>
              <button className="grid h-10 w-10 place-items-center rounded-lg text-faint hover:bg-mist" aria-label="Remove" onClick={() => update((d) => void d.plan.calendar.splice(i, 1))}><X size={15} /></button>
            </div>
          ))}
          <button className="btn-soft btn-sm self-start" onClick={() => update((d) => void d.plan.calendar.push({ id: uid('cal'), label: '', startMonth: 12, amount: 0 }))}><Plus size={14} /> Add income change</button>
        </div>
        <div className="mt-5 grid gap-3 text-[13px] text-ink/80 sm:grid-cols-2">
          <div><b>Modelled:</b> income and career stages, essential and discretionary spending, self-tax, rebates and sweep, emergency allocation, pot contributions, growth/loss, training expenses, debts, unallocated cash and deficits.</div>
          <div><b>Not modelled:</b> inflation, investment fees, taxes on returns, currency effects, future living-cost changes. Gross salary is informational only.</div>
        </div>
      </Card>
      <Card eyebrow="Honesty" title="Confirmed information vs assumptions">
        <ul className="divide-y divide-line">
          {Object.keys(state.provenance).length === 0 && <li className="py-2 text-sm text-muted">Nothing recorded yet.</li>}
          {Object.entries(state.provenance).map(([k, v]) => <li key={k} className="flex items-center justify-between py-1.5 text-xs"><span className="text-muted">{k}</span><ProvTag p={v} /></li>)}
        </ul>
        <p className="mt-2 text-xs text-faint">Your take-home: {money(state.profile.takeHome)}. Example figures are never presented as facts about you.</p>
      </Card>
      <Card eyebrow="Your data" title="Stored only in this browser">
        <Notice>Everything is simulated. No bank connection, no real accounts, no real transfers.</Notice>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={copy}>Copy my plan (JSON)</button>
          {confirmReset ? (
            <><span className="text-sm">Delete everything and start again?</span><button className="btn bg-rose text-white" onClick={() => { replace(emptyState()); setConfirmReset(false); }}>Yes, delete</button><button className="btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button></>
          ) : <button className="btn border border-rose/40 text-rose" onClick={() => setConfirmReset(true)}>Reset everything</button>}
        </div>
        {copied && <p className="mt-2 text-xs text-muted">{copied}</p>}
        {json && <textarea id="plan-json" readOnly rows={6} value={json} className="input mt-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />}
      </Card>
    </div>
  );
}
