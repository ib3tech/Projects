import { useState } from 'react';
import { thisMonth } from '../../engine/defaults';
import { levelOf, QUESTS, questDone, streak, totalXp } from '../../engine/gamification';
import { prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Bar, Card, Field, Seg, Stat } from '../components/inputs';
import { CharacterSvg, DREAM_THEMES, DreamScene } from '../components/Character';

const SKINS = ['#f2d3b3', '#e0b088', '#c68a5e', '#a8693f', '#7d4a2a', '#5a3420'];
const HAIR = ['#1b1410', '#3b2a1e', '#6b4a2f', '#a06a3b', '#c9a15c', '#8a8a8a'];
const OUTFITS = ['#2f6f4f', '#3a5a8c', '#7a3e5f', '#8c5a2b', '#4a4a5a', '#6b7f3a'];
const ACCENTS = ['#e0b84f', '#d9d2c5', '#c0504d', '#5aa0a0', '#9b7fc8', '#f0f0f0'];

function Swatches({ value, options, onChange, label }: { value: string; options: string[]; onChange: (v: string) => void; label: string }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {options.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} className={value === c ? 'on' : ''} style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

export function YouView() {
  const { state, model, update, completeQuest } = useStore();
  const xp = totalXp(state);
  const lvl = levelOf(xp);
  const ch = state.character;
  const month = thisMonth();
  const checkedIn = state.game.checkIns.includes(month);
  const realDone = [
    ...state.milestones.filter((m) => m.completed).map((m) => ({ id: m.id, t: m.title, d: m.completedOn })),
    ...state.profile.careerStages.flatMap((s) => s.conditions.filter((c) => c.doneInRealLife).map((c) => ({ id: c.id, t: `${s.name}: ${c.text}`, d: null as string | null }))),
  ];
  const forecastHits = model.results.plan.events.filter((e) => e.type === 'potFirstHit' || e.type === 'emergencyComplete' || e.type === 'stageFunded');

  const [uploadMsg, setUploadMsg] = useState('');
  const onUpload = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 1.5e6) {
      setUploadMsg('That image is over 1.5 MB. Please choose a smaller one (it is stored only in this browser).');
      return;
    }
    setUploadMsg('');
    const r = new FileReader();
    r.onload = () => update((d) => void (d.dream.imageDataUrl = String(r.result)));
    r.readAsDataURL(f);
  };

  return (
    <div className="stack">
      <div className="dash-top">
        <Card title="Your character">
          <div className="char-stage">
            <CharacterSvg c={ch} level={lvl.level} size={220} />
          </div>
          <div className="row between small">
            <b>
              Level {lvl.level} · {lvl.name}
            </b>
            <span>{xp} XP</span>
          </div>
          <Bar value={lvl.into} max={lvl.span} label="XP to next level" />
          <p className="small muted">XP comes from planning, learning and consistency — never from spending, wealth or the size of deposits.</p>
        </Card>
        <Card title="Customise">
          <Field label="Character">
            <Seg value={ch.gender} onChange={(v) => update((d) => void (d.character.gender = v))} options={[{ v: 'female', label: 'Female' }, { v: 'male', label: 'Male' }]} />
          </Field>
          <Field label="Skin tone"><Swatches label="Skin tone" value={ch.skin} options={SKINS} onChange={(v) => update((d) => void (d.character.skin = v))} /></Field>
          <Field label="Hair"><Swatches label="Hair colour" value={ch.hair} options={HAIR} onChange={(v) => update((d) => void (d.character.hair = v))} /></Field>
          <Field label="Outfit"><Swatches label="Outfit colour" value={ch.outfit} options={OUTFITS} onChange={(v) => update((d) => void (d.character.outfit = v))} /></Field>
          <Field label="Accent / headwear colour"><Swatches label="Accent colour" value={ch.accent} options={ACCENTS} onChange={(v) => update((d) => void (d.character.accent = v))} /></Field>
          <Field label="Headwear">
            <Seg
              value={ch.headwear}
              onChange={(v) => update((d) => void (d.character.headwear = v))}
              options={[{ v: 'none', label: 'None' }, { v: 'scarf', label: 'Headscarf' }, { v: 'cap', label: 'Cap' }, { v: 'kufi', label: 'Kufi' }]}
            />
          </Field>
        </Card>
      </div>

      <Card title="Your dream" sub="Picture your own ambition — draw it from a scene or upload your own image (kept only in this browser).">
        <DreamScene dream={state.dream} stage={Math.min(5, lvl.level - 1)} />
        <div className="grid2">
          <Field label="Dream title">
            <input value={state.dream.title} onChange={(e) => update((d) => void (d.dream.title = e.target.value))} placeholder="What you are working toward" />
          </Field>
          <Field label="Scene">
            <select value={state.dream.theme} onChange={(e) => update((d) => void (d.dream.theme = e.target.value as typeof d.dream.theme))}>
              {DREAM_THEMES.map((t) => (
                <option key={t.v} value={t.v}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={2} value={state.dream.description} onChange={(e) => update((d) => void (d.dream.description = e.target.value))} />
        </Field>
        <div className="row">
          <label className="btn ghost small">
            Upload image
            <input type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
          </label>
          {state.dream.imageDataUrl && <button className="btn ghost small" onClick={() => update((d) => void (d.dream.imageDataUrl = null))}>Use drawn scene</button>}
        </div>
        {uploadMsg && <p className="notice warn small">{uploadMsg}</p>}
        <p className="small muted">The scene gains detail as you level up through real actions — not as balances grow.</p>
      </Card>

      <Card title="Consistency" sub="A monthly check-in: review your real spending, update anything that changed.">
        <div className="stats">
          <Stat label="Check-ins" value={new Set(state.game.checkIns).size} />
          <Stat label="Best streak (months)" value={streak(state.game.checkIns)} />
        </div>
        <button
          className="btn primary"
          disabled={checkedIn}
          onClick={() => {
            update((d) => void d.game.checkIns.push(month));
            completeQuest('checkIn');
          }}
        >
          {checkedIn ? `Checked in for ${prettyDate(month)}` : `Check in for ${prettyDate(month)}`}
        </button>
      </Card>

      <Card title="Quests" sub="Meaningful actions. None of them involve spending money.">
        <ul className="quests">
          {QUESTS.map((q) => {
            const done = questDone(state, q);
            return (
              <li key={q.id} className={done ? 'done' : ''}>
                <span className="q-check" aria-hidden>{done ? '✓' : '○'}</span>
                <span className="grow">
                  <b>{q.title}</b>
                  <br />
                  <span className="small muted">{q.why}</span>
                </span>
                <span className="small">+{q.xp} XP</span>
                {!done && !q.check && q.id === 'learn' && (
                  <button className="btn ghost small" onClick={() => completeQuest(q.id)}>I did this</button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="dash-top">
        <Card title="Achieved in real life" sub="Recorded by you. Only these count as achievements.">
          {realDone.length === 0 ? <p className="muted small">Nothing recorded yet — tick a step on your Route when it really happens.</p> : (
            <ul className="route-mini">{realDone.map((x) => <li key={x.id}><span className="rtype t-achievement">Achieved</span><span>{x.t}</span><span className="small muted">{x.d ?? ''}</span></li>)}</ul>
          )}
        </Card>
        <Card title="Forecast progress" sub="Projections only — not achievements.">
          <ul className="route-mini">
            {forecastHits.slice(0, 8).map((e, i) => (
              <li key={i}><span className="rtype t-money">Forecast</span><span>{e.label}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
