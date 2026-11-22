import { Bot, Sparkles, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { applyProposal, buildPlannerPrompt, builtInProposal, evaluateProposal, evaluationForAi, parseProposal, PlannerProposal } from '../../engine/aiPlanner';
import { CATEGORIES, CategoryId, catDef, clampRate } from '../../engine/categories';
import { prettyDate } from '../../engine/profile';
import { explainPurchase } from '../../engine/selfTax';
import { suggestRules } from '../../engine/suggest';
import { useStore } from '../../state/store';
import { Card, Choice, cx, Field, MoneyInput, Notice, PctInput, Pill, ProvTag, Stat, TableWrap, Toggle, useMoney } from '../kit';

type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  json: (input: string, opts?: Record<string, unknown>) => Promise<unknown>;
  limits: () => Promise<{ tools?: { maxCount: number } }>;
};
declare global {
  interface Window { claude?: { use: (name: string) => Promise<unknown> } }
}

const ERRORS: Record<string, string> = {
  not_granted: 'AI was not allowed for this page, so the built-in planner was used.',
  sampling_disabled: 'AI is not available on this account, so the built-in planner was used.',
  rate_limited: 'Too many AI requests just now. Try again in a little while.',
  session_expired: 'Please sign in to Claude again, then retry.',
  refused: 'The AI declined this request. Try rewording your note.',
  invalid_json: 'The AI reply could not be read. Please try again.',
  empty_completion: 'The AI returned nothing. Please try again.',
};

export const setByLabel = (s: 'you' | 'ai' | 'built-in') => (s === 'ai' ? 'the AI, accepted by you' : s === 'built-in' ? 'the built-in planner, accepted by you' : 'you');

