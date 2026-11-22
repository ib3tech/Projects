import { useState } from 'react';
import { uid } from '../../engine/defaults';
import { Milestone, prettyDate } from '../../engine/profile';
import { Horizon } from '../../engine/route';
import { useStore } from '../../state/store';
import { Card, Field, MonthInput, Seg, useMoney } from '../components/inputs';
import { typeLabel } from './Dashboard';

export function RouteView({ go }: { go: (t: string) => void }) {
  const { state, model, update } = useStore();
  const money = useMoney();
  const p = state.profile;
  const [hz, setHz] = useState<Horizon | 'all'>('all');
  const items = model.route.filter((i) => hz === 'all' || i.horizon === hz);
  const r1 = model.summary.month1;
  const lastStage = p.careerStages.at(-1);

  const addMs = () =>
    update((d) =>
      void d.milestones.push({ id: uid('m'), title: '', type: 'action', date: d.profile.startDate, goalId: null, notes: '', completed: false, completedOn: null }),
    );
  const setMs = (id: string, fn: (m: Milestone) => void) => update((d) => fn(d.milestones.find((m) => m.id === id)!));

  return (
    <div className="stack">
      <Card title="Your route" sub="Current situation → required actions → career development → earning capacity → saving/investing → goals">
        <div className="chain">
          <div className="chain-step">
            <b>Now</b>
            <span>{p.careerStage || 'Your situation'}</span>
            <span className="small">{money(p.takeHome)} take-home</span>
          </div>
          <div className="chain-step">
            <b>Actions</b>
            <span>{state.milestones.length + p.careerStages.flatMap((s) => s.conditions).length} steps</span>
            <span className="small">{state.milestones.filter((m) => m.completed).length + p.careerStages.flatMap((s) => s.conditions).filter((c) => c.doneInRealLife).length} done (real life)</span>
          </div>
          <div className="chain-step" onClick={() => go('career')} role="button" tabIndex={0}>
            <b>Career development</b>
            <span>{p.careerStages.length} stage{p.careerStages.length === 1 ? '' : 's'}</span>
            <span className="small">{money(p.careerStages.reduce((a, s) => a + s.developmentBudget, 0))} budget</span>
          </div>
          <div className="chain-step">
            <b>Earning capacity</b>
            <span>{lastStage ? money(lastStage.takeHome) : money(p.takeHome)}</span>
            <span className="small">assumed, not guaranteed</span>
          </div>
          <div className="chain-step" onClick={() => go('pots')} role="button" tabIndex={0}>
            <b>Saving & investing</b>
            <span>{money(r1.toPlan)} / month now</span>
            <span className="small">forecast</span>
          </div>
          <div className="chain-step" onClick={() => go('meter')} role="button" tabIndex={0}>
            <b>Goals</b>
            <span>{p.goals.filter((g) => g.active).length} active</span>
            <span className="small">gap score {model.meters.plan.score === null ? '—' : model.meters.plan.score.toFixed(0)}</span>
          </div>
        </div>
        <div className="legend-row small">
          <span className="rtype t-money">Money</span> forecast money needed or saved
          <span className="rtype t-qualification">Condition</span> qualification / skill required
          <span className="rtype t-assumed-outcome">Assumed outcome</span> not guaranteed
          <span className="rtype t-achievement">Achieved</span> recorded by you in real life
        </div>
      </Card>

      <Card title="Timeline" actions={<Seg value={hz} onChange={setHz} options={[{ v: 'all', label: 'All' }, { v: 'short', label: '≤1 yr' }, { v: 'medium', label: '1–5 yrs' }, { v: 'long', label: '5+ yrs' }]} />}>
        <ol className="timeline">
          {items.map((i) => (
            <li key={i.id} className={i.completed ? 'done' : ''}>
              <span className="tl-date">{i.m === 0 ? 'Start' : prettyDate(i.date)}</span>
              <span className={`rtype t-${i.type}`}>{typeLabel(i.type)}</span>
              <span className="tl-title">{i.title || '(untitled step)'}</span>
              {i.source === 'forecast' && <span className="small muted"> forecast</span>}
            </li>
          ))}
        </ol>
        <p className="small muted">Forecast events are never marked as achieved. Funding a course does not prove you have qualified; saving a deposit does not prove a purchase is affordable or approved.</p>
      </Card>

      <Card title="Edit your steps" sub="Add your own actions and milestones. Tick 'done' only when it has actually happened.">
        <div className="stack">
          {state.milestones.map((m) => (
            <div key={m.id} className="ms-edit">
              <input aria-label="Step title" value={m.title} placeholder="What needs to happen" onChange={(e) => setMs(m.id, (x) => void (x.title = e.target.value))} />
              <select aria-label="Type" value={m.type} onChange={(e) => setMs(m.id, (x) => void (x.type = e.target.value as Milestone['type']))}>
                <option value="action">Action</option>
                <option value="qualification">Qualification / skill</option>
                <option value="money">Money milestone</option>
                <option value="assumed-outcome">Assumed outcome</option>
              </select>
              <MonthInput ariaLabel="Date" value={m.date} onChange={(v) => setMs(m.id, (x) => void (x.date = v))} />
              <select aria-label="Goal" value={m.goalId ?? ''} onChange={(e) => setMs(m.id, (x) => void (x.goalId = e.target.value || null))}>
                <option value="">No goal</option>
                {p.goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name || g.kind}
                  </option>
                ))}
              </select>
              <label className="row small">
                <input type="checkbox" checked={m.completed} onChange={(e) => setMs(m.id, (x) => { x.completed = e.target.checked; x.completedOn = e.target.checked ? new Date().toISOString().slice(0, 10) : null; })} /> Done in real life
              </label>
              <button className="icon-btn" aria-label="Remove step" onClick={() => update((d) => void (d.milestones = d.milestones.filter((x) => x.id !== m.id)))}>
                ×
              </button>
            </div>
          ))}
          <button className="btn ghost" onClick={addMs}>
            + Add step
          </button>
        </div>
        <Field label="Goal deadlines">
          <div className="stack">
            {p.goals.map((g, i) => (
              <div key={g.id} className="row">
                <span className="grow">{g.name || g.kind}</span>
                <MonthInput value={g.deadline} onChange={(v) => update((d) => void (d.profile.goals[i].deadline = v), { [`goal.${g.id}.deadline`]: 'confirmed' })} />
              </div>
            ))}
          </div>
        </Field>
      </Card>
    </div>
  );
}
