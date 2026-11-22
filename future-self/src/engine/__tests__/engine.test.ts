import { describe, expect, it } from 'vitest';
import { allocateEmergency, waterfill } from '../allocate';
import { buildModel } from '../model';
import { demoState, emptyState } from '../defaults';
import { meter, meterScore } from '../delusion';
import { toPence } from '../money';
import { buildInput } from '../scenarios';
import { computeSelfTax, explainPurchase } from '../selfTax';
import { EngineInput, firstHitMonth, fundedAt, simulate } from '../simulate';

const P = toPence;

/** Minimal, explicit engine input — every test states its own numbers. */
function input(over: Partial<EngineInput> = {}): EngineInput {
  return {
    months: 12,
    baseTakeHome: P(500),
    stages: [],
    progression: true,
    calendar: [],
    essentials: 0,
    debts: [],
    spending: {},
    rules: null,
    contribution: { mode: 'sweep' },
    emergency: { target: 0, mode: 'first', share: 0, starter: 0 },
    pots: [{ id: 'a', kind: 'financial', label: 'A', target: null, deadlineMonth: 12, priority: 3, vehicle: 'cash' }],
    allocation: { method: 'weighted' },
    surplusUse: 'save',
    opening: { cash: 0, emergency: 0, pots: {} },
    returns: { investmentAnnual: 0, cashAnnual: 0, deficitApr: 0 },
    ...over,
  };
}

describe('self-tax and sweep — the £500 / £200 example', () => {
  it('£500 available, £200 spent, £40 levy, £260 sweep → £300 progress, never £340', () => {
    // 20% on shopping with no allowance → £40 levy on £200
    const res = simulate(input({
      months: 1,
      spending: { shopping: P(200) },
      rules: { shopping: { rate: 0.2, allowance: 0, protected: false } },
    }));
    const r = res.rows[0];
    expect(r.levy).toBe(P(40));
    expect(r.sweep).toBe(P(260));
    expect(r.toPlan).toBe(P(300));
    expect(r.pots.a).toBe(P(300));
    expect(r.cash).toBe(0);
    expect(r.reconciles).toBe(true);
  });

  it('with a full sweep, rates and allowances change the split but not the total', () => {
    const totals = [0, 0.1, 0.5].flatMap((rate) =>
      [0, P(100), P(500)].map((allowance) => {
        const r = simulate(input({ months: 1, spending: { shopping: P(200) }, rules: { shopping: { rate, allowance, protected: false } } })).rows[0];
        return r.toPlan;
      }),
    );
    expect(new Set(totals)).toEqual(new Set([P(300)]));
  });

  it('spending less creates more surplus (user-entered behaviour change)', () => {
    const a = simulate(input({ months: 1, spending: { shopping: P(200) } })).rows[0].toPlan;
    const b = simulate(input({ months: 1, spending: { shopping: P(150) } })).rows[0].toPlan;
    expect(b - a).toBe(P(50));
  });

  it('allowance above spending → no levy, everything swept', () => {
    const r = simulate(input({ months: 1, spending: { shopping: P(200) }, rules: { shopping: { rate: 0.5, allowance: P(300), protected: false } } })).rows[0];
    expect(r.levy).toBe(0);
    expect(r.sweep).toBe(P(300));
  });

  it('bills/income/savings/protected categories are never taxed', () => {
    const t = computeSelfTax(
      { bills: P(500), savings: P(100), transfers: P(100), groceries: P(300) },
      { bills: { rate: 0.5, allowance: 0, protected: false }, savings: { rate: 0.5, allowance: 0, protected: false }, transfers: { rate: 0.5, allowance: 0, protected: false }, groceries: { rate: 0.5, allowance: 0, protected: true } },
      P(10000),
    );
    expect(t.levy).toBe(0);
  });

  it('manual mode respects the contribution ceiling and leaves unallocated cash visible', () => {
    const r = simulate(input({ months: 1, contribution: { mode: 'manual', ceiling: P(100) }, spending: { shopping: P(200) }, rules: { shopping: { rate: 0.2, allowance: 0, protected: false } } })).rows[0];
    expect(r.levy).toBe(P(40));
    expect(r.sweep).toBe(P(60));
    expect(r.toPlan).toBe(P(100));
    expect(r.cash).toBe(P(200)); // unallocated
    expect(r.reconciles).toBe(true);
  });

  it('purchase explanation separates price, self-tax and immediate cash movement', () => {
    const e = explainPurchase('eatingOut', P(30), P(40), { rate: 0.1, allowance: P(50), protected: false });
    expect(e.allowanceLeftBefore).toBe(P(10));
    expect(e.taxablePart).toBe(P(20));
    expect(e.selfTax).toBe(P(2));
    expect(e.immediateCashMovement).toBe(P(32));
  });
});

