/**
 * The "Delusion Meter": a transparent funding-gap score.
 *
 *   shortfall_g = max(0, 1 − funded_g(at deadline) / target_g)
 *   score       = mean(shortfall_g over active goals with a target > 0) × 100
 *
 * A planning measure — NOT a probability of success and NOT a judgement of the person.
 */
import { Pence } from './money';
import { AppState, dateOfMonth, Goal } from './profile';
import { buildInput, defaultGoalName, ScenarioId } from './scenarios';
import { EngineInput, EngineResult, firstHitMonth, fundedAt, simulate, targetOf } from './simulate';

export interface GoalFunding {
  goalId: string;
  name: string;
  kind: Goal['kind'];
  target: Pence;
  deadlineMonth: number;
  deadline: string;
  fundedAtDeadline: Pence;
  shortfall: Pence;
  shortfallPct: number; // 0..1
  firstHitMonth: number | null;
  firstHitDate: string | null;
  /** Reached target at some point but below it at the deadline (e.g. negative returns). */
  dippedBelowAfterHit: boolean;
  alreadyReached: boolean;
  included: boolean;
}

export interface MeterResult {
  score: number | null; // null when no goal has a target
  goals: GoalFunding[];
}

export function goalFunding(state: AppState, res: EngineResult): GoalFunding[] {
  const start = state.profile.startDate;
  return state.profile.goals.map((g) => {
    const pot = res.input.pots.find((p) => p.id === g.id);
    const target = Math.max(0, targetOf(res, g.id) ?? 0);
    const dm = pot ? pot.deadlineMonth : 0;
    const funded = fundedAt(res, g.id, Math.max(0, dm));
    const fh = firstHitMonth(res, g.id);
    const shortfallPct = target > 0 ? Math.max(0, 1 - funded / target) : 0;
    return {
      goalId: g.id,
      name: g.name || defaultGoalName(g.kind),
      kind: g.kind,
      target,
      deadlineMonth: dm,
      deadline: g.deadline,
      fundedAtDeadline: funded,
      shortfall: Math.max(0, target - funded),
      shortfallPct,
      firstHitMonth: fh,
      firstHitDate: fh === null ? null : fh === 0 ? 'already' : dateOfMonth(start, fh),
      dippedBelowAfterHit: fh !== null && fh <= dm && funded < target,
      alreadyReached: fh === 0,
      included: g.active && target > 0,
    };
  });
}

export function meterScore(goals: GoalFunding[]): number | null {
  const inc = goals.filter((g) => g.included);
  if (!inc.length) return null;
  return (inc.reduce((a, g) => a + g.shortfallPct, 0) / inc.length) * 100;
}

export function meter(state: AppState, res: EngineResult): MeterResult {
  const goals = goalFunding(state, res);
  return { score: meterScore(goals), goals };
}

export function scoreBand(score: number | null): { label: string; tone: 'good' | 'mid' | 'warn' | 'none' } {
  if (score === null) return { label: 'No funded targets set yet', tone: 'none' };
  if (score < 0.5) return { label: 'Funded at every deadline under these assumptions', tone: 'good' };
  if (score < 25) return { label: 'Small funding gap', tone: 'mid' };
  if (score < 60) return { label: 'Significant funding gap', tone: 'warn' };
  return { label: 'Large funding gap', tone: 'warn' };
}

export interface Sensitivity {
  id: string;
  label: string;
  explanation: string;
  score: number | null;
}

export interface Suggestion {
  id: string;
  label: string;
  detail: string;
  score: number | null;
  delta: number | null;
  /** Extra monthly amount (pence) when the suggestion is about finding more money. */
  amount?: Pence;
}

function scoreFor(state: AppState, input: EngineInput) {
  return meterScore(goalFunding(state, simulate(input)));
}

