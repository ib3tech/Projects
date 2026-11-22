import { ArrowRight, Briefcase, ChevronDown, Heart, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';
import { scoreBand } from '../../engine/delusion';
import { levelOf, QUESTS, questDone, totalXp } from '../../engine/gamification';
import { dateOfMonth, prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Avatar, DreamHero } from '../Avatar';
import { EngineChart, Legendish, SERIES_COLORS } from '../Chart';
import { Bar, Card, cx, PctInput, Pill, useMoney } from '../kit';
import type { NavId } from '../Shell';
import { MathLedger } from './Math';

export function Gauge({ score, size = 112 }: { score: number | null; size?: number }) {
  const v = score ?? 0;
  const r = 44;
  const C = 2 * Math.PI * r;
  const band = scoreBand(score);
  const color = band.tone === 'good' ? '#74a18a' : band.tone === 'mid' ? '#d4a04a' : band.tone === 'warn' ? '#c06060' : '#c8d0c9';
  return (
    <svg viewBox="0 0 112 112" width={size} height={size} role="img" aria-label={`Funding-gap score ${score === null ? 'not available' : Math.round(v)} out of 100`}>
      <circle cx="56" cy="56" r={r} fill="none" stroke="#eef3ed" strokeWidth="9" />
      {score !== null && v > 0.5 && (
        <circle cx="56" cy="56" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(v / 100) * C} ${C}`} transform="rotate(-90 56 56)" />
      )}
      <text x="56" y="58" textAnchor="middle" className="fill-ink" style={{ fontSize: 28, fontWeight: 800 }}>{score === null ? '—' : Math.round(v)}</text>
      <text x="56" y="76" textAnchor="middle" className="fill-faint" style={{ fontSize: 9 }}>gap score</text>
    </svg>
  );
}

export function bandCopy(score: number | null) {
  if (score === null) return 'Add goal targets to see your gap';
  if (score < 0.5) return 'On track at every deadline';
  if (score < 10) return 'A few shifts could help';
  if (score < 40) return 'A plan in progress';
  return 'A big gap to close — step by step';
}

const termOf = (months: number) => (months <= 12 ? 'Short term' : months <= 60 ? 'Medium term' : 'Long term');

export function Overview({ go }: { go: (t: NavId) => void }) {
  const { state, model, update, completeQuest } = useStore();
  const money = useMoney();
  const [mathOpen, setMathOpen] = useState(false);
  const p = state.profile;
  const plan = model.meters.plan;
  const xp = totalXp(state);
  const lvl = levelOf(xp);
  const realDone = state.milestones.filter((m) => m.completed).length + p.careerStages.flatMap((s) => s.conditions).filter((c) => c.doneInRealLife).length;
  const quests = QUESTS.slice(0, 5);
  const series = model.series(['plan', 'index', 'careerThenIndex', 'spend'], 'netAssets');
  const colors = [SERIES_COLORS.plan, SERIES_COLORS.index, SERIES_COLORS.career, SERIES_COLORS.spend];
  const labels = ['Your plan', 'Index investing', 'Career → invest', 'Spend it'];
  const r1 = model.summary.month1;
  const next = model.suggestions[0];
  const goalIcon = { financial: Wallet, career: TrendingUp, life: Heart } as const;
  const goalTone = { financial: 'sage', career: 'amber', life: 'violet' } as const;

  return (
    <div className="flex flex-col gap-4">
      <DreamHero dream={state.dream} progress={Math.min(1, (lvl.level - 1) / 6)}>
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Your future self <Sparkles size={11} /></span>
          <h2 className="display mt-4 max-w-[340px] text-[30px] sm:text-[34px]">{state.dream.title || 'Your future, your way'}</h2>
          <p className="mt-2 max-w-[360px] text-sm text-white/80">{state.dream.description || 'A plan shaped around your own goals, priorities and pace.'}</p>
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-white/85">
          {state.plan.horizonYears} year view · {money(p.takeHome)} take-home / month
        </div>
      </DreamHero>

      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Card eyebrow="Your reality check" title="Delusion Meter" actions={<Pill>Planning measure</Pill>}>
          <button className="flex w-full items-center gap-5 text-left" onClick={() => { completeQuest('meter'); go('meter'); }}>
            <Gauge score={plan.score} />
            <div className="min-w-0">
              <div className="font-bold">{bandCopy(plan.score)}</div>
              <p className="mt-1 text-[13px] text-muted">Average shortfall across active goals at their deadlines.</p>
              <span className="mt-2 inline-block"><Pill>Not a probability or judgement</Pill></span>
            </div>
          </button>
          <p className="mt-4 border-t border-line pt-3 text-[11px] text-faint">
            Score = average max(0, 1 − funded at deadline ÷ target) × 100. Current habits score: {model.meters.current.score === null ? '—' : Math.round(model.meters.current.score)}.
          </p>
          <div className="mt-2 flex flex-col divide-y divide-line">
            {plan.goals.map((g) => {
              const tone = g.shortfallPct === 0 ? 'sage' : g.shortfallPct < 0.25 ? 'amber' : 'rose';
              return (
                <div key={g.goalId} className={cx('py-3', !g.included && 'opacity-50')}>
                  <div className="flex justify-between gap-3 text-sm"><b className="truncate">{g.name}</b><span className="shrink-0 text-xs text-muted num">{money(g.fundedAtDeadline, true)} / {money(g.target)}</span></div>
                  <div className="my-1.5"><Bar value={g.fundedAtDeadline} max={g.target} tone={tone} label={g.name} /></div>
                  <div className="flex justify-between text-[11px] text-faint">
                    <span>{g.target === 0 ? 'No funding target' : g.firstHitMonth === null ? 'Not reached within 50 years' : g.firstHitMonth === 0 ? 'Already reached' : `First hit ${prettyDate(dateOfMonth(p.startDate, g.firstHitMonth))}`}</span>
                    <span>{g.target === 0 ? '' : g.shortfallPct === 0 ? 'funded ✓' : `${Math.round(g.shortfallPct * 100)}% short`}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card eyebrow="The next small step" title="Self-tax, planned for you">
          <p className="text-[13px] text-muted">Your main accelerator: the money you don't spend. Let the AI budget your month and suggest how much to put aside on payday.</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-paper p-2.5"><div className="font-extrabold text-sage-deep num">{money(r1.levy)}</div><div className="text-[10px] text-muted">self-tax</div></div>
            <div className="rounded-xl bg-paper p-2.5"><div className="font-extrabold text-sage-deep num">{money(r1.sweep)}</div><div className="text-[10px] text-muted">swept</div></div>
            <div className="rounded-xl bg-paper p-2.5"><div className="font-extrabold num">{money(r1.toPlan)}</div><div className="text-[10px] text-muted">to plan / month</div></div>
          </div>
          {next && (
            <div className="mt-4 flex gap-3 border-t border-line pt-3">
              <Briefcase size={16} className="mt-0.5 shrink-0 text-sage-deep" />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{next.amount ? `Find about ${money(next.amount)} more each month` : next.label}</div>
                <div className="text-xs text-muted">{next.detail} Gap score would be {next.score === null ? '—' : Math.round(next.score)}.</div>
              </div>
            </div>
          )}
          <button className="btn-soft mt-4 w-full" onClick={() => go('spending')}>Plan my month with AI <ArrowRight size={15} /></button>
        </Card>
      </div>

      <div className="eyebrow mt-3">The next chapter</div>
      <h2 className="-mt-2 text-2xl font-black tracking-tight">Your three goals</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {plan.goals.map((g) => {
          const goal = p.goals.find((x) => x.id === g.goalId)!;
          const Icon = goalIcon[g.kind];
          return (
            <Card key={g.goalId} className={cx(!g.included && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-mist text-sage-deep"><Icon size={16} /></span>
                <span className="eyebrow">{termOf(Math.max(1, g.deadlineMonth))}</span>
              </div>
              <div className="mt-4 font-bold">{g.name}</div>
              <div className="text-xs text-muted">{goal.meaning || (g.kind === 'financial' ? 'A financial milestone you choose' : g.kind === 'career' ? 'Career development and earning capacity' : 'A personal or life goal you choose')}</div>
              <div className="mt-4 flex items-baseline gap-1.5"><span className="text-2xl font-black num">{money(g.fundedAtDeadline)}</span><span className="text-xs text-muted">of {money(g.target)}</span></div>
              <div className="my-1.5"><Bar value={g.fundedAtDeadline} max={g.target} tone={goalTone[g.kind]} /></div>
              <div className="flex justify-between text-[11px] text-faint"><span>{g.target === 0 ? 'No funding target' : g.shortfall === 0 ? 'Target funded ✓' : `${money(g.shortfall)} short at deadline`}</span><span>{Math.max(0, g.deadlineMonth)} months</span></div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr_1fr]">
        <button onClick={() => go('you')} className="relative min-h-[200px] overflow-hidden rounded-2xl bg-gradient-to-br from-butter to-[#f8dc6b] p-4 text-left">
          <div className="eyebrow text-amber-ink">Your future self</div>
          <div className="text-lg font-extrabold">{p.name || 'You'}</div>
          <div className="absolute bottom-0 left-4"><Avatar c={state.character} level={lvl.level} size={170} frame={false} /></div>
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-[#857a3a]/60" />
          <div className="absolute bottom-10 right-5 flex flex-col items-center">
            {[0, 1, 2, 3].slice(0, 1 + Math.min(3, Math.floor(lvl.level / 2))).map((i) => <span key={i} className="-mt-2 h-4 w-14 rounded-[50%] border-2 border-[#c99a1e] bg-[#e7b93a]" />)}
          </div>
        </button>

        <Card eyebrow="Projected tracked assets" title="Your goals, one path" sub="Same starting balances and income across all strategies"
          actions={<label className="flex items-center gap-1.5 text-xs text-muted">Return <PctInput ariaLabel="Investment return" value={state.plan.returns.investmentAnnual} min={-50} max={20} onChange={(v) => { update((d) => void (d.plan.returns.investmentAnnual = v), { returns: 'confirmed' }); if (v <= 0) completeQuest('testReturns'); }} /></label>}>
          <EngineChart title="Projected tracked assets by strategy" height={220} series={series.map((s, i) => ({ id: s.id, label: labels[i], color: colors[i], points: s.points }))} />
          <Legendish />
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="overflow-hidden rounded-xl ring-1 ring-line"><Avatar c={state.character} level={lvl.level} size={64} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-bold">{lvl.name} <span className="rounded-md bg-mist px-1.5 text-[10px] font-bold text-sage-deep">Lv {lvl.level}</span></div>
              <div className="text-xs text-muted">{xp} XP total</div>
              <div className="mt-1.5"><Bar value={lvl.into} max={lvl.span} /></div>
              <div className="mt-1 text-[10px] text-faint num">{lvl.into} / {lvl.span} XP</div>
            </div>
          </div>
          <div className="eyebrow mb-2 mt-5">Grow as you go</div>
          <div className="flex flex-col gap-1.5">
            {quests.map((q) => {
              const done = questDone(state, q);
              return (
                <div key={q.id} className={cx('flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs', done ? 'border-sage/30 bg-sage-soft/60 text-muted line-through' : 'border-line')}>
                  <span className={cx('grid h-4 w-4 shrink-0 place-items-center rounded-full border', done ? 'border-sage bg-sage text-white' : 'border-faint')}>{done ? '✓' : ''}</span>
                  <span className="min-w-0 flex-1 truncate">{q.title}</span>
                  <span className="font-semibold text-amber-ink no-underline">+{q.xp} XP</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-faint">{realDone} real-life actions logged. Rewards for planning and consistency — prototype only.</p>
        </Card>
      </div>

      <Card>
        <button className="flex w-full items-center justify-between text-left" onClick={() => { setMathOpen((o) => !o); completeQuest('openMath'); }} aria-expanded={mathOpen}>
          <div><div className="eyebrow">See where every penny goes</div><div className="text-lg font-extrabold">Open the math</div></div>
          <span className="flex items-center gap-1 text-[15px] text-sage-deep">{mathOpen ? 'Hide' : 'Show'} monthly flow <ChevronDown size={16} className={cx('transition', mathOpen && 'rotate-180')} /></span>
        </button>
        {mathOpen && <div className="mt-4"><MathLedger scenario="plan" m={1} /></div>}
      </Card>

      <div className="rounded-2xl border border-amber/25 bg-cream p-4">
        <div className="eyebrow mb-2 text-amber-ink">Key assumptions</div>
        <ul className="space-y-1 text-[13px] text-amber-ink">
          <li>· {(state.plan.returns.investmentAnnual * 100).toFixed(1)}% annual investment return, {(state.plan.returns.cashAnnual * 100).toFixed(1)}% on cash</li>
          <li>· {state.plan.contribution.mode === 'sweep' ? 'Auto-sweep on' : `Manual transfers up to ${money(state.plan.contribution.ceiling)}`} · payday set-aside {money(state.plan.fixedSetAside.amount)}</li>
          <li>· Emergency: {state.plan.emergency.mode} · target {money(state.plan.emergency.target)}</li>
          <li>· {p.careerStages.length ? `${p.careerStages.length} career stage(s) — incomes are assumptions` : 'No pay rise modelled — add a career stage if one applies'}</li>
        </ul>
        <button className="mt-3 text-xs font-semibold text-amber-ink underline" onClick={() => go('assumptions')}>Edit assumptions →</button>
      </div>
      <p className="text-[11px] text-faint">Prototype only. Accounts, achievements and transfers are simulated; nothing connects to a bank or moves money.</p>
    </div>
  );
}