describe('charity rebates', () => {
  it('rebates are capped at available positive levies and never overdraw', () => {
    const rules = { charity: { rate: -0.05, allowance: 0, protected: false }, shopping: { rate: 0.01, allowance: 0, protected: false } };
    const t = computeSelfTax({ charity: P(1000), shopping: P(100) }, rules, P(1000));
    expect(t.rebateRequested).toBe(P(50));
    expect(t.levy).toBe(P(1));
    expect(t.rebate).toBe(P(1));
    expect(t.netLevy).toBe(0);
  });

  it('no levy → no rebate at all', () => {
    const t = computeSelfTax({ charity: P(200) }, { charity: { rate: -0.05, allowance: 0, protected: false } }, P(1000));
    expect(t.rebate).toBe(0);
  });

  it('rates below −5% are clamped', () => {
    const t = computeSelfTax({ charity: P(100), shopping: P(1000) }, { charity: { rate: -0.5, allowance: 0, protected: false }, shopping: { rate: 0.5, allowance: 0, protected: false } }, P(10000));
    expect(t.rebate).toBe(P(5));
  });

  it('a spendable rebate is excluded from the sweep and reduces goal funding by exactly the rebate', () => {
    const rules = { charity: { rate: -0.05, allowance: 0, protected: false }, shopping: { rate: 0.2, allowance: 0, protected: false } };
    const withR = simulate(input({ months: 1, spending: { charity: P(100), shopping: P(100) }, rules })).rows[0];
    const without = simulate(input({ months: 1, spending: { charity: P(100), shopping: P(100) }, rules: { shopping: rules.shopping } })).rows[0];
    expect(withR.rebate).toBe(P(5));
    expect(without.toPlan - withR.toPlan).toBe(P(5));
    expect(withR.cash).toBe(P(5)); // rebate kept as spendable cash
    expect(withR.reconciles).toBe(true);
  });
});

describe('zero income, overspending and deficits', () => {
  it('zero income with essentials creates a deficit, no contributions, no levy', () => {
    const res = simulate(input({ baseTakeHome: 0, essentials: P(300), spending: { shopping: P(50) }, rules: { shopping: { rate: 0.2, allowance: 0, protected: false } }, months: 3 }));
    for (const r of res.rows) {
      expect(r.toPlan).toBe(0);
      expect(r.levy).toBe(0);
      expect(r.reconciles).toBe(true);
    }
    expect(res.rows[2].cash).toBe(-P(1050));
  });

  it('spending above income accrues the assumed borrowing cost (not free)', () => {
    const res = simulate(input({ months: 2, baseTakeHome: P(100), essentials: P(200), returns: { investmentAnnual: 0, cashAnnual: 0, deficitApr: 0.12 } }));
    expect(res.rows[1].deficitInterest).toBeGreaterThan(0);
    expect(res.rows[1].reconciles).toBe(true);
  });

  it('positive surplus clears an earlier deficit before any goal is funded', () => {
    const res = simulate(input({ months: 3, opening: { cash: -P(700), emergency: 0, pots: {} } }));
    expect(res.rows[0].deficitRepaid).toBe(P(500));
    expect(res.rows[0].toPlan).toBe(0);
    expect(res.rows[1].deficitRepaid).toBe(P(200));
    expect(res.rows[1].toPlan).toBe(P(300));
    expect(res.rows[2].toPlan).toBe(P(500));
  });
});

