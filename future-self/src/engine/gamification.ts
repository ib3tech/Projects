/**
 * Gamification rewards planning, learning and consistency — never spending, wealth or deposit size.
 * XP comes only from quests (actions) and real-life milestones the user records.
 */
import { AppState } from './profile';

export interface Quest {
  id: string;
  title: string;
  why: string;
  xp: number;
  /** Auto-detected from state (planning actions) or manual (user marks it). */
  check?: (s: AppState) => boolean;
}

export const QUESTS: Quest[] = [
  { id: 'questionnaire', title: 'Map where you are now', why: 'A plan starts from your real situation.', xp: 50, check: (s) => s.onboarded },
  { id: 'essentials', title: 'List your essential costs', why: 'Protecting essentials keeps the plan safe.', xp: 30, check: (s) => s.profile.essentials.length > 0 },
  { id: 'threeGoals', title: 'Describe what each goal means to you', why: 'Clear meaning makes trade-offs easier.', xp: 40, check: (s) => s.profile.goals.every((g) => g.meaning.trim().length > 0) },
  { id: 'meter', title: 'Open the Delusion Meter', why: 'Seeing the gap honestly is the first step.', xp: 10 },
  { id: 'allowance', title: 'Set a tax-free allowance', why: 'Allowances keep enjoyment in the plan.', xp: 20, check: (s) => Object.values(s.plan.rules).some((r) => (r?.allowance ?? 0) > 0) },
  { id: 'emergency', title: 'Choose an emergency-fund priority', why: 'A buffer protects every other goal.', xp: 20, check: (s) => s.plan.emergency.target > 0 },
  { id: 'careerStage', title: 'Define a career stage and its conditions', why: 'Earning capacity is built by actions, not assumed.', xp: 40, check: (s) => s.profile.careerStages.some((c) => c.conditions.length > 0) },
  { id: 'openMath', title: 'Open the math', why: 'Understanding the numbers beats trusting them.', xp: 30 },
  { id: 'testReturns', title: 'Test a 0% or negative return', why: 'Good plans survive bad years.', xp: 30 },
  { id: 'checkIn', title: 'Do a monthly check-in', why: 'Consistency matters more than amounts.', xp: 25 },
  { id: 'learn', title: 'Record a learning step completed in real life', why: 'Skills grow from completed actions.', xp: 40 },
  { id: 'dream', title: 'Picture your dream', why: 'A vivid goal is easier to stick with.', xp: 20, check: (s) => s.dream.title.trim().length > 0 },
];

export function questDone(s: AppState, q: Quest): boolean {
  return s.game.questsDone.includes(q.id) || (q.check ? q.check(s) : false);
}

export function totalXp(s: AppState): number {
  const fromQuests = QUESTS.filter((q) => questDone(s, q)).reduce((a, q) => a + q.xp, 0);
  const fromMilestones = s.milestones.filter((m) => m.completed).length * 35;
  const fromConditions = s.profile.careerStages.flatMap((c) => c.conditions).filter((c) => c.doneInRealLife).length * 50;
  const fromCheckIns = new Set(s.game.checkIns).size * 15;
  return fromQuests + fromMilestones + fromConditions + fromCheckIns;
}

export const LEVEL_NAMES = ['Starter', 'Explorer', 'Planner', 'Builder', 'Navigator', 'Strategist', 'Pathfinder', 'Architect', 'Mentor', 'Visionary'];

export function levelOf(xp: number): { level: number; name: string; into: number; span: number } {
  // level n requires 100·n·(n+1)/2 XP cumulatively — gentle curve
  let level = 1;
  while (xp >= (100 * level * (level + 1)) / 2 && level < LEVEL_NAMES.length) level++;
  const prev = (100 * (level - 1) * level) / 2;
  const next = (100 * level * (level + 1)) / 2;
  return { level, name: LEVEL_NAMES[level - 1], into: xp - prev, span: next - prev };
}

/** Longest run of consecutive months with a check-in. */
export function streak(checkIns: string[]): number {
  const ms = [...new Set(checkIns)].map((d) => {
    const [y, m] = d.split('-').map(Number);
    return y * 12 + m;
  }).sort((a, b) => a - b);
  let best = 0, cur = 0, prev = -999;
  for (const x of ms) {
    cur = x === prev + 1 ? cur + 1 : 1;
    best = Math.max(best, cur);
    prev = x;
  }
  return best;
}
