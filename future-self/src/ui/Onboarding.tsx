import { ArrowUpRight, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { CATEGORIES, CategoryId, SPENDING_CATEGORIES } from '../engine/categories';
import { demoState, uid } from '../engine/defaults';
import { CURRENCIES } from '../engine/money';
import { AppState, dateOfMonth, essentialsTotal, monthIndex } from '../engine/profile';
import { suggestPlan } from '../engine/suggest';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { CharacterEditor } from './CharacterEditor';
import { StageEditor } from './views/Career';
import { Choice, cx, Field, MoneyInput, MonthInput, Notice, PctInput, Toggle, useMoney } from './kit';

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cx('grid place-items-center rounded-xl bg-ink font-black text-white', small ? 'h-8 w-8 text-sm' : 'h-9 w-9')}>f</span>
      <span className="text-[15px] font-extrabold tracking-tight">future self</span>
    </div>
  );
}

export function Landing({ onStart }: { onStart: () => void }) {
  const { replace } = useStore();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-[max(16px,env(safe-area-inset-left))] py-5 sm:px-9">
        <Logo />
        <span className="text-[11px] font-semibold tracking-wide text-muted">prototype · simulated</span>
      </header>
      <main className="mx-auto w-full max-w-[860px] flex-1 px-4 pt-6 sm:pt-12">
        <div className="eyebrow">Your future, your terms</div>
        <h1 className="display mt-3 text-[56px] sm:text-[72px]">
          Small choices.
          <br />
          <span className="text-sage">Big becoming.</span>
        </h1>
        <p className="mt-6 max-w-[300px] text-[15px] leading-relaxed text-muted">Connect today's choices to the future you're building — goals, income, and all the gaps.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button className="btn-primary" onClick={onStart}>
            Personalise my plan <ArrowUpRight size={16} />
          </button>
          <button className="btn-ghost" onClick={() => replace(demoState())}>
            See a fictional example
          </button>
        </div>
        <div className="mt-16 grid gap-6 border-t border-line pt-8 sm:grid-cols-3">
          {[
            ['Delusion Meter', 'Honest gap analysis on every goal.'],
            ['Self-Tax', 'AI budgets your month and redirects unspent money.'],
            ['10-year view', 'Month-by-month projection, one engine.'],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="text-sm font-bold">{t}</div>
              <div className="mt-1 text-[13px] text-muted">{d}</div>
            </div>
          ))}
        </div>
      </main>
      <footer className="border-t border-line px-4 py-5 text-[11px] text-faint sm:px-9">No real money moves. No bank connection. All numbers are simulated.</footer>
    </div>
  );
}

const SITUATIONS = ['Employed full-time', 'Employed part-time', 'Self-employed / Freelance', 'Student', 'Job searching', 'Career break', 'Retired'];
const STEPS = ['Name', 'Character', 'Situation', 'Goals', 'Finances', 'Spending', 'Career', 'Choices'];

