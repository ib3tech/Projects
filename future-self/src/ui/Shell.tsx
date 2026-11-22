import { ArrowUpRight } from 'lucide-react';
import React from 'react';
import { levelOf, totalXp } from '../engine/gamification';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { cx } from './kit';
import { Logo } from './Onboarding';

export const NAV = [
  { id: 'overview', label: 'Overview', crumb: 'Overview' },
  { id: 'route', label: 'Your route', crumb: 'Your route' },
  { id: 'spending', label: 'Spending rules', crumb: 'Spending rules' },
  { id: 'meter', label: 'Delusion Meter', crumb: 'Delusion Meter' },
  { id: 'pots', label: 'Pots & emergency', crumb: 'Pots' },
  { id: 'career', label: 'Career', crumb: 'Career' },
  { id: 'compare', label: 'Compare futures', crumb: 'Compare futures' },
  { id: 'math', label: 'Open the math', crumb: 'Open the math' },
  { id: 'you', label: 'You & quests', crumb: 'You & quests' },
  { id: 'assumptions', label: 'Plan settings', crumb: 'Plan settings' },
] as const;
export type NavId = (typeof NAV)[number]['id'];

export function Shell({ tab, go, onEdit, children }: { tab: NavId; go: (t: NavId) => void; onEdit: () => void; children: React.ReactNode }) {
  const { state } = useStore();
  const xp = totalXp(state);
  const lvl = levelOf(xp);
  const crumb = NAV.find((n) => n.id === tab)?.crumb ?? '';
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[228px] shrink-0 flex-col border-r border-line bg-white px-3.5 py-5 lg:flex">
        <Logo />
        <div className="eyebrow mb-2 mt-9 px-2">Your space</div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} aria-current={tab === n.id ? 'page' : undefined} onClick={() => go(n.id)}
              className={cx('rounded-lg px-2.5 py-2 text-left text-[15px] transition', tab === n.id ? 'bg-mist font-medium text-ink' : 'text-ink/70 hover:bg-paper hover:text-ink')}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 rounded-xl bg-gradient-to-br from-[#ece6d6] to-[#cfe0d4] p-3">
          <div className="text-[13px] font-bold">{state.dream.title || 'Your future, your way'}</div>
          <div className="text-xs text-muted">{state.dream.title ? 'Your dream' : 'A plan that starts with you'}</div>
        </div>
        <button onClick={() => go('you')} className="mt-auto flex items-center gap-2.5 border-t border-line pt-4 text-left">
          <span className="overflow-hidden rounded-full ring-1 ring-line"><Avatar c={state.character} level={lvl.level} size={34} frame={false} /></span>
          <span>
            <span className="block text-[13px] font-semibold">{state.profile.name || 'You'}</span>
            <span className="block text-[11px] text-faint">Lv {lvl.level} · {xp} XP</span>
          </span>
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile top nav */}
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-white/95 px-[max(12px,env(safe-area-inset-left))] py-2.5 backdrop-blur lg:hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink font-black text-white">f</span>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]" aria-label="Main (mobile)">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} aria-current={tab === n.id ? 'page' : undefined}
                className={cx('shrink-0 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap', tab === n.id ? 'bg-mist font-medium' : 'text-ink/65')}>
                {n.label}
              </button>
            ))}
          </nav>
          <button className="btn-ghost btn-sm shrink-0" onClick={onEdit}>Edit</button>
        </div>
        <div className="hidden items-center justify-between border-b border-line bg-white px-8 py-4 lg:flex">
          <div className="eyebrow">Your plan / {crumb}</div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-mist px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sage-deep">Simulated plan</span>
            <button className="flex items-center gap-1 text-[15px] text-ink/80 hover:text-ink" onClick={onEdit}>Edit plan <ArrowUpRight size={15} /></button>
          </div>
        </div>
        <main className="mx-auto max-w-[1060px] px-4 pb-16 pt-6 sm:px-8 sm:pt-7">{children}</main>
      </div>
    </div>
  );
}

const HEADS: Record<NavId, [string, string]> = {
  overview: ['Your future, your terms', "Connect today's choices to the future you're building."],
  route: ['From here to there', 'Edit the stages, deadlines and actions to make this route yours.'],
  spending: ['Money with intention', 'Self-tax is your main accelerator. Let the AI budget your month, protect essentials and set optional rates.'],
  meter: ['Your reality check', 'Do your habits, money, career and deadlines support your goals?'],
  pots: ['One pound, one place', 'An emergency reserve and three goal pots — never double-counted.'],
  career: ['Earning capacity', 'Career outcomes are assumptions, not guaranteed returns.'],
  compare: ['Same cash, different paths', 'Compare projected tracked assets across strategies.'],
  math: ['See where every penny goes', 'One month-by-month engine drives every number in the app.'],
  you: ['Grow as you go', 'Rewards for planning, learning and consistency — never for spending or wealth.'],
  assumptions: ['Your assumptions', 'Everything the forecast assumes, in one place.'],
};

export function PageHead({ tab, onEdit }: { tab: NavId; onEdit: () => void }) {
  const { state } = useStore();
  const [eyebrow, sub] = HEADS[tab];
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="display mt-2 text-[34px] sm:text-[40px]">
            Small choices. <span className="text-sage">Big becoming.</span>
          </h1>
          <p className="mt-2 text-[15px] text-muted">{sub}</p>
        </div>
        <button className="btn-primary hidden shrink-0 sm:inline-flex" onClick={onEdit}>Edit plan <ArrowUpRight size={16} /></button>
      </div>
      <div className="mb-5 mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-line bg-mist px-4 py-2.5 text-xs">
        {state.isDemo ? (
          <><b>Illustrative scenario</b><span className="text-muted">A fictional example — all figures are editable and not facts about you.</span></>
        ) : (
          <><b>Your numbers</b><span className="text-muted">Built from your answers. Everything is simulated — no bank connection, no real transfers.</span></>
        )}
      </div>
    </>
  );
}
