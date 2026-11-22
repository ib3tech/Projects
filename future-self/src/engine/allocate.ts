import { Pence, splitByWeights, sum } from './money';

export type EmergencyMode = 'first' | 'alongside' | 'starter';

export interface EmergencyConfig {
  target: Pence;
  mode: EmergencyMode;
  /** Share of contributions to the reserve when building alongside goals (0..1). */
  share: number;
  /** Starter buffer filled first in 'starter' mode. */
  starter: Pence;
}

/**
 * Emergency allocation. Returns the pence sent to the reserve from `amount`.
 * Never sends more than the reserve still needs, so once it is complete its share
 * flows to the goal pots automatically.
 */
export function allocateEmergency(amount: Pence, balance: Pence, cfg: EmergencyConfig): Pence {
  if (amount <= 0) return 0;
  const need = Math.max(0, cfg.target - balance);
  if (need === 0) return 0;
  const share = Math.max(0, Math.min(1, cfg.share));
  switch (cfg.mode) {
    case 'first':
      return Math.min(amount, need);
    case 'alongside':
      return Math.min(Math.round(amount * share), need);
    case 'starter': {
      const starterNeed = Math.max(0, Math.min(cfg.starter, cfg.target) - balance);
      const first = Math.min(amount, starterNeed);
      const rest = amount - first;
      const more = Math.min(Math.round(rest * share), need - first);
      return first + Math.max(0, more);
    }
  }
}

/**
 * Water-filling allocation: split `amount` by weights, but never give a pot more than it needs.
 * Overflow from capped pots is redistributed to the remaining pots. Anything left once every
 * need is met is returned as `leftover` (stays unallocated in cash — it is never double counted).
 * `needs[i] = Infinity` means uncapped.
 */
export function waterfill(amount: Pence, weights: number[], needs: number[]): { parts: Pence[]; leftover: Pence } {
  const parts = weights.map(() => 0);
  let remaining = Math.max(0, amount);
  const open = new Set(weights.map((_, i) => i).filter((i) => needs[i] > 0 && weights[i] > 0));
  // If every positive-need pot has zero weight, fall back to equal weights among needy pots.
  if (open.size === 0) {
    weights.forEach((_, i) => needs[i] > 0 && open.add(i));
    weights = weights.map(() => 1);
  }
  let guard = 0;
  while (remaining > 0 && open.size > 0 && guard++ < 50) {
    const idx = [...open];
    const split = splitByWeights(remaining, idx.map((i) => weights[i]));
    let spent = 0;
    idx.forEach((i, k) => {
      const cap = needs[i] - parts[i];
      const give = Math.min(split[k], cap);
      parts[i] += give;
      spent += give;
      if (parts[i] >= needs[i]) open.delete(i);
    });
    remaining -= spent;
    if (spent === 0) break;
  }
  return { parts, leftover: amount - sum(parts) };
}

/** Sequential: fill pots in order. */
export function sequential(amount: Pence, needs: number[]): { parts: Pence[]; leftover: Pence } {
  let remaining = Math.max(0, amount);
  const parts = needs.map((n) => {
    const give = Math.min(remaining, Math.max(0, n));
    remaining -= give;
    return give;
  });
  return { parts, leftover: remaining };
}