describe('career development', () => {
  const stage = { id: 's1', name: 'Qualified', developmentBudget: P(1000), earliestMonth: 1, delayMonths: 3, takeHome: P(800), goalShareOfExtra: 1 };
  const careerPots = [{ id: 'c', kind: 'career' as const, label: 'Career', target: null, deadlineMonth: 24, priority: 5, vehicle: 'cash' as const }];

  it('training is paid as an expense when funded and the raise waits for the delay', () => {
    const res = simulate(input({ months: 12, stages: [stage], pots: careerPots }));
    // £500/month → £1000 by end of month 2 → paid month 2 → income from month 2+1+3 = 6
    expect(res.stageFundedMonth[0]).toBe(2);
    expect(res.stageActiveMonth[0]).toBe(6);
    expect(res.rows[1].training).toBe(P(1000));
    expect(res.rows[4].income).toBe(P(500));
    expect(res.rows[5].income).toBe(P(800));
    expect(res.rows.every((r) => r.reconciles)).toBe(true);
  });

  it('raise never starts before the earliest date', () => {
    const res = simulate(input({ months: 24, stages: [{ ...stage, earliestMonth: 15 }], pots: careerPots }));
    expect(res.stageActiveMonth[0]).toBe(15);
    expect(res.rows[13].income).toBe(P(500));
    expect(res.rows[14].income).toBe(P(800));
  });

  it('salary levels are absolute, not stacked', () => {
    const s2 = { ...stage, id: 's2', name: 'Senior', developmentBudget: 0, takeHome: P(900), earliestMonth: 10, delayMonths: 0 };
    const res = simulate(input({ months: 12, stages: [stage, s2], pots: careerPots }));
    expect(res.rows[11].income).toBe(P(900)); // not 500+300+400
  });

  it('no-pay-rise scenario pays for training but income stays flat', () => {
    const res = simulate(input({ months: 12, stages: [stage], pots: careerPots, progression: false }));
    expect(res.rows[1].training).toBe(P(1000));
    expect(res.rows.every((r) => r.income === P(500))).toBe(true);
  });

  it('calendar income changes apply equally with and without the pay rise', () => {
    const cal = [{ id: 'x', label: 'Contract change', startMonth: 3, amount: -P(100) }];
    const a = simulate(input({ months: 12, stages: [stage], pots: careerPots, calendar: cal }));
    const b = simulate(input({ months: 12, stages: [stage], pots: careerPots, calendar: cal, progression: false }));
    expect(a.rows[2].income).toBe(P(400));
    expect(b.rows[2].income).toBe(P(400));
    expect(b.rows[11].income).toBe(P(400));
  });

  it('only the chosen share of extra income goes to goals; the rest is treated as spent', () => {
    const res = simulate(input({ months: 8, stages: [{ ...stage, delayMonths: 0, goalShareOfExtra: 0.5 }], pots: careerPots }));
    const r = res.rows[7];
    expect(r.income).toBe(P(800));
    expect(r.lifestyleFromExtra).toBe(P(150));
    expect(r.toPlan).toBe(P(650));
  });
});

