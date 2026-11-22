/**
 * Spending categories and their self-tax treatment.
 *
 * kind:
 *  - 'zero'     : bills and necessary expenses — always zero-rated, cannot be taxed.
 *  - 'internal' : income, savings and transfers — not spending, never taxed.
 *  - 'optional' : discretionary; may carry a self-tax rate above a tax-free allowance
 *                 unless the user protects it.
 *  - 'charity'  : may carry a NEGATIVE rate (rebate) down to −5%, funded only from levies.
 */
export type CategoryKind = 'zero' | 'internal' | 'optional' | 'charity';

export type CategoryId =
  | 'bills'
  | 'charity'
  | 'eatingOut'
  | 'entertainment'
  | 'expenses'
  | 'family'
  | 'finances'
  | 'general'
  | 'gifts'
  | 'groceries'
  | 'holidays'
  | 'income'
  | 'personalCare'
  | 'savings'
  | 'shopping'
  | 'transfers'
  | 'transport';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  kind: CategoryKind;
  /** Protected by default because it usually covers essentials (food, transport, care, family support). */
  protectedByDefault: boolean;
  hint: string;
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'bills', label: 'Bills', kind: 'zero', protectedByDefault: true, hint: 'Rent, utilities, phone, insurance — always zero-rated.' },
  { id: 'charity', label: 'Charity', kind: 'charity', protectedByDefault: false, hint: 'Can earn a rebate (negative rate, max 5%) funded from your own levies.' },
  { id: 'eatingOut', label: 'Eating out', kind: 'optional', protectedByDefault: false, hint: 'Restaurants, takeaways, coffee.' },
  { id: 'entertainment', label: 'Entertainment', kind: 'optional', protectedByDefault: false, hint: 'Streaming, events, games, hobbies.' },
  { id: 'expenses', label: 'Expenses', kind: 'zero', protectedByDefault: true, hint: 'Necessary work or household expenses — zero-rated.' },
  { id: 'family', label: 'Family', kind: 'optional', protectedByDefault: true, hint: 'Childcare, family support — protected by default.' },
  { id: 'finances', label: 'Finances', kind: 'zero', protectedByDefault: true, hint: 'Required repayments, bank fees — zero-rated.' },
  { id: 'general', label: 'General', kind: 'optional', protectedByDefault: false, hint: 'Anything that does not fit elsewhere.' },
  { id: 'gifts', label: 'Gifts', kind: 'optional', protectedByDefault: false, hint: 'Presents and celebrations.' },
  { id: 'groceries', label: 'Groceries', kind: 'optional', protectedByDefault: true, hint: 'Essential food is protected by default. Unprotect only treats/extras.' },
  { id: 'holidays', label: 'Holidays', kind: 'optional', protectedByDefault: false, hint: 'Travel and trips.' },
  { id: 'income', label: 'Income', kind: 'internal', protectedByDefault: true, hint: 'Money in — never taxed.' },
  { id: 'personalCare', label: 'Personal care', kind: 'optional', protectedByDefault: true, hint: 'Health and hygiene — protected by default.' },
  { id: 'savings', label: 'Savings', kind: 'internal', protectedByDefault: true, hint: 'Moving your own money to savings — never taxed.' },
  { id: 'shopping', label: 'Shopping', kind: 'optional', protectedByDefault: false, hint: 'Clothes, gadgets, homeware.' },
  { id: 'transfers', label: 'Transfers', kind: 'internal', protectedByDefault: true, hint: 'Between your own accounts — never taxed.' },
  { id: 'transport', label: 'Transport', kind: 'optional', protectedByDefault: true, hint: 'Getting to work/study is protected by default.' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export const catDef = (id: CategoryId): CategoryDef => CATEGORIES.find((c) => c.id === id)!;

/** Categories where the user records actual discretionary (non-essential-list) spending. */
export const SPENDING_CATEGORIES = CATEGORIES.filter((c) => c.kind !== 'internal');

export const MAX_REBATE = 0.05;
export const MAX_RATE = 1.0;

export type CategoryMap<T> = Partial<Record<CategoryId, T>>;

export function canBeTaxed(id: CategoryId, isProtected: boolean): boolean {
  const k = catDef(id).kind;
  if (k === 'zero' || k === 'internal') return false;
  if (k === 'charity') return true; // charity can only take a rebate (negative rate)
  return !isProtected;
}

/** Clamp a rate to what the category allows. */
export function clampRate(id: CategoryId, rate: number, isProtected: boolean): number {
  const k = catDef(id).kind;
  if (!Number.isFinite(rate)) return 0;
  if (k === 'zero' || k === 'internal') return 0;
  if (k === 'charity') return Math.max(-MAX_REBATE, Math.min(0, rate));
  if (isProtected) return 0;
  return Math.max(0, Math.min(MAX_RATE, rate));
}
