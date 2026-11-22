import { useEffect, useRef, useState } from 'react';
import { applyProposal, buildPlannerPrompt, builtInProposal, evaluateProposal, evaluationForAi, parseProposal, PlannerProposal } from '../../engine/aiPlanner';
import { catDef } from '../../engine/categories';
import { prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Card, useMoney } from './inputs';

/* Minimal typing for the viewer's runtime (present only when hosted as a Claude artifact). */
type SampleFn = ((input: string, opts?: Record<string, unknown>) => Promise<{ text: string }>) & {
  json: (input: string, opts?: Record<string, unknown>) => Promise<unknown>;
  limits: () => Promise<{ tools?: { maxCount: number } }>;
};
declare global {
  interface Window {
    claude?: { use: (name: string) => Promise<unknown> };
  }
}

type AiStatus = 'checking' | 'available' | 'unavailable';

const ERROR_COPY: Record<string, string> = {
  not_granted: 'AI was not allowed for this page, so the built-in planner is used instead.',
  sampling_disabled: 'AI is not available on this account. The built-in planner is used instead.',
  rate_limited: 'Too many AI requests just now. Try again in a little while.',
  session_expired: 'Please sign in to Claude again, then retry.',
  refused: 'The AI declined this request. Try rewording your note.',
  invalid_json: 'The AI reply could not be read. Please try again.',
  empty_completion: 'The AI returned nothing. Please try again.',
};

