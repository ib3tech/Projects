import { CategoryId, CategoryMap, clampRate, catDef } from './categories';
import { Pence, roundPence, sum } from './money';

export interface CategoryRule {
  /** Fraction. 0.1 = 10% self-tax. Negative only for charity (rebate, min −0.05). */
  rate: number;
  /** Monthly tax-free allowance for this category. Only spending above it is levied. */
  allowance: Pence;
  protected: boolean;
}

export type Rules = CategoryMap<CategoryRule>;

export interface CategoryLevy {
  id: CategoryId;
  spend: Pence;
  allowance: Pence;
  taxable: Pence;
  rate: number;
  /** Positive = levy into the plan, negative = rebate requested. */
  amount: Pence;
}

export interface SelfTaxResult {
  lines: CategoryLevy[];
  /** Sum of positive levies requested (before cash limit). */
  levyRequested: Pence;
  /** Levy actually transferred (never more than available cash, so it cannot create an overdraft). */
  levy: Pence;
  /** Rebate requested by negative rates. */
  rebateRequested: Pence;
  /** Rebate paid — funded only from `levy`, so rebate ≤ levy. */
  rebate: Pence;
  /** levy − rebate: the self-tax that ends up in the plan. */
  netLevy: Pence;
}

/**
 * Self-tax for one month.
 *  levy_c   = round(max(0, spend_c − allowance_c) × rate_c)   for rate_c > 0
 *  rebate_c = round(max(0, spend_c − allowance_c) × |rate_c|) for rate_c < 0 (charity, |rate| ≤ 5%)
 *  fixed    = a payday set-aside chosen by the person or the AI planner (also self-tax)
 *  levy     = min(Σ levy_c + fixed, available) — never overdraws
 *  rebate   = min(Σ rebate_c, levy)           — funded only from positive levies
 */
export function computeSelfTax(spending: CategoryMap<Pence>, rules: Rules | null, available: Pence, fixedSetAside: Pence = 0): SelfTaxResult {
  const lines: CategoryLevy[] = [];
  if (rules) {
    for (const [id, spendRaw] of Object.entries(spending) as [CategoryId, Pence][]) {
      const spend = Math.max(0, spendRaw ?? 0);
      const rule = rules[id];
      if (!rule) continue;
      const rate = clampRate(id, rule.rate, rule.protected);
      if (rate === 0) continue;
      const allowance = Math.max(0, rule.allowance ?? 0);
      const taxable = Math.max(0, spend - allowance);
      const amount = roundPence(taxable * rate);
      lines.push({ id, spend, allowance, taxable, rate, amount });
    }
  }
  const levyRequested = sum(lines.filter((l) => l.amount > 0).map((l) => l.amount)) + Math.max(0, fixedSetAside);
  const rebateRequested = -sum(lines.filter((l) => l.amount < 0).map((l) => l.amount));
  const levy = Math.max(0, Math.min(levyRequested, available));
  const rebate = Math.min(rebateRequested, levy);
  return { lines, levyRequested, levy, rebateRequested, rebate, netLevy: levy - rebate };
}

export interface PurchaseExplanation {
  price: Pence;
  allowanceLeftBefore: Pence;
  taxablePart: Pence;
  rate: number;
  selfTax: Pence;
  /** Money leaving the spending account immediately = price + self-tax (or price − rebate). */
  immediateCashMovement: Pence;
  note: string;
}

/**
 * Explain one purchase given what has already been spent in the category this month.
 * The self-tax is a transfer of the user's own money to their plan — not a cost, not income.
 */
export function explainPurchase(
  id: CategoryId,
  price: Pence,
  spentSoFar: Pence,
  rule: CategoryRule | undefined,
): PurchaseExplanation {
  const rate = rule ? clampRate(id, rule.rate, rule.protected) : 0;
  const allowance = rule?.allowance ?? 0;
  const allowanceLeftBefore = Math.max(0, allowance - spentSoFar);
  const taxablePart = Math.max(0, price - allowanceLeftBefore);
  const selfTax = roundPence(taxablePart * rate);
  const kind = catDef(id).kind;
  let note: string;
  if (kind === 'zero' || kind === 'internal') note = `${catDef(id).label} is zero-rated: no self-tax.`;
  else if (rule?.protected && kind !== 'charity') note = `${catDef(id).label} is protected: no self-tax.`;
  else if (rate === 0) note = 'No rate set for this category.';
  else if (taxablePart === 0) note = 'Fully inside your tax-free allowance: no self-tax.';
  else if (rate < 0)
    note = 'Charity rebate: paid back to you only if your positive levies this month can fund it. It is your own money returned, not a gift.';
  else note = 'The self-tax moves your own money into your plan. It is not a fee and not extra income. Please do not buy more to "earn" self-tax.';
  return {
    price,
    allowanceLeftBefore,
    taxablePart,
    rate,
    selfTax,
    immediateCashMovement: price + selfTax,
    note,
  };
}
