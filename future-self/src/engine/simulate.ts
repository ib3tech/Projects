/**
 * THE financial engine. Every dashboard, meter, timeline, chart and the "Open the math"
 * view is derived from `simulate()` — there is no second calculation path.
 *
 * Timing convention (per month m = 1..N):
 *  1. Growth/loss is applied to opening pot balances; interest is charged on any opening cash deficit.
 *  2. Take-home income is received (absolute level of the active career stage + calendar adjustments).
 *  3. Essentials, debt repayments and discretionary spending are paid.
 *  4. Any positive surplus first clears an earlier cash deficit.
 *  5. Self-tax (levy) and the sweep / manual transfer move the user's own money to the plan.
 *  6. Plan money goes to the emergency reserve, then to goal pots (never double-counted).
 *  7. A career pot that holds the next stage's development budget pays it (an expense).
 * All amounts are integer pence.
 */
import { allocateEmergency, EmergencyConfig, sequential, waterfill } from './allocate';
import { CategoryId, CategoryMap } from './categories';
import { monthlyRate, Pence, roundPence, sum } from './money';
import { computeSelfTax, Rules } from './selfTax';

export interface CareerStageInput {
  id: string;
  name: string;
  developmentBudget: Pence;
  /** Earliest month index (1-based) the higher income could start. */
  earliestMonth: number;
  /** Months between paying for development and the new income starting (study, job search…). */
  delayMonths: number;
  /** ABSOLUTE expected monthly take-home at this stage (not an increment). */
  takeHome: Pence;
  /** Share (0..1) of the extra income vs. the starting take-home directed to goals; the rest is assumed spent. */
  goalShareOfExtra: number;
}

export interface CalendarAdjustment {
  id: string;
  label: string;
  startMonth: number;
  endMonth?: number;
  /** Monthly change to take-home (can be negative). Applies in every scenario. */
  amount: Pence;
}

export interface DebtInput {
  id: string;
  name: string;
  balance: Pence;
  apr: number;
  payment: Pence;
}

export type PotKind = 'financial' | 'career' | 'life' | 'index';

export interface PotInput {
  id: string;
  kind: PotKind;
  label: string;
  /** null = uncapped (e.g. an index fund in comparison scenarios). Career pots derive need from stage budgets. */
  target: Pence | null;
  deadlineMonth: number;
  priority: number;
  vehicle: 'cash' | 'invested';
}

export interface EngineInput {
  months: number;
  baseTakeHome: Pence;
  /** Stages after the current one, in order. */
  stages: CareerStageInput[];
  /** false = no-pay-rise counterfactual: stage incomes never apply (development is still paid if funded). */
  progression: boolean;
  calendar: CalendarAdjustment[];
  essentials: Pence;
  debts: DebtInput[];
  /** Planned discretionary spending per category per month. */
  spending: CategoryMap<Pence>;
  /** null = no self-tax. */
  rules: Rules | null;
  contribution: { mode: 'sweep' } | { mode: 'manual'; ceiling: Pence };
  emergency: EmergencyConfig;
  pots: PotInput[];
  allocation: { method: 'weighted' | 'manual' | 'sequential'; manualShares?: Record<string, number> };
  /** 'spend' = the money that would go to goal pots is spent instead (comparison only). */
  surplusUse: 'save' | 'spend';
  opening: { cash: Pence; emergency: Pence; pots: Record<string, Pence> };
  returns: { investmentAnnual: number; cashAnnual: number; deficitApr: number };
}

export interface MonthRow {
  m: number;
  stageIndex: number; // 0 = starting situation
  // flows
  income: Pence;
  essentials: Pence;
  discretionary: Pence;
  lifestyleFromExtra: Pence;
  spentSurplus: Pence;
  debtRepayments: Pence;
  debtInterest: Pence;
  deficitInterest: Pence;
  growth: Pence;
  growthByPot: Record<string, Pence>;
  training: Pence;
  surplus: Pence; // income − essentials − debt repayments − spending (can be negative)
  deficitRepaid: Pence;
  available: Pence; // positive cash from this month's surplus after clearing deficit
  levyRequested: Pence;
  levy: Pence;
  rebate: Pence;
  sweep: Pence; // sweep or manual top-up beyond the levy
  toPlan: Pence; // levy − rebate + sweep
  toEmergency: Pence;
  toPots: Record<string, Pence>;
  overflow: Pence; // plan money with nowhere to go (all goals funded) — stays as cash
  shares: Record<string, number>; // share of toPlan per destination ('emergency' + pot ids)
  // balances (closing)
  cash: Pence;
  emergency: Pence;
  pots: Record<string, Pence>;
  debt: Pence;
  careerPaidCumulative: Pence;
  // reconciliation
  openingAssets: Pence;
  closingAssets: Pence;
  reconciles: boolean;
}

