import { describe, expect, it } from 'vitest';
import { applyProposal, buildPlannerPrompt, builtInProposal, evaluateProposal, evaluationForAi, parseProposal } from '../aiPlanner';
import { demoState, migrate } from '../defaults';
import { essentialsTotal } from '../profile';
import { toPence } from '../money';
import { simulate } from '../simulate';
import { buildInput } from '../scenarios';

const P = toPence;

describe('payday set-aside (fixed self-tax by the person or the AI)', () => {
  it('with a full sweep it changes the split, not the total', () => {
    const s = demoState('2026-01');
    const before = simulate(buildInput(s, 'plan')).rows[0];
    s.plan.fixedSetAside = { amount: P(50), setBy: 'ai' };
    const after = simulate(buildInput(s, 'plan')).rows[0];
    expect(after.levy - before.levy).toBe(P(50));
    expect(after.toPlan).toBe(before.toPlan);
    expect(after.reconciles).toBe(true);
  });

  it('in manual mode a committed set-aside is honoured above the ceiling, but never overdraws', () => {
    const s = demoState('2026-01');
    s.plan.contribution = { mode: 'manual', ceiling: P(20) };
    s.plan.fixedSetAside = { amount: P(60), setBy: 'you' };
    const r = simulate(buildInput(s, 'plan')).rows[0];
    expect(r.toPlan).toBe(Math.min(P(60), r.available) - r.rebate);
    s.plan.fixedSetAside = { amount: P(100000), setBy: 'you' };
    const r2 = simulate(buildInput(s, 'plan')).rows[0];
    expect(r2.levy).toBeLessThanOrEqual(r2.available);
  });

  it('is switched off with self-tax and ignored in the current-habits projection', () => {
    const s = demoState('2026-01');
    s.plan.fixedSetAside = { amount: P(50), setBy: 'ai' };
    expect(buildInput(s, 'current').fixedSetAside ?? 0).toBe(0);
    s.plan.selfTaxEnabled = false;
    expect(buildInput(s, 'plan').fixedSetAside).toBe(0);
  });
});

describe('AI proposal validation', () => {
  const s = demoState('2026-01');

  it('cannot raise spending, cut protected categories or touch essentials/internal categories', () => {
    const pr = parseProposal(s, {
      budget: [
        { category: 'shopping', amount: 999, reason: 'more' },
        { category: 'groceries', amount: 0, reason: 'cut food' },
        { category: 'bills', amount: 0 },
        { category: 'savings', amount: 0 },
        { category: 'eatingOut', amount: 100, reason: 'less' },
      ],
    }, 'ai');
    const by = Object.fromEntries(pr.budget.map((b) => [b.category, b.amount]));
    expect(by.shopping).toBe(s.profile.actualSpending.shopping);
    expect(by.groceries).toBe(s.profile.actualSpending.groceries);
    expect(by.bills).toBeUndefined();
    expect(by.savings).toBeUndefined();
    expect(by.eatingOut).toBe(P(100));
    expect(pr.adjustments.length).toBeGreaterThanOrEqual(3);
  });

  it('clamps rates (charity rebate ≤ 5%, protected = 0%) and accepts percentages written as whole numbers', () => {
    const pr = parseProposal(s, { rates: [{ category: 'charity', rate: -0.2, allowance: 0 }, { category: 'groceries', rate: 0.3 }, { category: 'shopping', rate: 15 }] }, 'ai');
    const by = Object.fromEntries(pr.rates.map((r) => [r.category, r.rate]));
    expect(by.charity).toBe(-0.05);
    expect(by.groceries).toBe(0);
    expect(by.shopping).toBeCloseTo(0.15);
  });

  it('limits the payday set-aside to the money actually left (no overdraft)', () => {
    const pr = parseProposal(s, { fixedSetAside: { amount: 100000 } }, 'ai');
    const debts = s.profile.debts.reduce((a, d) => a + d.payment, 0);
    const spend = Object.values({ ...s.profile.actualSpending, ...s.plan.plannedSpending }).reduce((a, b) => a + (b ?? 0), 0);
    expect(pr.fixedSetAside.amount).toBe(Math.max(0, s.profile.takeHome - essentialsTotal(s.profile) - debts - spend));
  });

  it('survives garbage from the model', () => {
    for (const junk of [null, 42, 'text', { budget: 'x', rates: [null, {}], fixedSetAside: { amount: 'NaN' } }]) {
      const pr = parseProposal(s, junk, 'ai');
      expect(pr.budget).toEqual([]);
      expect(pr.fixedSetAside.amount).toBe(0);
    }
  });

  it('applying a proposal and evaluating it uses the same engine; numbers reconcile', () => {
    const pr = parseProposal(s, { budget: [{ category: 'eatingOut', amount: 75 }, { category: 'shopping', amount: 60 }], fixedSetAside: { amount: 40 } }, 'ai');
    const { before, after } = evaluateProposal(s, pr);
    expect(after.month1.toPlan - before.month1.toPlan).toBe(P(75 + 60));
    const plan = applyProposal(s.plan, pr);
    expect(plan.fixedSetAside).toEqual({ amount: P(40), setBy: 'ai' });
    expect(simulate(buildInput({ ...s, plan }, 'plan')).rows.every((r) => r.reconciles)).toBe(true);
    expect(s.plan.fixedSetAside.amount).toBe(0); // original untouched
  });

  it('the evaluate tool reports engine results, not model numbers', () => {
    const out = evaluationForAi(s, { budget: [{ category: 'eatingOut', amount: 75 }] });
    expect(out.after.month1IntoPlan - out.before.month1IntoPlan).toBeCloseTo(75);
  });
});

describe('built-in planner (when AI is unavailable)', () => {
  it('only reduces categories the person chose, never protected ones, and leaves no overdraft', () => {
    const s = demoState('2026-01');
    const pr = builtInProposal(s);
    expect(pr.source).toBe('built-in');
    for (const b of pr.budget) {
      expect(b.amount).toBeLessThanOrEqual(s.profile.actualSpending[b.category] ?? 0);
      expect(['groceries', 'transport', 'personalCare', 'family']).not.toContain(b.category);
    }
    const res = simulate(buildInput({ ...s, plan: applyProposal(s.plan, pr) }, 'plan'));
    expect(res.rows[0].levy).toBeLessThanOrEqual(res.rows[0].available);
    expect(res.rows.every((r) => r.reconciles)).toBe(true);
  });

  it('the prompt carries the rules and the data but no account name or email', () => {
    const s = demoState('2026-01');
    const prompt = buildPlannerPrompt(s, 'I want my deposit sooner');
    expect(prompt).toContain('Never cut or tax essentials');
    expect(prompt).toContain('eatingOut');
    expect(prompt).not.toContain(s.account!.email);
    expect(prompt).not.toContain(s.profile.name);
  });
});

describe('stored data migration', () => {
  it('upgrades version-1 data instead of discarding the person\'s answers', () => {
    const old = JSON.parse(JSON.stringify(demoState('2026-01')));
    old.version = 1;
    delete old.planner;
    delete old.plan.fixedSetAside;
    const m = migrate(old)!;
    expect(m.version).toBe(2);
    expect(m.plan.fixedSetAside.amount).toBe(0);
    expect(m.profile.takeHome).toBe(old.profile.takeHome);
  });
});