export function Onboarding({ onExit }: { onExit: () => void }) {
  const { state, update } = useStore();
  const [step, setStep] = useState(0);
  const p = state.profile;
  const money = useMoney();
  const conf = (k: string) => ({ [k]: 'confirmed' as const });
  const set = (fn: (d: AppState) => void, key?: string) => update(fn, key ? conf(key) : undefined);
  const first = p.name.trim() || 'you';
  const last = step === STEPS.length - 1;

  const finish = (regenerate: boolean) => {
    update((d) => {
      if (!d.account) d.account = { name: d.profile.name || 'You', email: '', createdAt: new Date().toISOString() };
      d.profile.careerStages.forEach((s) => {
        if (d.provenance[`stage.${s.id}.share`] !== 'confirmed') s.goalShareOfExtra = d.profile.preferences.extraIncomeShare;
      });
      if (regenerate || !d.onboarded) d.plan = { ...suggestPlan(d.profile), fixedSetAside: d.plan.fixedSetAside };
      else {
        const sug = suggestPlan(d.profile);
        for (const [k, v] of Object.entries(sug.rules)) if (!d.plan.rules[k as CategoryId]) d.plan.rules[k as CategoryId] = v;
      }
      d.onboarded = true;
    });
    onExit();
  };

  const page = (eyebrow: string, title: React.ReactNode, sub: React.ReactNode, body: React.ReactNode) => (
    <div>
      <div className="eyebrow text-center">{eyebrow}</div>
      <h1 className="mt-2 text-center text-[30px] font-black tracking-[-0.03em] sm:text-[34px]">{title}</h1>
      <p className="mt-1.5 text-center text-sm text-muted">{sub}</p>
      <div className="mt-7 flex flex-col gap-5">{body}</div>
    </div>
  );

  const body = (() => {
    switch (step) {
      case 0:
        return page('Your future, your terms', "What's your name?", "We'll use this to personalise your plan. It stays in this browser.", (
          <input className="input text-center text-lg" placeholder="Your first name" value={p.name} autoFocus onChange={(e) => set((d) => void (d.profile.name = e.target.value))} />
        ));
      case 1:
        return page('Choose your character', 'Create your character', 'This is you, working toward your goals.', <CharacterEditor />);
      case 2:
        return page('Your situation', `What do you do, ${first}?`, 'Your current situation shapes what is realistic.', (
          <>
            <div className="flex flex-wrap justify-center gap-2">
              {SITUATIONS.map((s) => (
                <button key={s} type="button" className={cx('chip', p.employment === s && 'chip-on')} onClick={() => set((d) => void (d.profile.employment = s), 'employment')}>
                  {s}
                </button>
              ))}
            </div>
            <Field label="Or describe your career stage" hint="Optional — helps personalise suggestions">
              <input className="input" value={p.careerStage} placeholder="In your own words" onChange={(e) => set((d) => void (d.profile.careerStage = e.target.value), 'careerStage')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Monthly take-home income" hint="What actually arrives. Enter 0 if none right now.">
                <MoneyInput value={p.takeHome} onChange={(v) => set((d) => void (d.profile.takeHome = v), 'takeHome')} />
              </Field>
              <Field label="Gross annual salary (optional)" hint="Kept separate — the forecast only uses take-home.">
                <MoneyInput value={p.grossAnnual} onChange={(v) => set((d) => void (d.profile.grossAnnual = v || null), 'grossAnnual')} />
              </Field>
              <Field label="Currency">
                <select className="input" value={p.currency} onChange={(e) => set((d) => void (d.profile.currency = e.target.value))}>
                  {CURRENCIES.map((c) => <option key={c.code}>{c.code}</option>)}
                </select>
              </Field>
              <Field label="Plan starts">
                <MonthInput value={p.startDate} onChange={(v) => set((d) => void (d.profile.startDate = v))} />
              </Field>
            </div>
          </>
        ));
      case 3:
        return page('Your three plans', 'Set your goals', 'One goal of each type. Focus creates results.', (
          <>
            {p.goals.map((g, i) => {
              const meta = g.kind === 'financial' ? ['◈', 'Financial goal', 'Build a fund, invest, pay off debt'] : g.kind === 'career' ? ['◉', 'Career goal', 'Qualification, role change, earning more'] : ['◎', 'Personal goal', 'Travel, home, family, health — anything that matters'];
              const months = Math.max(1, monthIndex(p.startDate, g.deadline));
              return (
                <div key={g.id} className="card">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist text-sage-deep">{meta[0]}</span>
                    <div>
                      <div className="font-bold">{meta[1]}</div>
                      <div className="text-[13px] text-muted">{meta[2]}</div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Field label="What's the goal?" className="sm:col-span-3">
                      <input className="input" value={g.name} placeholder="In your words" onChange={(e) => set((d) => void (d.profile.goals[i].name = e.target.value), `goal.${g.id}`)} />
                    </Field>
                    {g.kind === 'career' ? (
                      <Field label="Target take-home / month" hint="Optional. Costs go on the career step.">
                        <MoneyInput value={g.targetTakeHome ?? 0} onChange={(v) => set((d) => void (d.profile.goals[i].targetTakeHome = v || null))} />
                      </Field>
                    ) : (
                      <Field label="Target amount">
                        <MoneyInput value={g.target} onChange={(v) => set((d) => void (d.profile.goals[i].target = v), `goal.${g.id}.target`)} />
                      </Field>
                    )}
                    <Field label="In how many months?">
                      <input type="number" min={1} className="input num" value={months} onChange={(e) => set((d) => void (d.profile.goals[i].deadline = dateOfMonth(d.profile.startDate, Math.max(1, +e.target.value || 1))), `goal.${g.id}.deadline`)} />
                    </Field>
                    <Field label={`Priority ${g.priority}/5`}>
                      <input type="range" min={1} max={5} value={g.priority} className="mt-3" onChange={(e) => set((d) => void (d.profile.goals[i].priority = +e.target.value))} />
                    </Field>
                  </div>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium text-sage-deep">What it means, costs and constraints</summary>
                    <div className="mt-3 grid gap-3">
                      <Field label="What achieving it actually means">
                        <textarea className="input" rows={2} value={g.meaning} onChange={(e) => set((d) => void (d.profile.goals[i].meaning = e.target.value))} />
                      </Field>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Ongoing costs once achieved">
                          <input className="input" value={g.ongoingCosts} onChange={(e) => set((d) => void (d.profile.goals[i].ongoingCosts = e.target.value))} />
                        </Field>
                        <Field label="Dependencies / constraints">
                          <input className="input" value={g.constraints} onChange={(e) => set((d) => void (d.profile.goals[i].constraints = e.target.value))} />
                        </Field>
                      </div>
                      {g.kind === 'life' && (
                        <Field label="Hold this pot as">
                          <Choice value={g.vehicle} onChange={(v) => set((d) => void (d.profile.goals[i].vehicle = v))} options={[{ v: 'cash', label: 'Cash savings' }, { v: 'invested', label: 'Invested' }]} />
                        </Field>
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
          </>
        ));
      case 4:
        return page('Your finances', `${first === 'you' ? 'Your' : first + "'s"} finances`, 'Essential costs, savings and debts.', (
          <>
            <div className="card">
              <div className="eyebrow mb-2">Monthly essential expenses</div>
              <p className="mb-3 text-xs text-faint">Rent, utilities, essential food, travel to work, care, family support. Always protected — never self-taxed.</p>
              <div className="flex flex-col gap-2">
                {p.essentials.map((e, i) => (
                  <div key={e.id} className="flex items-center gap-2">
                    <input className="input" aria-label="Essential name" placeholder="Name" value={e.label} onChange={(ev) => set((d) => void (d.profile.essentials[i].label = ev.target.value))} />
                    <div className="w-36 shrink-0"><MoneyInput ariaLabel="Amount" value={e.amount} onChange={(v) => set((d) => void (d.profile.essentials[i].amount = v), 'essentials')} /></div>
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-faint hover:bg-mist" aria-label="Remove" onClick={() => set((d) => void d.profile.essentials.splice(i, 1))}><X size={16} /></button>
                  </div>
                ))}
                <button className="btn-soft btn-sm self-start" onClick={() => set((d) => void d.profile.essentials.push({ id: uid('e'), label: '', amount: 0 }))}><Plus size={14} /> Add essential cost</button>
                <div className="text-right text-sm font-semibold num">Total {money(essentialsTotal(p))} / month</div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cash in current account"><MoneyInput value={p.balances.cash} onChange={(v) => set((d) => void (d.profile.balances.cash = v), 'balances.cash')} /></Field>
              <Field label="Emergency fund"><MoneyInput value={p.balances.emergency} onChange={(v) => set((d) => void (d.profile.balances.emergency = v), 'balances.emergency')} /></Field>
              <Field label="Current savings"><MoneyInput value={p.balances.savings} onChange={(v) => set((d) => void (d.profile.balances.savings = v), 'balances.savings')} /></Field>
              <Field label="Current investments"><MoneyInput value={p.balances.investments} onChange={(v) => set((d) => void (d.profile.balances.investments = v), 'balances.investments')} /></Field>
              <Field label="Existing monthly saving habit"><MoneyInput value={p.existingMonthlySaving} onChange={(v) => set((d) => void (d.profile.existingMonthlySaving = v), 'existingSaving')} /></Field>
              <Field label="Savings start in">
                <select className="input" value={p.savingsStartPot} onChange={(e) => set((d) => void (d.profile.savingsStartPot = e.target.value as typeof d.profile.savingsStartPot))}>
                  <option value="life">Personal goal pot</option>
                  <option value="financial">Financial goal pot</option>
                  <option value="cash">Leave as cash</option>
                </select>
              </Field>
            </div>
            <div className="card">
              <div className="eyebrow mb-3">Debts</div>
              <div className="flex flex-col gap-3">
                {p.debts.map((dbt, i) => (
                  <div key={dbt.id} className="grid items-end gap-2 rounded-xl bg-paper p-3 sm:grid-cols-[1.4fr_1fr_.8fr_1fr_auto]">
                    <Field label="Name"><input className="input" value={dbt.name} onChange={(e) => set((d) => void (d.profile.debts[i].name = e.target.value))} /></Field>
                    <Field label="Balance"><MoneyInput value={dbt.balance} onChange={(v) => set((d) => void (d.profile.debts[i].balance = v), 'debts')} /></Field>
                    <Field label="APR"><PctInput value={dbt.apr} min={0} max={200} onChange={(v) => set((d) => void (d.profile.debts[i].apr = v), 'debts')} /></Field>
                    <Field label="Required / month"><MoneyInput value={dbt.payment} onChange={(v) => set((d) => void (d.profile.debts[i].payment = v), 'debts')} /></Field>
                    <button className="grid h-10 w-10 place-items-center rounded-lg text-faint hover:bg-mist" aria-label="Remove debt" onClick={() => set((d) => void d.profile.debts.splice(i, 1))}><X size={16} /></button>
                  </div>
                ))}
                <button className="btn-soft btn-sm self-start" onClick={() => set((d) => void d.profile.debts.push({ id: uid('d'), name: '', balance: 0, apr: 0, payment: 0 }))}><Plus size={14} /> Add debt</button>
              </div>
            </div>
          </>
        ));
      case 5: {
        const disc = Object.values(p.actualSpending).reduce((a, b) => a + (b ?? 0), 0);
        const avail = p.takeHome - essentialsTotal(p) - p.debts.reduce((a, d) => a + d.payment, 0);
        return page('Your spending', 'Current spending', 'Your actual monthly spend — not what you would like it to be. Essentials are already captured.', (
          <>
            <div className="flex items-baseline justify-between rounded-xl bg-mist px-4 py-3 text-sm">
              <span className="text-muted">Discretionary total</span>
              <span className="num"><b className={cx('text-lg', disc > avail && 'text-rose')}>{money(disc)}</b> <span className="text-muted">/ {money(Math.max(0, avail))} available</span></span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              {SPENDING_CATEGORIES.filter((c) => c.kind !== 'zero').map((c) => (
                <Field key={c.id} label={c.label}>
                  <MoneyInput value={p.actualSpending[c.id] ?? 0} onChange={(v) => set((d) => void (d.profile.actualSpending[c.id] = v), `actual.${c.id}`)} />
                </Field>
              ))}
            </div>
            <Field label="Your monthly spending budget" hint="Recorded separately from actual spending. Used to suggest tax-free allowances.">
              <MoneyInput value={p.budget} onChange={(v) => set((d) => void (d.profile.budget = v), 'budget')} />
            </Field>
          </>
        ));
      }
      case 6:
        return page('Your career route', 'Grow your earning capacity', 'Optional. Add only the stages that apply to you — income rises are assumptions, never guarantees.', <StageEditor />);
      default:
        return page('Your choices', 'What will you change?', 'Your plan bends around what you are willing to do.', (
          <>
            <Field label="Habits you want to reduce">
              <CatPicker value={p.preferences.reduce} onChange={(v) => set((d) => void (d.profile.preferences.reduce = v), 'pref.reduce')} />
            </Field>
            <Field label="Categories to protect (never self-taxed)">
              <CatPicker value={p.preferences.protect} onChange={(v) => set((d) => void (d.profile.preferences.protect = v), 'pref.protect')} />
            </Field>
            <Toggle checked={p.preferences.fullSweep} onChange={(v) => set((d) => void (d.profile.preferences.fullSweep = v), 'pref.sweep')} label="Sweep all unspent money into my plan at month end (simulated)" />
            <Field label="Emergency-fund priority">
              <Choice value={p.preferences.emergencyMode} onChange={(v) => set((d) => void (d.profile.preferences.emergencyMode = v))} options={[{ v: 'first', label: 'Emergency fund first' }, { v: 'alongside', label: 'Alongside goals' }, { v: 'starter', label: 'Starter buffer, then split' }]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Share of future pay rises to goals" hint="The rest is assumed to be spent.">
                <PctInput value={p.preferences.extraIncomeShare} min={0} max={100} step={5} onChange={(v) => set((d) => void (d.profile.preferences.extraIncomeShare = v), 'pref.extra')} />
              </Field>
              <Field label="Investment preference" hint="Sets an illustrative return you can change.">
                <select className="input" value={p.preferences.risk} onChange={(e) => set((d) => void (d.profile.preferences.risk = e.target.value as typeof d.profile.preferences.risk))}>
                  <option value="cash">Cash only</option><option value="cautious">Cautious</option><option value="balanced">Balanced</option><option value="growth">Growth</option>
                </select>
              </Field>
            </div>
            <Field label="Financing preferences">
              <input className="input" placeholder="e.g. avoid borrowing, open to a mortgage later" value={p.preferences.financing} onChange={(e) => set((d) => void (d.profile.preferences.financing = e.target.value))} />
            </Field>
            {p.takeHome - essentialsTotal(p) - Object.values(p.actualSpending).reduce((a, b) => a + (b ?? 0), 0) < 0 && (
              <Notice tone="amber">Spending is above income right now. The plan will clear the deficit before funding any goal. This is common and fixable — not a judgement.</Notice>
            )}
          </>
        ));
    }
  })();

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-[3px] w-full bg-line"><div className="h-full bg-ink transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3.5 sm:px-5">
        <button className="flex items-center gap-1 text-sm text-ink/80 hover:text-ink" onClick={() => (step === 0 ? onExit() : setStep(step - 1))}>
          <ChevronLeft size={16} /> {step === 0 ? (state.onboarded ? 'Back to plan' : 'Home') : 'Back'}
        </button>
        <div className="hidden gap-1.5 sm:flex" aria-hidden>
          {STEPS.map((s, i) => <span key={s} className={cx('h-[3px] w-5 rounded-full', i < step ? 'bg-sage' : i === step ? 'bg-ink' : 'bg-line')} />)}
        </div>
        <span className="text-xs text-faint num">{step + 1} / {STEPS.length}</span>
      </header>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 pb-32 pt-8">{body}</main>
      <div className="sticky bottom-0 border-t border-line bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-[640px] gap-2">
          {last && state.onboarded && (
            <button className="btn-ghost flex-1" onClick={() => finish(false)}>Save & keep my settings</button>
          )}
          <button className="btn-primary flex-1 py-3" onClick={() => (last ? finish(state.onboarded) : setStep(step + 1))}>
            {last ? (state.onboarded ? 'Save & regenerate suggestions' : `Build ${first === 'you' ? 'my' : first + "'s"} plan`) : 'Continue'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CatPicker({ value, onChange }: { value: CategoryId[]; onChange: (v: CategoryId[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.filter((c) => c.kind === 'optional').map((c) => {
        const on = value.includes(c.id);
        return (
          <button key={c.id} type="button" aria-pressed={on} className={cx('chip', on && 'chip-on')} onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export { Avatar };
