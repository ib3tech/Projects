import { useState } from 'react';
import { CATEGORIES, CategoryId, SPENDING_CATEGORIES } from '../../engine/categories';
import { demoState, uid } from '../../engine/defaults';
import { CURRENCIES } from '../../engine/money';
import { AppState, essentialsTotal } from '../../engine/profile';
import { suggestPlan } from '../../engine/suggest';
import { useStore } from '../../state/store';
import { Card, Field, MoneyInput, MonthInput, PctInput, Seg, Toggle, useMoney } from '../components/inputs';
import { StageEditor } from './CareerView';

export function SignUp() {
  const { update, replace } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div className="onboard">
      <div className="hero">
        <div className="logo-mark" aria-hidden>FS</div>
        <h1>Future Self</h1>
        <p className="lead">Turn the money you <em>don't</em> spend, and the skills you build, into progress toward goals that are entirely yours.</p>
      </div>
      <Card title="Create your prototype account">
        <p className="notice">
          <strong>Prototype:</strong> this account, every balance and every transfer are <strong>simulated</strong>. There is no bank connection and no money moves. Your answers stay in this browser only.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update((d) => {
              d.account = { name: name.trim() || 'You', email: email.trim(), createdAt: new Date().toISOString() };
              d.profile.name = name.trim();
            });
          }}
        >
          <Field label="First name (or nickname)">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
          </Field>
          <Field label="Email (optional — not sent anywhere)">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <button className="btn primary wide" type="submit">
            Sign up and start the questionnaire
          </button>
        </form>
        <hr />
        <p className="muted small">Reviewing the prototype? Load a clearly labelled fictional persona instead.</p>
        <button className="btn ghost wide" onClick={() => replace(demoState())}>
          Load fictional demo persona
        </button>
      </Card>
    </div>
  );
}

const STEPS = ['Your situation', 'Essentials', 'Spending', 'Savings & debts', 'Goals', 'Career route', 'What you will change', 'Review'];

