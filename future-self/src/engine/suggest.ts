/**
 * Suggestions derived from the user's OWN answers. Every value produced here is an
 * editable assumption and is tagged as such in the UI.
 */
import { CATEGORIES, CategoryId, catDef } from './categories';
import { Pence } from './money';
import { essentialsTotal, Plan, Profile } from './profile';
import { Rules } from './selfTax';

export const RISK_RETURNS: Record<Profile['preferences']['risk'], number> = {
  cash: 0.02,
  cautious: 0.03,
  balanced: 0.05,
  growth: 0.07,
};

export function suggestRules(p: Profile): { rules: Rules; reasons: Partial<Record<CategoryId, string>> } {
  const rules: Rules = {};
  const reasons: Partial<Record<CategoryId, string>> = {};
  const optionalIds = CATEGORIES.filter((c) => c.kind === 'optional' || c.kind === 'charity').map((c) => c.id);
  const totalActual = optionalIds.reduce((a, id) => a + (p.actualSpending[id] ?? 0), 0);
  for (const c of CATEGORIES) {
    const actual = p.actualSpending[c.id] ?? 0;
    const isProtected = c.kind === 'zero' || c.kind === 'internal' || p.preferences.protect.includes(c.id);
    if (c.kind === 'zero' || c.kind === 'internal') {
      rules[c.id] = { rate: 0, allowance: 0, protected: true };
      reasons[c.id] = c.kind === 'zero' ? 'Bills and necessary expenses are always zero-rated.' : 'Income, savings and transfers are never taxed.';
      continue;
    }
    if (c.kind === 'charity') {
      rules[c.id] = { rate: actual > 0 ? -0.02 : 0, allowance: 0, protected: false };
      reasons[c.id] = actual > 0 ? 'Small rebate to recognise giving; funded only from your own levies.' : 'No charity spending recorded — no rebate suggested.';
      continue;
    }
    if (isProtected) {
      rules[c.id] = { rate: 0, allowance: 0, protected: true };
      reasons[c.id] = 'You chose to protect this category (or it covers essentials).';
      continue;
    }
    const wantsReduce = p.preferences.reduce.includes(c.id);
    const budgetShare: Pence = totalActual > 0 && p.budget > 0 ? Math.round((p.budget * actual) / totalActual) : 0;
    const allowance = Math.min(actual, budgetShare);
    rules[c.id] = { rate: wantsReduce ? 0.2 : 0.1, allowance, protected: false };
    reasons[c.id] = wantsReduce
      ? `You want to reduce ${c.label.toLowerCase()}, so a higher 20% rate earmarks money earlier. Allowance = this category's share of your budget.`
      : `Optional spending: a light 10% rate. Allowance = this category's share of your budget.`;
  }
  return { rules, reasons };
}

export function suggestPlan(p: Profile): Plan {
  const monthlyNeeds = essentialsTotal(p) + p.debts.reduce((a, d) => a + d.payment, 0);
  const target = monthlyNeeds * 3;
  return {
    selfTaxEnabled: true,
    rules: suggestRules(p).rules,
    plannedSpending: { ...p.actualSpending },
    contribution: p.preferences.fullSweep ? { mode: 'sweep' } : { mode: 'manual', ceiling: Math.max(p.existingMonthlySaving, 0) },
    emergency: { target, mode: p.preferences.emergencyMode, share: 0.3, starter: Math.min(target, monthlyNeeds) },
    allocation: { method: 'weighted', manualShares: Object.fromEntries(p.goals.map((g) => [g.id, 1 / Math.max(1, p.goals.length)])) },
    returns: { investmentAnnual: RISK_RETURNS[p.preferences.risk], cashAnnual: 0.02, deficitApr: 0.2 },
    calendar: [],
    horizonYears: 15,
  };
}

export function isTaxable(id: CategoryId) {
  const k = catDef(id).kind;
  return k === 'optional' || k === 'charity';
}
