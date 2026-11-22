import { useState } from 'react';
import { thisMonth } from '../../engine/defaults';
import { levelOf, QUESTS, questDone, streak, totalXp } from '../../engine/gamification';
import { prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Avatar, DREAM_THEMES, DreamHero } from '../Avatar';
import { CharacterEditor } from '../CharacterEditor';
import { Bar, Card, cx, Field, Notice, Stat } from '../kit';
import { TypeTag } from './Route';

export function You() {
  const { state, model, update, completeQuest } = useStore();
  const xp = totalXp(state);
  const lvl = levelOf(xp);
  const month = thisMonth();
  const checkedIn = state.game.checkIns.includes(month);
  const [msg, setMsg] = useState('');
  const real = [
    ...state.milestones.filter((m) => m.completed).map((m) => ({ id: m.id, t: m.title, d: m.completedOn })),
    ...state.profile.careerStages.flatMap((s) => s.conditions.filter((c) => c.doneInRealLife).map((c) => ({ id: c.id, t: `${s.name}: ${c.text}`, d: null as string | null }))),
  ];
  const forecast = model.results.plan.events.filter((e) => ['potFirstHit', 'emergencyComplete', 'stageFunded'].includes(e.type)).slice(0, 8);
  const onUpload = (f?: File) => {
    if (!f) return;
    if (f.size > 1.5e6) return setMsg('That image is over 1.5 MB — please choose a smaller one. It is stored only in this browser.');
    setMsg('');
    const r = new FileReader();
    r.onload = () => update((d) => void (d.dream.imageDataUrl = String(r.result)));
    r.readAsDataURL(f);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card eyebrow="Your future self" title={`${state.profile.name || 'You'} · ${lvl.name}`}>
          <div className="flex justify-center rounded-xl bg-gradient-to-b from-butter to-[#f8e08a] pt-4"><Avatar c={state.character} level={lvl.level} size={220} frame={false} /></div>
          <div className="mt-4 flex justify-between text-sm"><b>Level {lvl.level}</b><span className="text-muted num">{xp} XP</span></div>
          <div className="mt-1.5"><Bar value={lvl.into} max={lvl.span} /></div>
          <p className="mt-2 text-xs text-faint">XP comes from planning, learning and consistency — never from spending, wealth or the size of deposits.</p>
        </Card>
        <Card eyebrow="Customise" title="Your character"><CharacterEditor /></Card>
      </div>

      <Card eyebrow="Picture it" title="Your dream" sub="Draw it from a scene or upload your own image (kept only in this browser). The sun rises as you complete real actions.">
        <DreamHero dream={state.dream} progress={Math.min(1, (lvl.level - 1) / 6)}>
          <h3 className="display text-[26px]">{state.dream.title || 'Your dream'}</h3>
          <p className="text-sm text-white/80">{state.dream.description}</p>
        </DreamHero>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Dream title"><input className="input" value={state.dream.title} placeholder="What you are working toward" onChange={(e) => update((d) => void (d.dream.title = e.target.value))} /></Field>
          <Field label="Scene">
            <select className="input" value={state.dream.theme} onChange={(e) => update((d) => void (d.dream.theme = e.target.value as typeof d.dream.theme))}>
              {DREAM_THEMES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Description" className="sm:col-span-2"><textarea className="input" rows={2} value={state.dream.description} onChange={(e) => update((d) => void (d.dream.description = e.target.value))} /></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="btn-ghost btn-sm cursor-pointer">Upload image<input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} /></label>
          {state.dream.imageDataUrl && <button className="btn-ghost btn-sm" onClick={() => update((d) => void (d.dream.imageDataUrl = null))}>Use drawn scene</button>}
        </div>
        {msg && <div className="mt-3"><Notice tone="amber">{msg}</Notice></div>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card eyebrow="Consistency" title="Monthly check-in" sub="Review your real spending and update anything that changed.">
          <div className="grid grid-cols-2 gap-2"><Stat label="Check-ins" value={new Set(state.game.checkIns).size} /><Stat label="Best streak (months)" value={streak(state.game.checkIns)} /></div>
          <button className="btn-primary mt-4 w-full" disabled={checkedIn} onClick={() => { update((d) => void d.game.checkIns.push(month)); completeQuest('checkIn'); }}>
            {checkedIn ? `Checked in for ${prettyDate(month)} ✓` : `Check in for ${prettyDate(month)}`}
          </button>
        </Card>
        <Card eyebrow="Grow as you go" title="Quests" sub="Meaningful actions — none involve spending money.">
          <ul className="flex flex-col gap-1.5">
            {QUESTS.map((q) => {
              const done = questDone(state, q);
              return (
                <li key={q.id} className={cx('flex items-center gap-2.5 rounded-lg border px-3 py-2', done ? 'border-sage/30 bg-sage-soft/50' : 'border-line')}>
                  <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]', done ? 'border-sage bg-sage text-white' : 'border-faint')}>{done ? '✓' : ''}</span>
                  <span className="min-w-0 flex-1"><span className={cx('block text-sm', done && 'text-muted line-through')}>{q.title}</span><span className="block text-[11px] text-faint">{q.why}</span></span>
                  {!done && q.id === 'learn' && <button className="btn-soft btn-sm" onClick={() => completeQuest(q.id)}>I did this</button>}
                  <span className="text-xs font-semibold text-amber-ink">+{q.xp}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card eyebrow="Real life" title="Achieved" sub="Recorded by you. Only these count as achievements.">
          {real.length === 0 ? <p className="text-sm text-muted">Nothing yet — tick a step on your route when it really happens.</p> : (
            <ul className="divide-y divide-line">{real.map((x) => <li key={x.id} className="flex items-center gap-2 py-2 text-sm"><TypeTag t="achievement" /><span className="flex-1">{x.t}</span><span className="text-xs text-faint">{x.d ?? ''}</span></li>)}</ul>
          )}
        </Card>
        <Card eyebrow="Projection" title="Forecast progress" sub="Projections only — not achievements.">
          <ul className="divide-y divide-line">{forecast.map((e, i) => <li key={i} className="flex items-center gap-2 py-2 text-sm"><TypeTag t="money" /><span>{e.label}</span></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
