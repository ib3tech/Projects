import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import { uid } from '../../engine/defaults';
import { Milestone, prettyDate } from '../../engine/profile';
import { Horizon } from '../../engine/route';
import { useStore } from '../../state/store';
import { Card, Choice, cx, MonthInput, useMoney } from '../kit';
import type { NavId } from '../Shell';

const TYPE: Record<string, [string, string]> = {
  money: ['Money', 'border-sage/40 text-sage-deep'],
  action: ['Action', 'border-line text-ink/70'],
  qualification: ['Condition', 'border-violet/40 text-violet'],
  'assumed-outcome': ['Assumed outcome', 'border-dashed border-amber/60 text-amber-ink'],
  achievement: ['Achieved', 'border-sage bg-sage-soft text-sage-deep'],
  warning: ['Warning', 'border-rose/40 text-rose'],
};

export function TypeTag({ t }: { t: string }) {
  const [l, c] = TYPE[t] ?? [t, 'border-line'];
  return <span className={cx('shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', c)}>{l}</span>;
}

export function Route({ go }: { go: (t: NavId) => void }) {
  const { state, model, update } = useStore();
  const money = useMoney();
  const p = state.profile;
  const [hz, setHz] = useState<Horizon | 'all'>('all');
  const items = model.route.filter((i) => hz === 'all' || i.horizon === hz);
  const allConds = p.careerStages.flatMap((s) => s.conditions);
  const setMs = (id: string, fn: (m: Milestone) => void) => update((d) => fn(d.milestones.find((m) => m.id === id)!));
  const chain: [string, string, string, NavId | null][] = [
    ['Now', p.careerStage || p.employment || 'Your situation', `${money(p.takeHome)} take-home`, null],
    ['Actions', `${state.milestones.length + allConds.length} steps`, `${state.milestones.filter((m) => m.completed).length + allConds.filter((c) => c.doneInRealLife).length} done in real life`, null],
    ['Career development', `${p.careerStages.length} stage${p.careerStages.length === 1 ? '' : 's'}`, `${money(p.careerStages.reduce((a, s) => a + s.developmentBudget, 0))} budget`, 'career'],
    ['Earning capacity', money(p.careerStages.at(-1)?.takeHome ?? p.takeHome), 'assumed, not guaranteed', 'career'],
    ['Saving & investing', `${money(model.summary.month1.toPlan)} / month`, 'forecast', 'pots'],
    ['Goals', `${p.goals.filter((g) => g.active).length} active`, `gap score ${model.meters.plan.score === null ? '—' : Math.round(model.meters.plan.score)}`, 'meter'],
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card eyebrow="From here to there" title="Your route">
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {chain.map(([t, a, b, link], i) => (
            <li key={t}>
              <button disabled={!link} onClick={() => link && go(link)} className="relative h-full w-full rounded-xl bg-paper p-3 text-left enabled:hover:bg-mist">
                <div className="eyebrow text-sage-deep">{i + 1}. {t}</div>
                <div className="mt-1 text-sm font-bold">{a}</div>
                <div className="text-[11px] text-muted">{b}</div>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
          <span className="flex items-center gap-1.5"><TypeTag t="money" /> money needed or saved (forecast)</span>
          <span className="flex items-center gap-1.5"><TypeTag t="qualification" /> required to progress</span>
          <span className="flex items-center gap-1.5"><TypeTag t="assumed-outcome" /> not guaranteed</span>
          <span className="flex items-center gap-1.5"><TypeTag t="achievement" /> recorded by you</span>
        </div>
      </Card>

      <Card eyebrow="Milestones" title="Timeline" actions={<Choice value={hz} onChange={setHz} options={[{ v: 'all', label: 'All' }, { v: 'short', label: '≤1 yr' }, { v: 'medium', label: '1–5 yrs' }, { v: 'long', label: '5+ yrs' }]} className="[&>button]:px-2.5 [&>button]:py-1 [&>button]:text-xs" />}>
        <ol className="relative ml-2 border-l-2 border-line">
          {items.map((i) => (
            <li key={i.id} className="relative flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 pl-5">
              <span className={cx('absolute -left-[7px] top-4 h-3 w-3 rounded-full border-2', i.completed ? 'border-sage bg-sage' : 'border-faint bg-white')} />
              <span className="w-[70px] shrink-0 text-xs text-muted num">{i.m === 0 ? 'Start' : prettyDate(i.date)}</span>
              <TypeTag t={i.type} />
              <span className="min-w-[160px] flex-1 text-sm">{i.title || '(untitled step)'}</span>
              {i.source === 'forecast' && <span className="text-[11px] text-faint">forecast</span>}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-faint">Forecast events are never marked as achieved. Funding a course does not prove you have qualified; saving a deposit does not prove a purchase is affordable or approved.</p>
      </Card>

      <Card eyebrow="Make it yours" title="Edit your steps" sub="Add your own actions and milestones. Tick done only when it has actually happened.">
        <div className="flex flex-col gap-2">
          {state.milestones.map((m) => (
            <div key={m.id} className="grid items-center gap-2 rounded-xl bg-paper p-3 md:grid-cols-[2fr_1.2fr_1fr_1fr_auto_auto]">
              <input className="input" aria-label="Step" placeholder="What needs to happen" value={m.title} onChange={(e) => setMs(m.id, (x) => void (x.title = e.target.value))} />
              <select className="input" aria-label="Type" value={m.type} onChange={(e) => setMs(m.id, (x) => void (x.type = e.target.value as Milestone['type']))}>
                <option value="action">Action</option><option value="qualification">Qualification / skill</option><option value="money">Money milestone</option><option value="assumed-outcome">Assumed outcome</option>
              </select>
              <MonthInput ariaLabel="Date" value={m.date} onChange={(v) => setMs(m.id, (x) => void (x.date = v))} />
              <select className="input" aria-label="Goal" value={m.goalId ?? ''} onChange={(e) => setMs(m.id, (x) => void (x.goalId = e.target.value || null))}>
                <option value="">No goal</option>{p.goals.map((g) => <option key={g.id} value={g.id}>{g.name || g.kind}</option>)}
              </select>
              <label className="flex items-center gap-2 text-xs whitespace-nowrap"><input type="checkbox" checked={m.completed} onChange={(e) => setMs(m.id, (x) => { x.completed = e.target.checked; x.completedOn = e.target.checked ? new Date().toISOString().slice(0, 10) : null; })} /> Done in real life</label>
              <button className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-mist" aria-label="Remove step" onClick={() => update((d) => void (d.milestones = d.milestones.filter((x) => x.id !== m.id)))}><X size={15} /></button>
            </div>
          ))}
          <button className="btn-soft btn-sm self-start" onClick={() => update((d) => void d.milestones.push({ id: uid('m'), title: '', type: 'action', date: d.profile.startDate, goalId: null, notes: '', completed: false, completedOn: null }))}><Plus size={14} /> Add step</button>
        </div>
        <div className="eyebrow mb-2 mt-6">Goal deadlines</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {p.goals.map((g, i) => (
            <label key={g.id} className="flex flex-col gap-1 text-sm"><span className="truncate font-medium">{g.name || g.kind}</span>
              <MonthInput value={g.deadline} onChange={(v) => update((d) => void (d.profile.goals[i].deadline = v), { [`goal.${g.id}.deadline`]: 'confirmed' })} />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
