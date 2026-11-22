/**
 * Personalised route: forecast events from the engine + the user's own editable milestones.
 * Each item is tagged so money, required actions, assumed outcomes and real achievements
 * are never confused.
 */
import { AppState, dateOfMonth, monthIndex } from './profile';
import { EngineResult } from './simulate';
import { defaultGoalName } from './scenarios';

export type RouteItemType = 'money' | 'action' | 'qualification' | 'assumed-outcome' | 'achievement' | 'warning';
export type Horizon = 'short' | 'medium' | 'long';

export interface RouteItem {
  id: string;
  m: number;
  date: string;
  title: string;
  type: RouteItemType;
  source: 'forecast' | 'user';
  completed: boolean;
  goalId: string | null;
  horizon: Horizon;
  editable: boolean;
}

export const horizonOf = (m: number): Horizon => (m <= 12 ? 'short' : m <= 60 ? 'medium' : 'long');

export function buildRoute(state: AppState, res: EngineResult): RouteItem[] {
  const start = state.profile.startDate;
  const items: RouteItem[] = [];
  for (const [k, e] of res.events.entries()) {
    if (e.m > state.plan.horizonYears * 12 && e.type !== 'potFirstHit') continue;
    const type: RouteItemType =
      e.type === 'stageActive' ? 'assumed-outcome' : e.type === 'deficitStart' ? 'warning' : 'money';
    items.push({
      id: `ev-${k}`,
      m: e.m,
      date: e.m === 0 ? start : dateOfMonth(start, e.m),
      title: e.label,
      type,
      source: 'forecast',
      completed: false,
      goalId: e.ref ?? null,
      horizon: horizonOf(Math.max(1, e.m)),
      editable: false,
    });
  }
  // career conditions → required actions (not implied by funding)
  for (const s of state.profile.careerStages) {
    for (const c of s.conditions) {
      const m = Math.max(1, monthIndex(start, s.earliestDate || start));
      items.push({
        id: `cond-${c.id}`,
        m,
        date: dateOfMonth(start, m),
        title: `${s.name}: ${c.text}`,
        type: 'qualification',
        source: 'user',
        completed: c.doneInRealLife,
        goalId: state.profile.goals.find((g) => g.kind === 'career')?.id ?? null,
        horizon: horizonOf(m),
        editable: true,
      });
    }
  }
  for (const ms of state.milestones) {
    const m = Math.max(1, monthIndex(start, ms.date));
    items.push({
      id: ms.id,
      m,
      date: ms.date,
      title: ms.title,
      type: ms.completed ? 'achievement' : ms.type,
      source: 'user',
      completed: ms.completed,
      goalId: ms.goalId,
      horizon: horizonOf(m),
      editable: true,
    });
  }
  // deadlines
  for (const g of state.profile.goals) {
    if (!g.active) continue;
    const m = monthIndex(start, g.deadline);
    items.push({
      id: `deadline-${g.id}`,
      m,
      date: g.deadline,
      title: `Deadline: ${g.name || defaultGoalName(g.kind)}`,
      type: 'action',
      source: 'user',
      completed: false,
      goalId: g.id,
      horizon: horizonOf(Math.max(1, m)),
      editable: false,
    });
  }
  return items.sort((a, b) => a.m - b.m || a.title.localeCompare(b.title));
}
