/**
 * The single derived model. The UI calls `buildModel(state)` once per state change and every
 * view reads from it, so the dashboard, meter, route, charts and math view show identical values.
 */
import { meter, MeterResult, sensitivities, Sensitivity, suggestions, Suggestion } from './delusion';
import { Pence } from './money';
import { AppState } from './profile';
import { buildRoute, RouteItem } from './route';
import { runScenario, ScenarioId } from './scenarios';
import { EngineResult } from './simulate';

export const ALL_SCENARIOS: ScenarioId[] = ['current', 'plan', 'planNoRise', 'index', 'careerThenIndex', 'careerThenIndexNoRise', 'spend'];

export interface Series {
  id: ScenarioId;
  points: { m: number; v: Pence }[];
}

export interface Model {
  results: Record<ScenarioId, EngineResult>;
  meters: { current: MeterResult; plan: MeterResult; planNoRise: MeterResult };
  sensitivities: Sensitivity[];
  suggestions: Suggestion[];
  route: RouteItem[];
  horizon: number;
  /** Net tracked assets (cash + reserve + pots − debts) — what the comparison graph measures. */
  netAssets: (id: ScenarioId, m: number) => Pence;
  series: (ids: ScenarioId[], metric: 'netAssets' | 'income' | 'toPlan') => Series[];
  summary: {
    month1: EngineResult['rows'][number];
    netAssetsAtHorizon: Pence;
    planScore: number | null;
    currentScore: number | null;
  };
}

export function netAssetsOf(res: EngineResult, m: number): Pence {
  if (m <= 0) return res.opening.assets - res.opening.debt;
  const r = res.rows[Math.min(m, res.rows.length) - 1];
  return r.closingAssets - r.debt;
}

export function buildModel(state: AppState, opts: { withAdvice?: boolean } = {}): Model {
  const results = Object.fromEntries(ALL_SCENARIOS.map((id) => [id, runScenario(state, id)])) as Record<ScenarioId, EngineResult>;
  const meters = {
    current: meter(state, results.current),
    plan: meter(state, results.plan),
    planNoRise: meter(state, results.planNoRise),
  };
  const horizon = Math.max(12, Math.round(state.plan.horizonYears * 12));
  const withAdvice = opts.withAdvice !== false;
  const netAssets = (id: ScenarioId, m: number) => netAssetsOf(results[id], m);
  const series = (ids: ScenarioId[], metric: 'netAssets' | 'income' | 'toPlan'): Series[] =>
    ids.map((id) => {
      const res = results[id];
      const pts: { m: number; v: Pence }[] = [];
      for (let m = metric === 'netAssets' ? 0 : 1; m <= horizon; m++) {
        const row = res.rows[m - 1];
        const v = metric === 'netAssets' ? netAssetsOf(res, m) : metric === 'income' ? row.income : row.toPlan;
        pts.push({ m, v });
      }
      return { id, points: pts };
    });
  return {
    results,
    meters,
    sensitivities: withAdvice ? sensitivities(state, meters.plan.score) : [],
    suggestions: withAdvice ? suggestions(state, meters.plan.score) : [],
    route: buildRoute(state, results.plan),
    horizon,
    netAssets,
    series,
    summary: {
      month1: results.plan.rows[0],
      netAssetsAtHorizon: netAssets('plan', horizon),
      planScore: meters.plan.score,
      currentScore: meters.current.score,
    },
  };
}
