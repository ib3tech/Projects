/**
 * All money in the engine is held as integer minor units ("pence").
 * Every arithmetic result that can produce fractions is rounded with
 * `roundPence` so the monthly ledger reconciles to the penny.
 */
export type Pence = number;

/** Round half away from zero to a whole penny. */
export function roundPence(x: number): Pence {
  if (!Number.isFinite(x)) return 0;
  const r = Math.round(Math.abs(x));
  return x < 0 ? -r : r;
}

export function toPence(major: number): Pence {
  return roundPence(major * 100);
}

export function toMajor(p: Pence): number {
  return p / 100;
}

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Convert an annual rate (e.g. 0.07 = 7%) to an equivalent monthly compound rate. */
export function monthlyRate(annual: number): number {
  if (annual <= -1) return -1;
  return Math.pow(1 + annual, 1 / 12) - 1;
}

export interface CurrencyDef {
  code: string;
  symbol: string;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'GBP', symbol: '£' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'UGX', symbol: 'USh ' },
  { code: 'KES', symbol: 'KSh ' },
  { code: 'NGN', symbol: '₦' },
  { code: 'INR', symbol: '₹' },
  { code: 'CAD', symbol: 'C$' },
  { code: 'AUD', symbol: 'A$' },
];

export function formatMoney(p: Pence, currency = 'GBP', opts: { pennies?: boolean } = {}): string {
  const sym = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '';
  const neg = p < 0;
  const v = Math.abs(p) / 100;
  const digits = opts.pennies ? 2 : 0;
  const s = v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${neg ? '−' : ''}${sym}${s}`;
}

/** Split `total` pence across weights with the largest-remainder method so parts sum exactly to total. */
export function splitByWeights(total: Pence, weights: number[]): Pence[] {
  const w = weights.map((x) => (x > 0 && Number.isFinite(x) ? x : 0));
  const W = sum(w);
  if (total <= 0 || W <= 0) return w.map(() => 0);
  const raw = w.map((x) => (total * x) / W);
  const floors = raw.map(Math.floor);
  let rem = total - sum(floors);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (rem <= 0) break;
    if (w[i] > 0) {
      floors[i] += 1;
      rem -= 1;
    }
  }
  return floors;
}