export function Questionnaire({ onDone }: { onDone?: () => void }) {
  const { state, update } = useStore();
  const [step, setStep] = useState(0);
  const p = state.profile;
  const money = useMoney();
  const conf = (k: string) => ({ [k]: 'confirmed' as const });

  const set = (fn: (d: AppState) => void, key?: string) => update(fn, key ? conf(key) : undefined);

  const body = (() => {
    switch (step) {
      case 0:
        return (
          <>
            <h2>Where are you now?</h2>
            <Field label="Current employment, education or career stage">
              <input value={p.careerStage} onChange={(e) => set((d) => void (d.profile.careerStage = e.target.value), 'careerStage')} placeholder="In your own words" />
            </Field>
            <Field label="Employment / study status">
              <input value={p.employment} onChange={(e) => set((d) => void (d.profile.employment = e.target.value), 'employment')} placeholder="e.g. full-time, part-time, student, between jobs" />
            </Field>
            <div className="grid2">
              <Field label="Currency">
                <select value={p.currency} onChange={(e) => set((d) => void (d.profile.currency = e.target.value))}>
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Plan starts (first month)">
                <MonthInput value={p.startDate} onChange={(v) => set((d) => void (d.profile.startDate = v))} />
              </Field>
            </div>
            <Field label="Monthly take-home income" hint="What actually arrives after tax and deductions. Enter 0 if you have no income right now.">
              <MoneyInput value={p.takeHome} onChange={(v) => set((d) => void (d.profile.takeHome = v), 'takeHome')} />
            </Field>
            <Field label="Gross annual salary (optional)" hint="Kept separate. The forecast only ever uses take-home income.">
              <MoneyInput value={p.grossAnnual} onChange={(v) => set((d) => void (d.profile.grossAnnual = v || null), 'grossAnnual')} />
            </Field>
          </>
        );
      case 1:
        return (
          <>
            <h2>Bills and essential expenses</h2>
            <p className="muted">Everything here is zero-rated and protected — never self-taxed. Include rent, utilities, essential food, transport to work/study, care and family support you must provide. Debt repayments go in the next steps.</p>
            {p.essentials.map((e, i) => (
              <div className="row" key={e.id}>
                <input aria-label="Essential name" value={e.label} placeholder="Name" onChange={(ev) => set((d) => void (d.profile.essentials[i].label = ev.target.value))} />
                <MoneyInput ariaLabel={`${e.label} amount`} value={e.amount} onChange={(v) => set((d) => void (d.profile.essentials[i].amount = v), 'essentials')} />
                <button className="icon-btn" aria-label="Remove" onClick={() => set((d) => void d.profile.essentials.splice(i, 1))}>
                  ×
                </button>
              </div>
            ))}
            <button className="btn ghost" onClick={() => set((d) => void d.profile.essentials.push({ id: uid('e'), label: '', amount: 0 }))}>
              + Add essential cost
            </button>
            <p className="total">Total essentials: {money(essentialsTotal(p))} / month</p>
          </>
        );
      case 2:
        return (
          <>
            <h2>Your actual discretionary spending</h2>
            <p className="muted">What you <strong>actually</strong> spend in a typical month beyond the essentials, by category. Leave blank for zero.</p>
            <div className="cat-grid">
              {SPENDING_CATEGORIES.filter((c) => c.kind !== 'zero').map((c) => (
                <Field key={c.id} label={c.label}>
                  <MoneyInput value={p.actualSpending[c.id] ?? 0} onChange={(v) => set((d) => void (d.profile.actualSpending[c.id] = v), `actual.${c.id}`)} />
                </Field>
              ))}
            </div>
            <p className="total">Actual discretionary: {money(Object.values(p.actualSpending).reduce((a, b) => a + (b ?? 0), 0))} / month</p>
            <Field label="Your monthly spending allowance / budget" hint="Recorded separately from what you actually spend. Used to suggest tax-free allowances.">
              <MoneyInput value={p.budget} onChange={(v) => set((d) => void (d.profile.budget = v), 'budget')} />
            </Field>
          </>
        );
      case 3:
        return (
          <>
            <h2>Savings, investments and debts</h2>
            <div className="grid2">
              <Field label="Cash in current account">
                <MoneyInput value={p.balances.cash} onChange={(v) => set((d) => void (d.profile.balances.cash = v), 'balances.cash')} />
              </Field>
              <Field label="Emergency savings">
                <MoneyInput value={p.balances.emergency} onChange={(v) => set((d) => void (d.profile.balances.emergency = v), 'balances.emergency')} />
              </Field>
              <Field label="Other savings">
                <MoneyInput value={p.balances.savings} onChange={(v) => set((d) => void (d.profile.balances.savings = v), 'balances.savings')} />
              </Field>
              <Field label="Investments">
                <MoneyInput value={p.balances.investments} onChange={(v) => set((d) => void (d.profile.balances.investments = v), 'balances.investments')} />
              </Field>
            </div>
            <Field label="Existing savings start in" hint="Each pound is counted in one place only. Investments start in the financial pot.">
              <Seg
                value={p.savingsStartPot}
                onChange={(v) => set((d) => void (d.profile.savingsStartPot = v))}
                options={[
                  { v: 'life', label: 'Life goal pot' },
                  { v: 'financial', label: 'Financial pot' },
                  { v: 'cash', label: 'Leave as cash' },
                ]}
              />
            </Field>
            <Field label="What you already save each month (existing habit)" hint="Used for the current-habit projection.">
              <MoneyInput value={p.existingMonthlySaving} onChange={(v) => set((d) => void (d.profile.existingMonthlySaving = v), 'existingSaving')} />
            </Field>
            <h3>Debts</h3>
            {p.debts.map((dbt, i) => (
              <div className="debt-row" key={dbt.id}>
                <input aria-label="Debt name" placeholder="Name" value={dbt.name} onChange={(e) => set((d) => void (d.profile.debts[i].name = e.target.value))} />
                <Field label="Balance">
                  <MoneyInput value={dbt.balance} onChange={(v) => set((d) => void (d.profile.debts[i].balance = v), 'debts')} />
                </Field>
                <Field label="APR">
                  <PctInput value={dbt.apr} min={0} max={200} onChange={(v) => set((d) => void (d.profile.debts[i].apr = v), 'debts')} />
                </Field>
                <Field label="Required monthly repayment">
                  <MoneyInput value={dbt.payment} onChange={(v) => set((d) => void (d.profile.debts[i].payment = v), 'debts')} />
                </Field>
                <button className="icon-btn" aria-label="Remove debt" onClick={() => set((d) => void d.profile.debts.splice(i, 1))}>
                  ×
                </button>
              </div>
            ))}
            <button className="btn ghost" onClick={() => set((d) => void d.profile.debts.push({ id: uid('d'), name: '', balance: 0, apr: 0, payment: 0 }))}>
              + Add debt
            </button>
          </>
        );
      case 4:
        return (
          <>
            <h2>Where do you want to go?</h2>
            <p className="muted">One financial goal, one career/earning goal and one personal/life goal. Only you decide what they are.</p>
            {p.goals.map((g, i) => (
              <Card key={g.id} title={g.kind === 'financial' ? 'Financial goal' : g.kind === 'career' ? 'Career / earning-capacity goal' : 'Personal / life goal'} className="inner">
                <Field label="Goal">
                  <input value={g.name} placeholder="In your words" onChange={(e) => set((d) => void (d.profile.goals[i].name = e.target.value), `goal.${g.id}`)} />
                </Field>
                <div className="grid2">
                  {g.kind === 'career' ? (
                    <Field label="Target monthly take-home (optional)" hint="Funding need comes from the development budgets on the next step.">
                      <MoneyInput value={g.targetTakeHome ?? 0} onChange={(v) => set((d) => void (d.profile.goals[i].targetTakeHome = v || null), `goal.${g.id}`)} />
                    </Field>
                  ) : (
                    <Field label="Target amount">
                      <MoneyInput value={g.target} onChange={(v) => set((d) => void (d.profile.goals[i].target = v), `goal.${g.id}.target`)} />
                    </Field>
                  )}
                  <Field label="Deadline">
                    <MonthInput value={g.deadline} onChange={(v) => set((d) => void (d.profile.goals[i].deadline = v), `goal.${g.id}.deadline`)} />
                  </Field>
                </div>
                <Field label={`Priority: ${g.priority} / 5`}>
                  <input type="range" min={1} max={5} value={g.priority} onChange={(e) => set((d) => void (d.profile.goals[i].priority = +e.target.value))} />
                </Field>
                <Field label="What achieving it actually means to you">
                  <textarea rows={2} value={g.meaning} onChange={(e) => set((d) => void (d.profile.goals[i].meaning = e.target.value))} />
                </Field>
                <div className="grid2">
                  <Field label="Ongoing costs once achieved">
                    <input value={g.ongoingCosts} onChange={(e) => set((d) => void (d.profile.goals[i].ongoingCosts = e.target.value))} />
                  </Field>
                  <Field label="Dependencies / constraints">
                    <input value={g.constraints} onChange={(e) => set((d) => void (d.profile.goals[i].constraints = e.target.value))} />
                  </Field>
                </div>
                {g.kind === 'life' && (
                  <Field label="Hold this pot as">
                    <Seg value={g.vehicle} onChange={(v) => set((d) => void (d.profile.goals[i].vehicle = v))} options={[{ v: 'cash', label: 'Cash savings' }, { v: 'invested', label: 'Invested' }]} />
                  </Field>
                )}
              </Card>
            ))}
          </>
        );
      case 5:
        return (
          <>
            <h2>Your career route</h2>
            <p className="muted">Add the stages you expect — only if they apply to you. Each stage's income is an assumption, and it can only start after its development is funded, its delay has passed and its earliest date is reached.</p>
            <StageEditor />
          </>
        );
      case 6:
        return (
          <>
            <h2>What are you willing to change?</h2>
            <Field label="Spending habits you want to reduce">
              <CatPicker value={p.preferences.reduce} onChange={(v) => set((d) => void (d.profile.preferences.reduce = v), 'pref.reduce')} />
            </Field>
            <Field label="Categories you want to protect (never self-taxed)">
              <CatPicker value={p.preferences.protect} onChange={(v) => set((d) => void (d.profile.preferences.protect = v), 'pref.protect')} />
            </Field>
            <Toggle checked={p.preferences.fullSweep} onChange={(v) => set((d) => void (d.profile.preferences.fullSweep = v), 'pref.sweep')} label="Automatically sweep all unspent money at month end (simulated)" />
            <Field label="Emergency-fund priority">
              <Seg
                value={p.preferences.emergencyMode}
                onChange={(v) => set((d) => void (d.profile.preferences.emergencyMode = v), 'pref.emergency')}
                options={[
                  { v: 'first', label: 'Emergency fund first' },
                  { v: 'alongside', label: 'Alongside goals' },
                  { v: 'starter', label: 'Starter buffer, then split' },
                ]}
              />
            </Field>
            <Field label="Share of future extra income to direct to goals" hint="When income rises, the rest is assumed to be spent.">
              <PctInput value={p.preferences.extraIncomeShare} min={0} max={100} step={5} onChange={(v) => set((d) => void (d.profile.preferences.extraIncomeShare = v), 'pref.extra')} />
            </Field>
            <Field label="Investment preference" hint="Sets an illustrative return assumption you can change at any time.">
              <Seg
                value={p.preferences.risk}
                onChange={(v) => set((d) => void (d.profile.preferences.risk = v))}
                options={[
                  { v: 'cash', label: 'Cash only' },
                  { v: 'cautious', label: 'Cautious' },
                  { v: 'balanced', label: 'Balanced' },
                  { v: 'growth', label: 'Growth' },
                ]}
              />
            </Field>
            <Field label="Financing preferences (e.g. avoid borrowing, open to a mortgage)">
              <input value={p.preferences.financing} onChange={(e) => set((d) => void (d.profile.preferences.financing = e.target.value))} />
            </Field>
          </>
        );
      default:
        return <Review />;
    }
  })();

  return (
    <div className="onboard wide-card">
      <div className="steps" aria-label="Questionnaire progress">
        {STEPS.map((s, i) => (
          <button key={s} className={`step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} onClick={() => setStep(i)} aria-current={i === step}>
            <span>{i + 1}</span>
            <em>{s}</em>
          </button>
        ))}
      </div>
      <Card>{body}</Card>
      <div className="nav-buttons">
        <button className="btn ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn primary" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <div className="row wrap">
            {state.onboarded && (
              <button
                className="btn ghost"
                onClick={() => {
                  update((d) => {
                    const sug = suggestPlan(d.profile);
                    for (const [k, v] of Object.entries(sug.rules)) if (!d.plan.rules[k as CategoryId]) d.plan.rules[k as CategoryId] = v;
                  });
                  onDone?.();
                }}
              >
                Save & keep my plan settings
              </button>
            )}
            <button
              className="btn primary"
              onClick={() => {
                update((d) => {
                  d.profile.careerStages.forEach((s) => {
                    if (d.provenance[`stage.${s.id}.share`] !== 'confirmed') s.goalShareOfExtra = d.profile.preferences.extraIncomeShare;
                  });
                  d.plan = suggestPlan(d.profile);
                  d.onboarded = true;
                });
                onDone?.();
              }}
            >
              {state.onboarded ? 'Save & regenerate suggestions' : 'Generate my route'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CatPicker({ value, onChange }: { value: CategoryId[]; onChange: (v: CategoryId[]) => void }) {
  return (
    <div className="chips">
      {CATEGORIES.filter((c) => c.kind === 'optional').map((c) => {
        const on = value.includes(c.id);
        return (
          <button key={c.id} type="button" className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function Review() {
  const { state } = useStore();
  const money = useMoney();
  const p = state.profile;
  const preview = suggestPlan(p);
  const disc = Object.values(p.actualSpending).reduce((a, b) => a + (b ?? 0), 0);
  const debtPay = p.debts.reduce((a, d) => a + d.payment, 0);
  const left = p.takeHome - essentialsTotal(p) - debtPay - disc;
  return (
    <>
      <h2>Review</h2>
      <h3>Confirmed by you</h3>
      <ul className="kv">
        <li><span>Take-home income</span><b>{money(p.takeHome)}</b></li>
        <li><span>Essentials</span><b>{money(essentialsTotal(p))}</b></li>
        <li><span>Required debt repayments</span><b>{money(debtPay)}</b></li>
        <li><span>Actual discretionary spending</span><b>{money(disc)}</b></li>
        <li><span>Left at month end (before any plan)</span><b className={left < 0 ? 'neg' : ''}>{money(left)}</b></li>
        <li><span>Spending budget (separate)</span><b>{money(p.budget)}</b></li>
      </ul>
      {left < 0 && <p className="notice warn">Your spending is above your income. The plan will show a deficit — and will clear it before funding any goal. This is common and fixable; it is not a judgement.</p>}
      <h3>Assumptions we will suggest (all editable)</h3>
      <ul className="kv">
        <li><span>Emergency reserve target (3 × essentials + repayments)</span><b>{money(preview.emergency.target)}</b></li>
        <li><span>Illustrative investment return</span><b>{(preview.returns.investmentAnnual * 100).toFixed(1)}% / yr</b></li>
        <li><span>Cash savings return</span><b>{(preview.returns.cashAnnual * 100).toFixed(1)}% / yr</b></li>
        <li><span>Cost of any cash deficit (borrowing is not free)</span><b>{(preview.returns.deficitApr * 100).toFixed(1)}% APR</b></li>
        <li><span>Self-tax rates & allowances</span><b>Suggested from your habits</b></li>
      </ul>
    </>
  );
}