describe('emergency fund and pots', () => {
  it('emergency-first fills the reserve, then redirects its share to goals', () => {
    const res = simulate(input({ months: 4, emergency: { target: P(800), mode: 'first', share: 0, starter: 0 } }));
    expect(res.rows[0].toEmergency).toBe(P(500));
    expect(res.rows[1].toEmergency).toBe(P(300));
    expect(res.rows[1].toPots.a).toBe(P(200));
    expect(res.rows[2].toEmergency).toBe(0);
    expect(res.rows[2].toPots.a).toBe(P(500));
    expect(res.events.some((e) => e.type === 'emergencyComplete' && e.m === 2)).toBe(true);
  });

  it('starter buffer then a configurable split', () => {
    expect(allocateEmergency(P(500), 0, { target: P(2000), mode: 'starter', share: 0.5, starter: P(300) })).toBe(P(300 + 100));
  });

  it('fully funded goal redistributes to others; nothing is double counted', () => {
    const pots = [
      { id: 'a', kind: 'financial' as const, label: 'A', target: P(600), deadlineMonth: 12, priority: 3, vehicle: 'cash' as const },
      { id: 'b', kind: 'life' as const, label: 'B', target: P(3000), deadlineMonth: 12, priority: 3, vehicle: 'cash' as const },
    ];
    const res = simulate(input({ months: 12, pots }));
    for (const r of res.rows) {
      expect(r.toEmergency + (r.toPots.a ?? 0) + (r.toPots.b ?? 0) + r.overflow).toBe(r.toPlan);
    }
    expect(res.rows[11].pots.a).toBe(P(600));
    expect(res.rows[11].pots.b).toBe(P(3000));
    // after both full, overflow stays visible as cash
    expect(res.rows[11].overflow).toBe(P(500));
  });

  it('waterfill never exceeds needs and preserves pennies', () => {
    const { parts, leftover } = waterfill(1001, [1, 1, 1], [100, Infinity, 50]);
    expect(parts[0]).toBe(100);
    expect(parts[2]).toBe(50);
    expect(parts[0] + parts[1] + parts[2] + leftover).toBe(1001);
  });

  it('targets already reached are recognised at month 0', () => {
    const pots = [{ id: 'a', kind: 'life' as const, label: 'A', target: P(1000), deadlineMonth: 6, priority: 3, vehicle: 'cash' as const }];
    const res = simulate(input({ months: 6, pots, opening: { cash: 0, emergency: 0, pots: { a: P(1500) } } }));
    expect(firstHitMonth(res, 'a')).toBe(0);
    expect(res.rows[0].toPots.a).toBe(0);
  });
});

describe('investment returns', () => {
  it('negative returns reduce invested pots and are reported as losses', () => {
    const pots = [{ id: 'a', kind: 'financial' as const, label: 'A', target: null, deadlineMonth: 12, priority: 3, vehicle: 'invested' as const }];
    const res = simulate(input({ months: 12, baseTakeHome: 0, pots, opening: { cash: 0, emergency: 0, pots: { a: P(10000) } }, returns: { investmentAnnual: -0.2, cashAnnual: 0, deficitApr: 0 } }));
    expect(res.rows[0].growth).toBeLessThan(0);
    expect(res.rows[11].pots.a).toBeGreaterThan(P(7990));
    expect(res.rows[11].pots.a).toBeLessThan(P(8010));
    expect(res.rows.every((r) => r.reconciles)).toBe(true);
  });

  it('first target hit can differ from money at the deadline', () => {
    const pots = [{ id: 'a', kind: 'financial' as const, label: 'A', target: P(1000), deadlineMonth: 24, priority: 3, vehicle: 'invested' as const }];
    // income stops after month 3 (calendar change), then the market falls
    const calendar = [{ id: 'stop', label: 'Career break', startMonth: 4, amount: -P(500) }];
    const res = simulate(input({ months: 24, baseTakeHome: P(500), pots, calendar, returns: { investmentAnnual: -0.5, cashAnnual: 0, deficitApr: 0 } }));
    const hit = firstHitMonth(res, 'a');
    expect(hit).toBe(3);
    expect(fundedAt(res, 'a', 24)).toBeLessThan(P(1000));
  });
});

describe('reconciliation', () => {
  it('every month reconciles to the penny for the demo persona in every scenario', () => {
    const m = buildModel(demoState('2026-01'), { withAdvice: false });
    for (const res of Object.values(m.results)) {
      for (const r of res.rows) {
        expect(r.reconciles).toBe(true);
        expect(r.closingAssets).toBe(r.cash + r.emergency + Object.values(r.pots).reduce((a, b) => a + b, 0));
        expect(Number.isInteger(r.closingAssets)).toBe(true);
      }
    }
  });
});

