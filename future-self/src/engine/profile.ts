/**
 * The user's own data (questionnaire answers) and plan settings.
 * Every editable number carries provenance: 'confirmed' (entered/confirmed by the user)
 * or 'assumption' (suggested by the app, or a forecast input that cannot be known).
 */
import { EmergencyMode } from './allocate';
import { CategoryId, CategoryMap } from './categories';
import { Pence } from './money';
import { Rules } from './selfTax';
import { CalendarAdjustment, DebtInput } from './simulate';

export type Provenance = 'confirmed' | 'assumption';

export interface EssentialItem {
  id: string;
  label: string;
  amount: Pence;
}

export interface Condition {
  id: string;
  text: string;
  /** Observed in real life (user-recorded) — never inferred from funding. */
  doneInRealLife: boolean;
}

export interface CareerStage {
  id: string;
  name: string;
  developmentBudget: Pence;
  conditions: Condition[];
  /** 'YYYY-MM' earliest possible transition. */
  earliestDate: string;
  delayMonths: number;
  /** Expected TOTAL monthly take-home at this stage (absolute, not stacked). */
  takeHome: Pence;
  /** Gross annual salary — informational only; the forecast uses take-home. */
  grossAnnual: Pence | null;
  goalShareOfExtra: number;
}

export type GoalKind = 'financial' | 'career' | 'life';

export interface Goal {
  id: string;
  kind: GoalKind;
  name: string;
  /** For financial/life: amount to save. For career: derived from stage budgets (this field ignored). */
  target: Pence;
  /** Career only: the take-home income the user is aiming for (earning-capacity goal). */
  targetTakeHome?: Pence | null;
  deadline: string; // 'YYYY-MM'
  priority: number; // 1 (low) – 5 (high)
  meaning: string;
  ongoingCosts: string;
  constraints: string;
  vehicle: 'cash' | 'invested';
  active: boolean;
}

export interface Character {
  gender: 'female' | 'male';
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
  headwear: 'none' | 'scarf' | 'cap' | 'kufi';
}

export interface Dream {
  title: string;
  description: string;
  theme: 'home' | 'travel' | 'study' | 'business' | 'garden' | 'family' | 'city';
  imageDataUrl: string | null;
}

export interface Milestone {
  id: string;
  title: string;
  type: 'action' | 'qualification' | 'money' | 'assumed-outcome';
  date: string; // 'YYYY-MM'
  goalId: string | null;
  notes: string;
  /** Observed in real life (achievement). Forecast events never set this. */
  completed: boolean;
  completedOn: string | null;
}

export interface Profile {
  name: string;
  currency: string;
  startDate: string; // 'YYYY-MM' first projected month
  careerStage: string;
  employment: string;
  grossAnnual: Pence | null;
  takeHome: Pence;
  essentials: EssentialItem[];
  actualSpending: CategoryMap<Pence>;
  budget: Pence;
  balances: { cash: Pence; emergency: Pence; savings: Pence; investments: Pence };
  savingsStartPot: 'financial' | 'life' | 'cash';
  debts: DebtInput[];
  existingMonthlySaving: Pence;
  goals: Goal[];
  careerStages: CareerStage[];
  preferences: {
    reduce: CategoryId[];
    protect: CategoryId[];
    fullSweep: boolean;
    emergencyMode: EmergencyMode;
    extraIncomeShare: number;
    risk: 'cash' | 'cautious' | 'balanced' | 'growth';
    financing: string;
  };
}

export interface Plan {
  selfTaxEnabled: boolean;
  rules: Rules;
  /** The user's tested behaviour change — defaults to actual spending. Higher rates do NOT change this automatically. */
  plannedSpending: CategoryMap<Pence>;
  contribution: { mode: 'sweep' } | { mode: 'manual'; ceiling: Pence };
  emergency: { target: Pence; mode: EmergencyMode; share: number; starter: Pence };
  allocation: { method: 'weighted' | 'manual'; manualShares: Record<string, number> };
  returns: { investmentAnnual: number; cashAnnual: number; deficitApr: number };
  calendar: CalendarAdjustment[];
  horizonYears: number;
}

export interface Gamification {
  xpEvents: { id: string; at: string; xp: number; label: string }[];
  checkIns: string[]; // 'YYYY-MM' months the user did a check-in
  questsDone: string[];
}

export interface AppState {
  version: number;
  account: { name: string; email: string; createdAt: string } | null;
  onboarded: boolean;
  isDemo: boolean;
  profile: Profile;
  plan: Plan;
  character: Character;
  dream: Dream;
  milestones: Milestone[];
  game: Gamification;
  /** Field path → provenance. */
  provenance: Record<string, Provenance>;
}

/** Months between two 'YYYY-MM' strings: monthIndex(start, start) = 1 (first projected month). */
export function monthIndex(start: string, date: string): number {
  const [y0, m0] = start.split('-').map(Number);
  const [y1, m1] = date.split('-').map(Number);
  if (!y0 || !y1) return 1;
  return (y1 - y0) * 12 + (m1 - m0) + 1;
}

export function dateOfMonth(start: string, m: number): string {
  const [y0, m0] = start.split('-').map(Number);
  const t = y0 * 12 + (m0 - 1) + (m - 1);
  const y = Math.floor(t / 12);
  const mm = (t % 12) + 1;
  return `${y}-${String(mm).padStart(2, '0')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function prettyDate(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTHS[m - 1]} ${y}`;
}

export function essentialsTotal(p: Profile): Pence {
  return p.essentials.reduce((a, e) => a + Math.max(0, e.amount), 0);
}