/** Which assumptions drive the result: re-run the SAME engine with one assumption changed. */
export function sensitivities(state: AppState, planScore: number | null): Sensitivity[] {
  const out: Sensitivity[] = [];
  const base = () => buildInput(state, 'plan');
  const r = state.plan.returns.investmentAnnual;
  {
    const i = base();
    i.returns = { ...i.returns, investmentAnnual: 0, cashAnnual: 0 };
    out.push({ id: 'zeroReturn', label: `Returns: ${(r * 100).toFixed(1)}% invested / ${(state.plan.returns.cashAnnual * 100).toFixed(1)}% cash`, explanation: 'Score if every pot earned 0%.', score: scoreFor(state, i) });
  }
  if (state.profile.careerStages.length) {
    const i = base();
    i.progression = false;
    out.push({ id: 'noRise', label: 'Expected career income', explanation: 'Score if no pay rise happens (training still paid).', score: scoreFor(state, i) });
  }
  {
    const i = base();
    i.spending = { ...state.profile.actualSpending };
    out.push({ id: 'actualSpending', label: 'Planned spending changes', explanation: 'Score if spending stays at your current actual levels.', score: scoreFor(state, i) });
  }
  out.push({ id: 'plan', label: 'Your plan as entered', explanation: 'All assumptions as currently set.', score: planScore });
  return out;
}

/** Changes that could close the gap — each is a re-run of the same engine, never a promise. */
export function suggestions(state: AppState, planScore: number | null): Suggestion[] {
  const res: Suggestion[] = [];
  if (planScore === null || planScore < 0.5) return res;
  const mk = (id: string, label: string, detail: string, input: EngineInput) => {
    const s = scoreFor(state, input);
    res.push({ id, label, detail, score: s, delta: s === null ? null : s - planScore });
  };
  const p = state.profile;
  if (p.preferences.reduce.length) {
    const i = buildInput(state, 'plan');
    const sp = { ...i.spending };
    for (const c of p.preferences.reduce) if (sp[c]) sp[c] = Math.round(sp[c]! * 0.75);
    i.spending = sp;
    mk('reduce25', 'Spend 25% less in the categories you chose to reduce', 'Only if you decide to; the app does not assume self-tax changes behaviour.', i);
  }
  if (state.plan.contribution.mode === 'manual') {
    const i = buildInput(state, 'plan');
    i.contribution = { mode: 'sweep' };
    mk('sweep', 'Switch to the full unspent-money sweep', 'Moves all money left at month end into your plan.', i);
  }
  if (p.careerStages.some((s) => s.goalShareOfExtra < 1)) {
    const i = buildInput(state, 'plan');
    i.stages = i.stages.map((s) => ({ ...s, goalShareOfExtra: 1 }));
    mk('allExtra', 'Direct all future extra income to goals', 'Assumes no lifestyle increase when income rises.', i);
  }
  // Extra monthly amount needed to close the gap fully (binary search on an extra monthly amount).
  const extraNeeded = extraMonthlyToClose(state);
  if (extraNeeded !== null) {
    const i = buildInput(state, 'plan');
    i.calendar = [...i.calendar, { id: 'extra', label: 'extra', startMonth: 1, amount: extraNeeded }];
    mk('extra', 'Find more money each month (earn more or spend less)', 'Smallest extra monthly amount that closes every gap under these assumptions.', i);
    res[res.length - 1].amount = extraNeeded;
  }
  return res;
}

export function extraMonthlyToClose(state: AppState): Pence | null {
  const base = buildInput(state, 'plan');
  const test = (x: Pence) => {
    const i: EngineInput = { ...base, calendar: [...base.calendar, { id: 'x', label: 'x', startMonth: 1, amount: x }] };
    const s = scoreFor(state, i);
    return s !== null && s < 0.5;
  };
  let hi = Math.max(10000, base.baseTakeHome);
  let guard = 0;
  while (!test(hi) && guard++ < 12) hi *= 2;
  if (!test(hi)) return null;
  let lo = 0;
  while (hi - lo > 100) {
    const mid = Math.floor((lo + hi) / 2);
    if (test(mid)) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi / 100) * 100;
}

export function scenarioMeter(state: AppState, results: Record<ScenarioId, EngineResult>, id: ScenarioId) {
  return meter(state, results[id]);
}