export function AiPlanner({ compact = false, go }: { compact?: boolean; go?: (t: string) => void }) {
  const { state, update } = useStore();
  const money = useMoney();
  const [status, setStatus] = useState<AiStatus>('checking');
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
    return () => {
      live = false;
      ctl.current?.abort();
    };
  }, []);

  const save = (p: PlannerProposal | null) => update((d) => void (d.planner = { proposal: p, appliedAt: d.planner.appliedAt }));

  const runBuiltIn = () => {
    save(builtInProposal(state));
    setError('');
  };

  const runAi = async () => {
    const sample = sampleRef.current;
    if (!sample) return runBuiltIn();
    setBusy(true);
    setError('');
    setProgress('Thinking about your budget…');
    ctl.current = new AbortController();
    const snapshotState = state;
    try {
      const limits = await sample.limits().catch(() => null);
      const tools = limits?.tools
        ? [
            {
              name: 'evaluate_plan',
              description:
                "Runs a draft proposal through Future Self's calculation engine and returns the funding-gap score, money into the plan and each goal's funding at its deadline, before vs after, plus any rule adjustments. Input: the same JSON object shape as the final answer.",
              inputSchema: { type: 'object', properties: { proposal: { type: 'object' } }, required: ['proposal'] },
              execute: (input: { proposal?: unknown }) => {
                setProgress('Checking a draft against the calculation engine…');
                return evaluationForAi(snapshotState, input?.proposal ?? input);
              },
            },
          ]
        : undefined;
      const raw = await sample.json(buildPlannerPrompt(snapshotState, note), {
        signal: ctl.current.signal,
        ...(tools ? { tools } : {}),
        onText: () => setProgress('Writing the proposal…'),
      });
      save(parseProposal(snapshotState, raw, 'ai'));
    } catch (e) {
      const code = (e as { code?: string })?.code ?? 'upstream_error';
      if (code === 'cancelled') setError('');
      else if (code === 'not_granted' || code === 'sampling_disabled' || code === 'capability_disabled' || code === 'not_declared') {
        setStatus('unavailable');
        setError(ERROR_COPY[code] ?? ERROR_COPY.not_granted);
        runBuiltIn();
      } else setError(ERROR_COPY[code] ?? 'Something went wrong reaching the AI. Please try again.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const apply = () => {
    if (!proposal) return;
    update(
      (d) => {
        d.plan = applyProposal(d.plan, proposal);
        d.planner = { proposal: null, appliedAt: new Date().toISOString() };
      },
      { rules: 'assumption', plannedSpending: 'assumption', fixedSetAside: 'assumption' },
    );
  };

  const evalResult = proposal ? evaluateProposal(state, proposal) : null;
  const scoreTxt = (x: number | null) => (x === null ? '—' : x.toFixed(0));
  const aiLabel = status === 'available' ? 'AI budget planner' : 'Budget planner';

  if (compact) {
    return (
      <Card title={aiLabel} sub="Self-tax is the main accelerator. Let the planner budget your month and suggest how much to put aside." actions={go && <button className="link" onClick={() => go('selftax')}>Open →</button>}>
        <div className="row wrap">
          <button className="btn primary" disabled={busy || status === 'checking'} onClick={() => (go ? go('selftax') : undefined)}>
            {status === 'available' ? 'Ask AI to plan my month' : 'Plan my month'}
          </button>
          <span className="small muted">
            Set aside each payday: <b>{money(state.plan.fixedSetAside.amount)}</b> · set by {setByLabel(state.plan.fixedSetAside.setBy)}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={<>{aiLabel} <span className={`ai-pill ${status}`}>{status === 'available' ? 'AI on' : status === 'checking' ? 'Checking…' : 'Built-in'}</span></>}
      sub="The planner reads your data, drafts a monthly budget, self-tax rates and a payday set-aside, and explains it. Every number shown is calculated by the app's own engine. Nothing changes until you apply it."
    >
      <label className="field">
        <span className="field-label">Anything the planner should know? (optional)</span>
        <textarea id="planner-note" rows={2} value={note} maxLength={600} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I want my deposit sooner, but I won't give up my gym" />
      </label>
      <div className="row wrap">
        {status === 'available' ? (
          <>
            <button className="btn primary" disabled={busy} onClick={runAi}>{busy ? 'Planning…' : proposal ? 'Ask AI again' : 'Ask AI to plan my month'}</button>
            {busy && <button className="btn ghost small" onClick={() => ctl.current?.abort()}>Stop</button>}
            <button className="btn ghost small" disabled={busy} onClick={runBuiltIn}>Use built-in planner</button>
          </>
        ) : (
          <button className="btn primary" disabled={status === 'checking'} onClick={runBuiltIn}>{proposal ? 'Re-plan' : 'Plan my month'}</button>
        )}
      </div>
      {status === 'available' && !proposal && !busy && <p className="small muted">Your answers (not your name or email) are sent to Claude on your own Claude account. You will be asked to allow it the first time.</p>}
      {status === 'unavailable' && <p className="small muted">AI is not available here (for example when running the app locally, or if it was not allowed), so a built-in rules-based planner is used. It is labelled as such.</p>}
      {busy && <p className="thinking" aria-live="polite">{progress}</p>}
      {error && <p className="notice warn small">{error}</p>}
      {state.planner.appliedAt && !proposal && <p className="small muted">Last proposal applied {new Date(state.planner.appliedAt).toLocaleString()}.</p>}

      {proposal && evalResult && (
        <div className="proposal">
          <div className="row between wrap">
            <h4>{proposal.source === 'ai' ? 'AI proposal' : 'Built-in proposal'}</h4>
            <span className="small muted">{new Date(proposal.createdAt).toLocaleString()}</span>
          </div>
          <p>{proposal.summary}</p>

          <div className="compare-grid">
            <div className="stat"><div className="stat-label">Funding-gap score</div><div className="stat-value">{scoreTxt(evalResult.before.score)} → {scoreTxt(evalResult.after.score)}</div><div className="stat-note">lower is better · planning measure</div></div>
            <div className="stat"><div className="stat-label">Into your plan, month 1</div><div className="stat-value">{money(evalResult.before.month1.toPlan)} → {money(evalResult.after.month1.toPlan)}</div></div>
            <div className="stat"><div className="stat-label">Set aside on payday</div><div className="stat-value">{money(proposal.fixedSetAside.amount)}</div><div className="stat-note">{proposal.fixedSetAside.reason}</div></div>
            <div className="stat"><div className="stat-label">First year into plan</div><div className="stat-value">{money(evalResult.after.totalToPlanYear1)}</div><div className="stat-note">was {money(evalResult.before.totalToPlanYear1)}</div></div>
          </div>

          {proposal.budget.length > 0 && (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Category</th><th>Actual</th><th>Proposed budget</th><th>Why</th></tr></thead>
                <tbody>
                  {proposal.budget.map((b) => (
                    <tr key={b.category}>
                      <td>{catDef(b.category).label}</td>
                      <td>{money(state.profile.actualSpending[b.category] ?? 0)}</td>
                      <td><b>{money(b.amount)}</b></td>
                      <td className="small">{b.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {proposal.rates.length > 0 && (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Category</th><th>Self-tax rate</th><th>Tax-free allowance</th><th>Why</th></tr></thead>
                <tbody>
                  {proposal.rates.map((r) => (
                    <tr key={r.category}>
                      <td>{catDef(r.category).label}</td>
                      <td>{(r.rate * 100).toFixed(1)}%</td>
                      <td>{money(r.allowance)}</td>
                      <td className="small">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4>Goals under this proposal (engine forecast)</h4>
          <ul className="kv">
            {evalResult.after.goals.map((g, i) => (
              <li key={g.name + i}>
                <span>{g.name}</span>
                <b className="small">
                  {money(g.fundedAtDeadline)} of {money(g.target)} at deadline · {g.firstHit === null ? 'not reached within 50 years' : g.firstHit === 'already' ? 'already reached' : `first reached ${prettyDate(g.firstHit)}`}
                </b>
              </li>
            ))}
          </ul>

          {proposal.actions.length > 0 && (<><h4>Suggested actions</h4><ul className="assumption-list small">{proposal.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></>)}
          {proposal.warnings.length > 0 && (<><h4>Check before applying</h4><ul className="assumption-list small">{proposal.warnings.map((a, i) => <li key={i}>{a}</li>)}</ul></>)}
          {proposal.adjustments.length > 0 && (
            <details className="formula small"><summary>{proposal.adjustments.length} change{proposal.adjustments.length > 1 ? 's' : ''} made to keep the proposal within the rules</summary><ul className="assumption-list">{proposal.adjustments.map((a, i) => <li key={i}>{a}</li>)}</ul></details>
          )}
          <p className="small muted">A budget only creates more surplus if you actually spend less. Self-tax moves your own money earlier; it is not extra income.</p>
          <div className="row wrap">
            <button className="btn primary" onClick={apply}>Apply this plan</button>
            <button className="btn ghost" onClick={() => save(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function setByLabel(s: 'you' | 'ai' | 'built-in') {
  return s === 'ai' ? 'the AI (accepted by you)' : s === 'built-in' ? 'the built-in planner (accepted by you)' : 'you';
}
