/**
 * Builds engine inputs for every scenario from ONE profile + plan, so that all scenarios share
 * the same starting balances, emergency priority, income assumptions (incl. calendar changes)
 * and investment-return assumption. Only the documented differences vary.
 */
import { CategoryId, CategoryMap } from './categories';
import { Pence } from './money';
import { AppState, essentialsTotal, monthIndex, Profile, Plan } from './profile';
import { CareerStageInput, EngineInput, PotInput, simulate, EngineResult } from './simulate';

export const SIM_MONTHS = 600; // 50 years — long enough to show targets that take decades

export type ScenarioId =
  | 'current'
  | 'plan'
  | 'planNoRise'
  | 'index'
  | 'careerThenIndex'
  | 'careerThenIndexNoRise'
  | 'spend';

export const SCENARIO_LABELS: Record<ScenarioId, string> = {
  current: 'Current habits',
  plan: 'Your three-pot plan',
  planNoRise: 'Your plan — no pay rise',
  index: 'Index investing only (illustrative S&P 500-style return)',
  careerThenIndex: 'Career development, then investing',
  careerThenIndexNoRise: 'Career development, then investing — no pay rise',
  spend: 'Spending the money',
};

export function stageInputs(p: Profile): CareerStageInput[] {
  return p.careerStages.map((s) => ({
    id: s.id,
    name: s.name,
    developmentBudget: Math.max(0, s.developmentBudget),
    earliestMonth: Math.max(1, monthIndex(p.startDate, s.earliestDate || p.startDate)),
    delayMonths: Math.max(0, Math.round(s.delayMonths)),
    takeHome: Math.max(0, s.takeHome),
    goalShareOfExtra: Math.max(0, Math.min(1, s.goalShareOfExtra)),
  }));
}

export function goalPots(p: Profile): PotInput[] {
  return p.goals.map((g) => ({
    id: g.id,
    kind: g.kind,
    label: g.name || defaultGoalName(g.kind),
    target: g.kind === 'career' ? null : g.active ? Math.max(0, g.target) : 0,
    deadlineMonth: monthIndex(p.startDate, g.deadline),
    priority: g.priority,
    vehicle: g.kind === 'financial' ? 'invested' : g.kind === 'career' ? 'cash' : g.vehicle,
  }));
}

export function defaultGoalName(kind: string) {
  return kind === 'financial' ? 'Financial goal' : kind === 'career' ? 'Career goal' : 'Life goal';
}

export function openingBalances(p: Profile) {
  const b = p.balances;
  const fin = p.goals.find((g) => g.kind === 'financial');
  const life = p.goals.find((g) => g.kind === 'life');
  const pots: Record<string, Pence> = {};
  let cash = b.cash;
  if (fin) pots[fin.id] = b.investments + (p.savingsStartPot === 'financial' ? b.savings : 0);
  else cash += 0;
  if (life) pots[life.id] = p.savingsStartPot === 'life' ? b.savings : 0;
  if (p.savingsStartPot === 'cash') cash += b.savings;
  for (const g of p.goals) if (pots[g.id] === undefined) pots[g.id] = 0;
  return { cash, emergency: b.emergency, pots };
}

function baseInput(s: AppState): Omit<EngineInput, 'spending' | 'rules' | 'contribution' | 'pots' | 'allocation' | 'surplusUse' | 'progression' | 'stages' | 'opening'> {
  const { profile: p, plan } = s;
  return {
    months: SIM_MONTHS,
    baseTakeHome: Math.max(0, p.takeHome),
    calendar: plan.calendar,
    essentials: essentialsTotal(p),
    debts: p.debts,
    emergency: plan.emergency,
    returns: plan.returns,
  };
}

function rulesFor(plan: Plan) {
  return plan.selfTaxEnabled ? plan.rules : null;
}

function careerActive(p: Profile) {
  return p.goals.some((g) => g.kind === 'career' && g.active);
}

export function buildInput(s: AppState, id: ScenarioId): EngineInput {
  const { profile: p, plan } = s;
  const base = baseInput(s);
  const opening = openingBalances(p);
  const pots = goalPots(p);
  const stages = careerActive(p) ? stageInputs(p) : [];
  const planned: CategoryMap<Pence> = { ...p.actualSpending, ...plan.plannedSpending };
  const allocation = { method: plan.allocation.method, manualShares: plan.allocation.manualShares } as EngineInput['allocation'];
  const shared = {
    ...base,
    spending: planned,
    rules: rulesFor(plan),
    contribution: plan.contribution,
  };
  const totalPotOpening = Object.values(opening.pots).reduce((a, b) => a + b, 0);
  const careerPot = pots.find((x) => x.kind === 'career');
  const indexPot: PotInput = { id: 'index', kind: 'index', label: 'Index fund', target: null, deadlineMonth: SIM_MONTHS, priority: 1, vehicle: 'invested' };

  switch (id) {
    case 'current':
      return {
        ...base,
        spending: { ...p.actualSpending },
        rules: null,
        contribution: { mode: 'manual', ceiling: Math.max(0, p.existingMonthlySaving) },
        pots,
        stages,
        progression: true,
        allocation,
        surplusUse: 'save',
        opening,
      };
    case 'plan':
      return { ...shared, pots, stages, progression: true, allocation, surplusUse: 'save', opening };
    case 'planNoRise':
      return { ...shared, pots, stages, progression: false, allocation, surplusUse: 'save', opening };
    case 'index':
      return { ...shared, pots: [indexPot], stages: [], progression: false, allocation: { method: 'sequential' }, surplusUse: 'save', opening: { ...opening, pots: { index: totalPotOpening } } };
    case 'careerThenIndex':
    case 'careerThenIndexNoRise': {
      const cp: PotInput = careerPot ? { ...careerPot } : { id: 'career', kind: 'career', label: 'Career', target: null, deadlineMonth: 1, priority: 5, vehicle: 'cash' };
      const careerOpen = opening.pots[cp.id] ?? 0;
      return {
        ...shared,
        pots: [cp, indexPot],
        stages,
        progression: id === 'careerThenIndex',
        allocation: { method: 'sequential' },
        surplusUse: 'save',
        opening: { ...opening, pots: { [cp.id]: careerOpen, index: totalPotOpening - careerOpen } },
      };
    }
    case 'spend':
      return { ...shared, pots: [indexPot], stages: [], progression: false, allocation: { method: 'sequential' }, surplusUse: 'spend', opening: { ...opening, pots: { index: totalPotOpening } } };
  }
}

export function runScenario(s: AppState, id: ScenarioId): EngineResult {
  return simulate(buildInput(s, id));
}

/** Total planned discretionary spending (plan) vs actual. */
export function spendingTotals(s: AppState) {
  const actual = Object.values(s.profile.actualSpending).reduce((a, b) => a + (b ?? 0), 0);
  const planned = Object.entries({ ...s.profile.actualSpending, ...s.plan.plannedSpending }).reduce((a, [, b]) => a + (b ?? 0), 0);
  return { actual, planned };
}

export type { CategoryId };