export function AiPlanner() {
  const { state, update } = useStore();
  const money = useMoney();
  const [status, setStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const sampleRef = useRef<SampleFn | null>(null);
  const ctl = useRef<AbortController | null>(null);
  const proposal = state.planner.proposal;

  useEffect(() => {
    let live = true;
    (async () => {
      if (!window.claude?.use) return setStatus('unavailable');
      const s = (await window.claude.use('sample').catch(() => null)) as SampleFn | null;
      if (!live) return;
      sampleRef.current = s;
      setStatus(s ? 'available' : 'unavailable');
    })();
    return () => { live = false; ctl.current?.abort(); };
  }, []);

  const save = (pr: PlannerProposal | null) => update((d) => void (d.planner = { proposal: pr, appliedAt: d.planner.appliedAt }));
  const runBuiltIn = () => { save(builtInProposal(state)); setError(''); };

  const runAi = async () => {
    const sample = sampleRef.current;
    if (!sample) return runBuiltIn();
    setBusy(true); setError(''); setProgress('Reading your numbers…');
    ctl.current = new AbortController();
    const snap = state;
    try {
      const limits = await sample.limits().catch(() => null);
      const tools = limits?.tools ? [{
        name: 'evaluate_plan',
        description: "Runs a draft proposal through Future Self's calculation engine. Returns funding-gap score, money into the plan and each goal's funding at its deadline (before vs after) plus rule adjustments. Input: {proposal: <same shape as the final answer>}.",
        inputSchema: { type: 'object', properties: { proposal: { type: 'object' } }, required: ['proposal'] },
        execute: (input: { proposal?: unknown }) => { setProgress('Testing a draft against the engine…'); return evaluationForAi(snap, input?.proposal ?? input); },
      }] : undefined;
      const raw = await sample.json(buildPlannerPrompt(snap, note), { signal: ctl.current.signal, ...(tools ? { tools } : {}), onText: () => setProgress('Writing your plan…') });
      save(parseProposal(snap, raw, 'ai'));
    } catch (e) {
      const code = (e as { code?: string })?.code ?? 'upstream_error';
      if (code === 'cancelled') setError('');
      else if (['not_granted', 'sampling_disabled', 'capability_disabled', 'not_declared'].includes(code)) { setStatus('unavailable'); setError(ERRORS[code] ?? ERRORS.not_granted); runBuiltIn(); }
      else setError(ERRORS[code] ?? 'Something went wrong reaching the AI. Please try again.');
    } finally { setBusy(false); setProgress(''); }
  };

  const apply = () => proposal && update((d) => { d.plan = applyProposal(d.plan, proposal); d.planner = { proposal: null, appliedAt: new Date().toISOString() }; }, { rules: 'assumption', plannedSpending: 'assumption', fixedSetAside: 'assumption' });
  const ev = proposal ? evaluateProposal(state, proposal) : null;
  const sc = (x: number | null) => (x === null ? '—' : Math.round(x));

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="bg-gradient-to-br from-forest to-[#3d6150] p-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest"><Sparkles size={11} /> Self-tax planner</span>
          <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', status === 'available' ? 'bg-sun text-forest' : 'bg-white/10 text-white/70')}>{status === 'available' ? 'AI on' : status === 'checking' ? 'Checking…' : 'Built-in'}</span>
        </div>
        <h2 className="display mt-3 text-[26px] sm:text-[30px]">Let AI budget your month.</h2>
        <p className="mt-2 max-w-[560px] text-sm text-white/80">It reads your income, essentials, spending and goals, then drafts a budget, self-tax rates and a payday set-aside — and explains why. Every number you see is calculated by the app's own engine. Nothing changes until you apply it.</p>
        <textarea id="planner-note" rows={2} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything it should know? e.g. I want my deposit sooner, but I won't give up the gym"
          className="mt-4 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {status === 'available' ? (
            <>
              <button className="btn bg-sun text-forest hover:bg-[#e6dcb0]" disabled={busy} onClick={runAi}><Bot size={16} /> {busy ? 'Planning…' : proposal ? 'Ask AI again' : 'Ask AI to plan my month'}</button>
              {busy && <button className="btn border border-white/25 text-white" onClick={() => ctl.current?.abort()}><Square size={14} /> Stop</button>}
              <button className="btn text-white/80 hover:text-white" disabled={busy} onClick={runBuiltIn}>Use built-in planner</button>
            </>
          ) : (
            <button className="btn bg-sun text-forest hover:bg-[#e6dcb0]" disabled={status === 'checking'} onClick={runBuiltIn}>{proposal ? 'Re-plan' : 'Plan my month'}</button>
          )}
        </div>
        {busy && <p className="mt-3 flex items-center gap-2 text-sm font-medium" aria-live="polite"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sun" /> {progress}</p>}
        {status === 'available' && !proposal && !busy && <p className="mt-3 text-xs text-white/60">Your answers (never your name or email) are sent to Claude on your own Claude account. You'll be asked to allow it the first time.</p>}
        {status === 'unavailable' && <p className="mt-3 text-xs text-white/60">AI isn't available here (for example when running locally, or if it wasn't allowed), so a labelled rules-based planner is used.</p>}
      </div>
      {error && <div className="px-5 pt-4"><Notice tone="amber">{error}</Notice></div>}
      {state.planner.appliedAt && !proposal && <p className="px-5 py-4 text-xs text-muted">Last plan applied {new Date(state.planner.appliedAt).toLocaleString()}. Set aside on payday: <b>{money(state.plan.fixedSetAside.amount)}</b>, set by {setByLabel(state.plan.fixedSetAside.setBy)}.</p>}
      {proposal && ev && (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Pill tone={proposal.source === 'ai' ? 'ink' : 'sage'}>{proposal.source === 'ai' ? 'AI proposal' : 'Built-in proposal'}</Pill>
            <span className="text-xs text-faint">{new Date(proposal.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-[15px] leading-relaxed">{proposal.summary}</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat label="Gap score (lower is better)" value={`${sc(ev.before.score)} → ${sc(ev.after.score)}`} tone="ink" />
            <Stat label="Into plan, month 1" value={`${money(ev.after.month1.toPlan)}`} note={`was ${money(ev.before.month1.toPlan)}`} />
            <Stat label="Set aside on payday" value={money(proposal.fixedSetAside.amount)} />
            <Stat label="First year into plan" value={money(ev.after.totalToPlanYear1)} note={`was ${money(ev.before.totalToPlanYear1)}`} />
          </div>
          {proposal.fixedSetAside.reason && <p className="text-xs text-muted">Payday set-aside: {proposal.fixedSetAside.reason}</p>}
          {proposal.budget.length > 0 && (
            <TableWrap>
              <table className="table-data">
                <thead><tr><th>Category</th><th>Actual</th><th>Proposed budget</th><th>Why</th></tr></thead>
                <tbody>{proposal.budget.map((b) => (
                  <tr key={b.category}><td>{catDef(b.category).label}</td><td>{money(state.profile.actualSpending[b.category] ?? 0)}</td><td><b>{money(b.amount)}</b></td><td className="text-xs text-muted">{b.reason}</td></tr>
                ))}</tbody>
              </table>
            </TableWrap>
          )}
          {proposal.rates.length > 0 && (
            <TableWrap>
              <table className="table-data">
                <thead><tr><th>Category</th><th>Self-tax</th><th>Tax-free allowance</th><th>Why</th></tr></thead>
                <tbody>{proposal.rates.map((r) => (
                  <tr key={r.category}><td>{catDef(r.category).label}</td><td>{(r.rate * 100).toFixed(1)}%</td><td>{money(r.allowance)}</td><td className="text-xs text-muted">{r.reason}</td></tr>
                ))}</tbody>
              </table>
            </TableWrap>
          )}
          <div>
            <div className="eyebrow mb-1">Goals under this plan (engine forecast)</div>
            <ul className="divide-y divide-line">
              {ev.after.goals.map((g, i) => (
                <li key={g.name + i} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>{g.name}</span>
                  <span className="text-muted num">{money(g.fundedAtDeadline)} of {money(g.target)} at deadline · {g.firstHit === null ? 'not within 50 years' : g.firstHit === 'already' ? 'already reached' : `first reached ${prettyDate(g.firstHit)}`}</span>
                </li>
              ))}
            </ul>
          </div>
          {proposal.actions.length > 0 && <div><div className="eyebrow mb-1">Suggested actions</div><ul className="list-disc space-y-1 pl-5 text-sm">{proposal.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>}
          {proposal.warnings.length > 0 && <Notice tone="amber"><b>Check before applying</b><ul className="mt-1 list-disc space-y-1 pl-5">{proposal.warnings.map((a, i) => <li key={i}>{a}</li>)}</ul></Notice>}
          {proposal.adjustments.length > 0 && (
            <details className="text-xs text-muted"><summary className="cursor-pointer font-medium">{proposal.adjustments.length} change{proposal.adjustments.length > 1 ? 's' : ''} made to keep it within the rules</summary><ul className="mt-2 list-disc space-y-1 pl-5">{proposal.adjustments.map((a, i) => <li key={i}>{a}</li>)}</ul></details>
          )}
          <p className="text-xs text-faint">A budget only creates more surplus if you actually spend less. Self-tax moves your own money earlier; it is not extra income.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={apply}>Apply this plan</button>
            <button className="btn-ghost" onClick={() => save(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function Spending() {
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
    <div className="flex flex-col gap-4">
      <AiPlanner />

      <Card eyebrow="Money with intention" title="Self-Tax & Sweep" sub="A voluntary transfer of your own money into your plan — not income, not government tax, not free money.">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Self-tax (incl. payday set-aside)" value={money(r1.levy)} />
          <Stat label="End-of-month sweep" value={money(r1.sweep)} />
          <Stat label="Total to plan" value={money(r1.toPlan)} tone="ink" />
        </div>
        <ul className="mt-4 grid gap-1.5 text-sm num">
          {[
            ['Available after essentials & repayments', money(availableAfterEssentials, true)],
            ['− Purchases (planned)', money(r1.discretionary, true)],
            ['Self-tax moved immediately', money(r1.levy, true)],
            ...(r1.rebate > 0 ? [['− Charity rebate returned to you', money(r1.rebate, true)]] : []),
            ['Remaining swept at month end', money(r1.sweep, true)],
          ].map(([k, v]) => <li key={k} className="flex justify-between rounded-lg bg-paper px-3 py-2"><span className="text-ink/80">{k}</span><b>{v}</b></li>)}
          <li className="flex justify-between rounded-lg bg-sage-soft px-3 py-2 font-extrabold"><span>Total progress this month</span><b>{money(r1.toPlan, true)}</b></li>
        </ul>
        <p className="mt-2 text-xs text-faint italic">Rates and allowances alone do not change total saving if spending is unchanged. Spending less is what creates more surplus.{r1.deficitRepaid > 0 && ` ${money(r1.deficitRepaid)} first cleared an earlier deficit.`}</p>
        <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
          <Field label="Set aside on payday" hint={`Fixed self-tax moved before you can spend it. Set by ${setByLabel(plan.fixedSetAside.setBy)}.`}>
            <MoneyInput value={plan.fixedSetAside.amount} onChange={(v) => update((d) => void (d.plan.fixedSetAside = { amount: v, setBy: 'you' }), { fixedSetAside: 'confirmed' })} />
          </Field>
          <Field label="Transfer mode">
            <Choice value={plan.contribution.mode} onChange={(v) => update((d) => void (d.plan.contribution = v === 'sweep' ? { mode: 'sweep' } : { mode: 'manual', ceiling: Math.max(d.profile.existingMonthlySaving, 0) }))}
              options={[{ v: 'sweep', label: 'Full sweep' }, { v: 'manual', label: 'Manual, with a ceiling' }]} />
          </Field>
          {plan.contribution.mode === 'manual' && (
            <Field label="Monthly contribution ceiling" hint={`Unallocated cash this month: ${money(Math.max(0, r1.available - r1.toPlan))} — stays in your account, not counted toward goals.`}>
              <MoneyInput value={plan.contribution.ceiling} onChange={(v) => update((d) => void (d.plan.contribution = { mode: 'manual', ceiling: v }))} />
            </Field>
          )}
          <div className="flex items-end"><Toggle checked={plan.selfTaxEnabled} onChange={(v) => update((d) => void (d.plan.selfTaxEnabled = v))} label="Self-tax enabled" /></div>
        </div>
      </Card>

      <Card eyebrow="Category breakdown" title="Rates and allowances" sub="Tax only applies above each monthly tax-free allowance. Higher rates are not assumed to change your behaviour — test that with planned spending."
        actions={<ProvTag p={state.provenance.rules ?? 'assumption'} />}>
        <TableWrap>
          <table className="table-data">
            <thead><tr><th>Category</th><th>Actual</th><th>Planned (your test)</th><th>Protect</th><th>Rate</th><th>Tax-free</th><th>Self-tax</th></tr></thead>
            <tbody>
              {CATEGORIES.filter((c) => c.kind !== 'internal').map((c) => {
                const rule = plan.rules[c.id] ?? { rate: 0, allowance: 0, protected: true };
                const locked = c.kind === 'zero';
                const planned = plan.plannedSpending[c.id] ?? p.actualSpending[c.id] ?? 0;
                const off = locked || (rule.protected && c.kind !== 'charity');
                const levy = Math.round(Math.max(0, planned - rule.allowance) * clampRate(c.id, rule.rate, rule.protected));
                return (
                  <tr key={c.id} className={cx(off && 'text-ink/60')}>
                    <td title={reasons[c.id]} className="min-w-[130px]"><b className="font-semibold text-ink">{c.label}</b><div className="text-[11px] text-faint">{locked ? 'Zero-rated' : c.kind === 'charity' ? 'Rebate up to 5%' : rule.protected ? 'Protected' : 'Optional'}</div></td>
                    <td>{locked ? '—' : money(p.actualSpending[c.id] ?? 0)}</td>
                    <td className="min-w-[110px]">{locked ? '—' : <MoneyInput ariaLabel={`Planned ${c.label}`} value={planned} onChange={(v) => update((d) => void (d.plan.plannedSpending[c.id] = v), { plannedSpending: 'confirmed' })} />}</td>
                    <td>{locked ? 'Always' : c.kind === 'charity' ? '—' : <input type="checkbox" aria-label={`Protect ${c.label}`} checked={rule.protected} onChange={(e) => update((d) => void (d.plan.rules[c.id] = { ...rule, protected: e.target.checked }), conf)} />}</td>
                    <td>{off ? '0%' : <PctInput ariaLabel={`${c.label} rate`} value={rule.rate} min={c.kind === 'charity' ? -5 : 0} max={c.kind === 'charity' ? 0 : 100} step={c.kind === 'charity' ? 0.5 : 1} onChange={(v) => update((d) => void (d.plan.rules[c.id] = { ...rule, rate: clampRate(c.id, v, rule.protected) }), conf)} />}</td>
                    <td className="min-w-[110px]">{off ? '—' : <MoneyInput ariaLabel={`${c.label} allowance`} value={rule.allowance} onChange={(v) => update((d) => void (d.plan.rules[c.id] = { ...rule, allowance: v }), conf)} />}</td>
                    <td className="font-semibold">{levy < 0 ? `rebate ${money(-levy, true)}` : `+${money(levy, true)}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-ghost btn-sm" onClick={() => update((d) => void (d.plan.rules = suggestRules(d.profile).rules), { rules: 'assumption' })}>Reset to suggested rates</button>
          <button className="btn-ghost btn-sm" onClick={() => update((d) => void (d.plan.plannedSpending = { ...d.profile.actualSpending }))}>Reset planned spending to actual</button>
        </div>
        <p className="mt-3 text-xs text-faint">Income, savings and transfers are never taxed. Charity rebates are funded only from your positive self-tax, never create an overdraft and are returned as spendable money — excluded from the sweep, so they reduce goal funding by exactly the rebate ({money(r1.rebate, true)} this month).</p>
      </Card>

      <Card eyebrow="Before you buy" title="Explain a purchase" sub="Purchase price, self-tax and the total cash that leaves your spending money straight away.">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Category">
            <select className="input" value={cat} onChange={(e) => setCat(e.target.value as CategoryId)}>
              {CATEGORIES.filter((c) => c.kind !== 'internal').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Already spent this month"><MoneyInput value={spent} onChange={setSpent} /></Field>
          <Field label="Purchase price"><MoneyInput value={price} onChange={setPrice} /></Field>
        </div>
        <ul className="mt-4 grid gap-1.5 text-sm num">
          {[
            ['Purchase price (to the shop)', money(ex.price, true)],
            ['Allowance left before this purchase', money(ex.allowanceLeftBefore, true)],
            [`Part above allowance × ${(ex.rate * 100).toFixed(1)}%`, money(ex.taxablePart, true)],
            ['Self-tax (to your own plan)', money(ex.selfTax, true)],
          ].map(([k, v]) => <li key={k} className="flex justify-between rounded-lg bg-paper px-3 py-2"><span className="text-ink/80">{k}</span><b>{v}</b></li>)}
          <li className="flex justify-between rounded-lg bg-sage-soft px-3 py-2 font-extrabold"><span>Total immediate cash movement</span><b>{money(ex.immediateCashMovement, true)}</b></li>
        </ul>
        <p className="mt-2 text-xs text-muted">{ex.note}</p>
      </Card>
    </div>
  );
}