describe('Delusion Meter', () => {
  it('score = mean shortfall % × 100', () => {
    expect(meterScore([
      { included: true, shortfallPct: 0.5 } as never,
      { included: true, shortfallPct: 0 } as never,
      { included: false, shortfallPct: 1 } as never,
    ])).toBe(25);
  });

  it('a fully funded plan scores 0 — no manufactured alarm', () => {
    const s = emptyState('2026-01');
    s.profile.takeHome = P(3000);
    s.profile.goals[0] = { ...s.profile.goals[0], target: P(1000), deadline: '2026-12' };
    s.profile.goals[2] = { ...s.profile.goals[2], target: P(1000), deadline: '2026-12' };
    s.plan.emergency.target = 0;
    const m = buildModel(s, { withAdvice: false });
    expect(m.meters.plan.score).toBe(0);
  });

  it('an empty profile does not produce a fake score', () => {
    const m = buildModel(emptyState('2026-01'), { withAdvice: false });
    expect(m.meters.plan.score).toBeNull();
  });

  it('a target taking decades is shown as decades, not hidden', () => {
    const s = emptyState('2026-01');
    s.profile.takeHome = P(1010);
    s.profile.essentials = [{ id: 'e', label: 'Rent', amount: P(1000) }];
    s.profile.goals[2] = { ...s.profile.goals[2], target: P(3000), deadline: '2027-01' };
    s.plan.emergency.target = 0;
    s.plan.returns = { investmentAnnual: 0, cashAnnual: 0, deficitApr: 0.2 };
    const res = buildModel(s, { withAdvice: false });
    const g = res.meters.plan.goals.find((x) => x.kind === 'life')!;
    expect(g.firstHitMonth).toBe(300); // £10/month → 25 years
    expect(g.shortfallPct).toBeGreaterThan(0.9);
  });
});

describe('one engine — identical values across views', () => {
  it('dashboard summary, meter, chart series and math rows come from the same run', () => {
    const s = demoState('2026-01');
    const m = buildModel(s, { withAdvice: false });
    const series = m.series(['plan'], 'netAssets')[0];
    const row = m.results.plan.rows[m.horizon - 1];
    expect(series.points[m.horizon].v).toBe(row.closingAssets - row.debt);
    expect(m.summary.netAssetsAtHorizon).toBe(series.points[m.horizon].v);
    const met = meter(s, m.results.plan);
    expect(met.score).toBe(m.summary.planScore);
    const g = m.meters.plan.goals[2];
    expect(g.fundedAtDeadline).toBe(fundedAt(m.results.plan, g.goalId, g.deadlineMonth));
    expect(m.summary.month1).toBe(m.results.plan.rows[0]);
  });

  it('comparison scenarios share starting balances, income assumptions and emergency priority', () => {
    const s = demoState('2026-01');
    const ids = ['plan', 'index', 'careerThenIndex', 'spend'] as const;
    const inputs = ids.map((id) => buildInput(s, id));
    const opening = inputs.map((i) => i.opening.cash + i.opening.emergency + Object.values(i.opening.pots).reduce((a, b) => a + b, 0));
    expect(new Set(opening).size).toBe(1);
    expect(new Set(inputs.map((i) => i.returns.investmentAnnual)).size).toBe(1);
    expect(new Set(inputs.map((i) => JSON.stringify(i.emergency))).size).toBe(1);
    expect(new Set(inputs.map((i) => i.baseTakeHome)).size).toBe(1);
  });

  it('changing a deadline never changes the return assumption', () => {
    const s = demoState('2026-01');
    const a = buildInput(s, 'plan').returns;
    s.profile.goals[2].deadline = '2040-01';
    expect(buildInput(s, 'plan').returns).toEqual(a);
  });
});