export interface EngineEvent {
  m: number;
  type: 'stageFunded' | 'stageActive' | 'emergencyStarter' | 'emergencyComplete' | 'potFirstHit' | 'debtCleared' | 'deficitStart' | 'deficitCleared';
  ref?: string;
  label: string;
}

export interface EngineResult {
  input: EngineInput;
  opening: { cash: Pence; emergency: Pence; pots: Record<string, Pence>; debt: Pence; assets: Pence };
  rows: MonthRow[];
  events: EngineEvent[];
  stageFundedMonth: (number | null)[];
  stageActiveMonth: (number | null)[];
}

export const trackedAssets = (cash: Pence, emergency: Pence, pots: Record<string, Pence>) => cash + emergency + sum(Object.values(pots));

/** Month (relative to funding) the stage income could start: max(earliest, funded + 1 + delay). */
export function stageStartMonth(stage: CareerStageInput, fundedMonth: number, prevActive: number): number {
  return Math.max(stage.earliestMonth, fundedMonth + 1 + Math.max(0, stage.delayMonths), prevActive);
}

export function simulate(input: EngineInput): EngineResult {
  const rInv = monthlyRate(input.returns.investmentAnnual);
  const rCash = monthlyRate(input.returns.cashAnnual);
  const rDef = monthlyRate(input.returns.deficitApr);

  let cash = input.opening.cash;
  let emergency = Math.max(0, input.opening.emergency);
  const pots: Record<string, Pence> = {};
  for (const p of input.pots) pots[p.id] = Math.max(0, input.opening.pots[p.id] ?? 0);
  const debts = input.debts.map((d) => ({ ...d, balance: Math.max(0, d.balance) }));
  const careerPot = input.pots.find((p) => p.kind === 'career');
  const stages = input.stages;
  const stageFundedMonth: (number | null)[] = stages.map(() => null);
  const stageActiveMonth: (number | null)[] = stages.map(() => null);
  let nextStageToFund = 0;
  let careerPaid = 0;
  const events: EngineEvent[] = [];
  const firstHitDone = new Set<string>();
  let emergencyStarterDone = emergency >= Math.min(input.emergency.starter, input.emergency.target) && input.emergency.mode === 'starter';
  let emergencyDone = emergency >= input.emergency.target;
  let inDeficit = cash < 0;

  const remainingCareerBudget = () => sum(stages.slice(nextStageToFund).map((s) => s.developmentBudget));

  // Zero-budget stages at the start are "funded" at month 0.
  const fundFreeStages = (m: number) => {
    while (nextStageToFund < stages.length && stages[nextStageToFund].developmentBudget <= 0) {
      stageFundedMonth[nextStageToFund] = m;
      nextStageToFund++;
    }
  };
  const settleStageDates = () => {
    let prevActive = 0;
    stages.forEach((s, i) => {
      const f = stageFundedMonth[i];
      if (f === null) return;
      if (i > 0 && stageActiveMonth[i - 1] === null) return;
      if (stageActiveMonth[i] === null) stageActiveMonth[i] = stageStartMonth(s, f, prevActive);
      prevActive = stageActiveMonth[i]!;
    });
  };
  fundFreeStages(0);
  settleStageDates();
  // record pre-existing stage events
  stages.forEach((s, i) => {
    if (input.progression && stageActiveMonth[i] !== null)
      events.push({ m: stageActiveMonth[i]!, type: 'stageActive', ref: s.id, label: `${s.name}: assumed income starts` });
  });

  const openingAssets0 = trackedAssets(cash, emergency, pots);
  const opening = { cash, emergency, pots: { ...pots }, debt: sum(debts.map((d) => d.balance)), assets: openingAssets0 };

  const fundedValue = (p: PotInput) => (p.kind === 'career' ? careerPaid + pots[p.id] : pots[p.id]);
  const potTarget = (p: PotInput) => (p.kind === 'career' ? sum(stages.map((s) => s.developmentBudget)) : p.target);

  // targets already reached at the start
  for (const p of input.pots) {
    const t = potTarget(p);
    if (t !== null && fundedValue(p) >= t) {
      firstHitDone.add(p.id);
      if (t <= 0) continue; // no funding target — not an achievement
      events.push({ m: 0, type: 'potFirstHit', ref: p.id, label: `${p.label}: target already reached` });
    }
  }

  const rows: MonthRow[] = [];
  for (let m = 1; m <= input.months; m++) {
    const openingAssets = trackedAssets(cash, emergency, pots);

    // 1. growth & deficit interest
    const growthByPot: Record<string, Pence> = {};
    let growth = 0;
    const gE = roundPence(emergency * rCash);
    emergency += gE;
    growth += gE;
    growthByPot.emergency = gE;
    for (const p of input.pots) {
      const r = p.vehicle === 'invested' ? rInv : rCash;
      const g = roundPence(pots[p.id] * r);
      pots[p.id] = Math.max(0, pots[p.id] + g);
      growthByPot[p.id] = g;
      growth += g;
    }
    let deficitInterest = 0;
    if (cash < 0) {
      deficitInterest = roundPence(-cash * rDef);
      cash -= deficitInterest;
    }

    // 2. income
    let stageIndex = 0;
    let stageIncome = input.baseTakeHome;
    let goalShare = 1;
    if (input.progression) {
      stages.forEach((s, i) => {
        const a = stageActiveMonth[i];
        if (a !== null && a <= m) {
          stageIndex = i + 1;
          stageIncome = s.takeHome;
          goalShare = Math.max(0, Math.min(1, s.goalShareOfExtra));
        }
      });
    }
    const calAdj = sum(input.calendar.filter((c) => c.startMonth <= m && (c.endMonth === undefined || m <= c.endMonth)).map((c) => c.amount));
    const income = Math.max(0, stageIncome + calAdj);
    const extra = Math.max(0, stageIncome - input.baseTakeHome);
    const lifestyleFromExtra = roundPence(extra * (1 - goalShare));

    // 3. spending & debts
    let debtRepayments = 0;
    let debtInterest = 0;
    for (const d of debts) {
      if (d.balance <= 0) continue;
      const i = roundPence(d.balance * monthlyRate(d.apr));
      d.balance += i;
      debtInterest += i;
      const pay = Math.min(d.payment, d.balance);
      d.balance -= pay;
      debtRepayments += pay;
      if (d.balance === 0) events.push({ m, type: 'debtCleared', ref: d.id, label: `${d.name} repaid` });
    }
    const spending: CategoryMap<Pence> = {};
    for (const [k, v] of Object.entries(input.spending) as [CategoryId, Pence][]) spending[k] = Math.max(0, v ?? 0);
    const discretionary = sum(Object.values(spending) as number[]);
    const essentials = Math.max(0, input.essentials);
    const surplus = income - essentials - debtRepayments - discretionary - lifestyleFromExtra;

    const cashBefore = cash;
    cash += surplus;

    // 4. clear earlier deficit first
    const deficitRepaid = cashBefore < 0 && surplus > 0 ? Math.min(surplus, -cashBefore) : 0;
    const available = Math.max(0, Math.min(surplus, cash));

    // 5. self-tax and sweep / manual transfer
    const cap = input.contribution.mode === 'sweep' ? available : Math.min(Math.max(0, input.contribution.ceiling), available);
    const tax = computeSelfTax(spending, input.rules, cap);
    const sweep = cap - tax.levy;
    const toPlan = cap - tax.rebate; // = levy − rebate + sweep; the rebate stays as spendable cash
    cash -= toPlan;

    // 6. allocation
    const toEmergency = allocateEmergency(toPlan, emergency, input.emergency);
    emergency += toEmergency;
    let rest = toPlan - toEmergency;
    const toPots: Record<string, Pence> = {};
    let spentSurplus = 0;
    let overflow = 0;
    if (input.surplusUse === 'spend') {
      spentSurplus = rest;
      rest = 0;
    } else if (input.pots.length) {
      const needs = input.pots.map((p) => {
        if (p.kind === 'career') return Math.max(0, remainingCareerBudget() - pots[p.id]);
        if (p.target === null) return Infinity;
        return Math.max(0, p.target - pots[p.id]);
      });
      let res: { parts: Pence[]; leftover: Pence };
      if (input.allocation.method === 'sequential') res = sequential(rest, needs);
      else {
        const weights = input.pots.map((p, i) => {
          if (input.allocation.method === 'manual') return Math.max(0, input.allocation.manualShares?.[p.id] ?? 0);
          // deadline-weighted: priority × monthly pace still required
          if (!Number.isFinite(needs[i])) return Math.max(1, p.priority);
          const monthsLeft = Math.max(1, p.deadlineMonth - m + 1);
          return Math.max(1, p.priority) * (needs[i] / monthsLeft);
        });
        res = waterfill(rest, weights, needs);
      }
      input.pots.forEach((p, i) => {
        toPots[p.id] = res.parts[i];
        pots[p.id] += res.parts[i];
      });
      overflow = res.leftover;
    } else overflow = rest;
    cash += overflow; // unassignable plan money returns to cash; spent surplus has left tracked assets
    const shares: Record<string, number> = {};
    if (toPlan > 0) {
      shares.emergency = toEmergency / toPlan;
      for (const p of input.pots) shares[p.id] = (toPots[p.id] ?? 0) / toPlan;
    }

    // 7. career development paid from the career pot
    let training = 0;
    if (careerPot) {
      fundFreeStages(m);
      while (nextStageToFund < stages.length && pots[careerPot.id] >= stages[nextStageToFund].developmentBudget) {
        const s = stages[nextStageToFund];
        pots[careerPot.id] -= s.developmentBudget;
        training += s.developmentBudget;
        careerPaid += s.developmentBudget;
        stageFundedMonth[nextStageToFund] = m;
        events.push({ m, type: 'stageFunded', ref: s.id, label: `${s.name}: development paid (${s.name} not yet achieved)` });
        nextStageToFund++;
        fundFreeStages(m);
      }
      const before = stageActiveMonth.map((x) => x);
      settleStageDates();
      stages.forEach((s, i) => {
        if (input.progression && before[i] === null && stageActiveMonth[i] !== null)
          events.push({ m: stageActiveMonth[i]!, type: 'stageActive', ref: s.id, label: `${s.name}: assumed income starts` });
      });
    }

    // events
    if (!emergencyDone && emergency >= input.emergency.target) {
      emergencyDone = true;
      events.push({ m, type: 'emergencyComplete', label: 'Emergency reserve target reached' });
    }
    if (input.emergency.mode === 'starter' && !emergencyStarterDone && emergency >= Math.min(input.emergency.starter, input.emergency.target)) {
      emergencyStarterDone = true;
      events.push({ m, type: 'emergencyStarter', label: 'Starter emergency buffer reached' });
    }
    for (const p of input.pots) {
      const t = potTarget(p);
      if (t !== null && !firstHitDone.has(p.id) && fundedValue(p) >= t) {
        firstHitDone.add(p.id);
        events.push({ m, type: 'potFirstHit', ref: p.id, label: `${p.label}: target first reached (forecast)` });
      }
    }
    if (!inDeficit && cash < 0) {
      inDeficit = true;
      events.push({ m, type: 'deficitStart', label: 'Cash deficit begins — spending exceeds money available' });
    } else if (inDeficit && cash >= 0) {
      inDeficit = false;
      events.push({ m, type: 'deficitCleared', label: 'Cash deficit cleared' });
    }

    const closingAssets = trackedAssets(cash, emergency, pots);
    const spendingTotal = essentials + discretionary + lifestyleFromExtra + spentSurplus;
    const expected = openingAssets + income + growth - spendingTotal - training - debtRepayments - deficitInterest;
    rows.push({
      m,
      stageIndex,
      income,
      essentials,
      discretionary,
      lifestyleFromExtra,
      spentSurplus,
      debtRepayments,
      debtInterest,
      deficitInterest,
      growth,
      growthByPot,
      training,
      surplus,
      deficitRepaid,
      available,
      levyRequested: tax.levyRequested,
      levy: tax.levy,
      rebate: tax.rebate,
      sweep,
      toPlan,
      toEmergency,
      toPots,
      overflow,
      shares,
      cash,
      emergency,
      pots: { ...pots },
      debt: sum(debts.map((d) => d.balance)),
      careerPaidCumulative: careerPaid,
      openingAssets,
      closingAssets,
      reconciles: expected === closingAssets,
    });
  }
  events.sort((a, b) => a.m - b.m);
  return { input, opening, rows, events, stageFundedMonth, stageActiveMonth };
}

/** Funded amount for a pot at the end of month m (m = 0 → opening). Career = paid for development + pot balance. */
export function fundedAt(res: EngineResult, potId: string, m: number): Pence {
  const pot = res.input.pots.find((p) => p.id === potId);
  if (!pot) return 0;
  if (m <= 0) return res.opening.pots[potId] ?? 0;
  const row = res.rows[Math.min(m, res.rows.length) - 1];
  return pot.kind === 'career' ? row.careerPaidCumulative + row.pots[potId] : row.pots[potId];
}

export function targetOf(res: EngineResult, potId: string): Pence | null {
  const pot = res.input.pots.find((p) => p.id === potId);
  if (!pot) return null;
  return pot.kind === 'career' ? sum(res.input.stages.map((s) => s.developmentBudget)) : pot.target;
}

export function firstHitMonth(res: EngineResult, potId: string): number | null {
  const t = targetOf(res, potId);
  if (t === null) return null;
  if (fundedAt(res, potId, 0) >= t) return 0;
  for (const r of res.rows) if (fundedAt(res, potId, r.m) >= t) return r.m;
  return null;
}
