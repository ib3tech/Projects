import { toPence } from './money';
import { AppState, dateOfMonth, Profile } from './profile';
import { suggestPlan } from './suggest';

export const STATE_VERSION = 1;

let idc = 0;
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(idc++).toString(36)}`;

export function thisMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** An empty profile: no example figures are ever presented as the user's own facts. */
export function emptyProfile(start = thisMonth()): Profile {
  return {
    name: '',
    currency: 'GBP',
    startDate: start,
    careerStage: '',
    employment: '',
    grossAnnual: null,
    takeHome: 0,
    essentials: [],
    actualSpending: {},
    budget: 0,
    balances: { cash: 0, emergency: 0, savings: 0, investments: 0 },
    savingsStartPot: 'life',
    debts: [],
    existingMonthlySaving: 0,
    goals: [
      { id: 'g-financial', kind: 'financial', name: '', target: 0, deadline: dateOfMonth(start, 60), priority: 3, meaning: '', ongoingCosts: '', constraints: '', vehicle: 'invested', active: true },
      { id: 'g-career', kind: 'career', name: '', target: 0, targetTakeHome: null, deadline: dateOfMonth(start, 24), priority: 3, meaning: '', ongoingCosts: '', constraints: '', vehicle: 'cash', active: true },
      { id: 'g-life', kind: 'life', name: '', target: 0, deadline: dateOfMonth(start, 36), priority: 3, meaning: '', ongoingCosts: '', constraints: '', vehicle: 'cash', active: true },
    ],
    careerStages: [],
    preferences: {
      reduce: [],
      protect: ['groceries', 'transport', 'personalCare', 'family'],
      fullSweep: true,
      emergencyMode: 'starter',
      extraIncomeShare: 0.5,
      risk: 'balanced',
      financing: '',
    },
  };
}

export function emptyState(start = thisMonth()): AppState {
  const profile = emptyProfile(start);
  return {
    version: STATE_VERSION,
    account: null,
    onboarded: false,
    isDemo: false,
    profile,
    plan: suggestPlan(profile),
    character: { gender: 'female', skin: '#b07a52', hair: '#2b1d14', outfit: '#2f6f4f', accent: '#e0b84f', headwear: 'none' },
    dream: { title: '', description: '', theme: 'home', imageDataUrl: null },
    milestones: [],
    game: { xpEvents: [], checkIns: [], questsDone: [] },
    provenance: {},
  };
}

/**
 * A clearly FICTIONAL demo persona for reviewers. Never presented as the user's data;
 * the UI shows a "Fictional demo" banner whenever it is loaded.
 */
export function demoState(start = thisMonth()): AppState {
  const s = emptyState(start);
  const p = s.profile;
  p.name = 'Demo persona (fictional)';
  p.careerStage = 'Early career';
  p.employment = 'Full-time, entry-level role';
  p.grossAnnual = toPence(30000);
  p.takeHome = toPence(2000);
  p.essentials = [
    { id: 'e1', label: 'Rent & bills', amount: toPence(900) },
    { id: 'e2', label: 'Essential groceries', amount: toPence(200) },
    { id: 'e3', label: 'Travel to work', amount: toPence(100) },
    { id: 'e4', label: 'Phone & insurance', amount: toPence(50) },
  ];
  p.actualSpending = {
    eatingOut: toPence(150), entertainment: toPence(60), shopping: toPence(120), general: toPence(40),
    gifts: toPence(30), holidays: toPence(80), charity: toPence(20), groceries: toPence(40), personalCare: toPence(25), transport: toPence(20),
  };
  p.budget = toPence(450);
  p.balances = { cash: toPence(400), emergency: toPence(500), savings: toPence(1200), investments: toPence(0) };
  p.savingsStartPot = 'life';
  p.debts = [{ id: 'd1', name: 'Credit card', balance: toPence(800), apr: 0.229, payment: toPence(60) }];
  p.existingMonthlySaving = toPence(100);
  p.goals[0] = { ...p.goals[0], name: 'Long-term investments', target: toPence(15000), deadline: dateOfMonth(start, 72), priority: 3, meaning: 'Financial independence buffer', ongoingCosts: 'Platform fees (not modelled)' };
  p.goals[1] = { ...p.goals[1], name: 'Professional qualification', targetTakeHome: toPence(2600), deadline: dateOfMonth(start, 30), priority: 4, meaning: 'Move to a better-paid role' };
  p.goals[2] = { ...p.goals[2], name: 'Home deposit', target: toPence(12000), deadline: dateOfMonth(start, 60), priority: 5, meaning: 'A secure place to live', ongoingCosts: 'Mortgage, maintenance, insurance', constraints: 'Deposit ≠ mortgage approval' };
  p.careerStages = [
    { id: 's1', name: 'Qualified practitioner', developmentBudget: toPence(1800), conditions: [{ id: 'c1', text: 'Pass the certification exams', doneInRealLife: false }], earliestDate: dateOfMonth(start, 12), delayMonths: 6, takeHome: toPence(2400), grossAnnual: toPence(38000), goalShareOfExtra: 0.5 },
    { id: 's2', name: 'Senior role', developmentBudget: toPence(1200), conditions: [{ id: 'c2', text: '2 years experience after qualifying', doneInRealLife: false }], earliestDate: dateOfMonth(start, 48), delayMonths: 3, takeHome: toPence(2900), grossAnnual: toPence(47000), goalShareOfExtra: 0.5 },
  ];
  p.preferences = { ...p.preferences, reduce: ['eatingOut', 'shopping'], fullSweep: true, emergencyMode: 'starter', extraIncomeShare: 0.5, risk: 'balanced', financing: 'Avoid new borrowing' };
  s.plan = suggestPlan(p);
  s.dream = { title: 'A home of my own', description: 'A quiet flat with space to study.', theme: 'home', imageDataUrl: null };
  s.onboarded = true;
  s.isDemo = true;
  s.account = { name: 'Demo', email: 'demo@example.invalid', createdAt: new Date().toISOString() };
  return s;
}
