import { Plus, X } from 'lucide-react';
import { uid } from '../../engine/defaults';
import { goalFunding } from '../../engine/delusion';
import { dateOfMonth, prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { EngineChart, SERIES_COLORS } from '../Chart';
import { Card, Field, MoneyInput, MonthInput, PctInput, ProvTag, Stat, TableWrap, useMoney } from '../kit';

export function StageEditor() {
  const { state, update } = useStore();
  const p = state.profile;
  const money = useMoney();
  const conf = (k: string) => ({ [k]: 'confirmed' as const });
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-mist px-4 py-3 text-sm"><b>Now:</b> {p.careerStage || p.employment || 'Your current situation'} · {money(p.takeHome)} take-home / month</div>
      {p.careerStages.map((s, i) => (
        <div key={s.id} className="card">
          <div className="mb-3 flex items-center justify-between"><span className="eyebrow">Stage {i + 1}</span>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-mist" aria-label="Remove stage" onClick={() => update((d) => void d.profile.careerStages.splice(i, 1))}><X size={16} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Stage name" className="sm:col-span-2"><input className="input" value={s.name} placeholder="Your next role, qualification or business milestone" onChange={(e) => update((d) => void (d.profile.careerStages[i].name = e.target.value))} /></Field>
            <Field label="Development budget" prov={state.provenance[`stage.${s.id}.budget`] ?? 'assumption'} hint="Course fees, exams, tools — an expense when paid."><MoneyInput value={s.developmentBudget} onChange={(v) => update((d) => void (d.profile.careerStages[i].developmentBudget = v), conf(`stage.${s.id}.budget`))} /></Field>
            <Field label="Earliest transition"><MonthInput value={s.earliestDate} onChange={(v) => update((d) => void (d.profile.careerStages[i].earliestDate = v))} /></Field>
            <Field label="Delay after funding (months)" hint="Study, exams, job search."><input type="number" min={0} className="input num" value={s.delayMonths} onChange={(e) => update((d) => void (d.profile.careerStages[i].delayMonths = Math.max(0, +e.target.value || 0)))} /></Field>
            <Field label="Total take-home at this stage" prov="assumption" hint="Absolute level, not an increase. Not guaranteed."><MoneyInput value={s.takeHome} onChange={(v) => update((d) => void (d.profile.careerStages[i].takeHome = v))} /></Field>
            <Field label="Gross annual (optional)"><MoneyInput value={s.grossAnnual} onChange={(v) => update((d) => void (d.profile.careerStages[i].grossAnnual = v || null))} /></Field>
            <Field label="Share of the rise to goals"><PctInput value={s.goalShareOfExtra} min={0} max={100} step={5} onChange={(v) => update((d) => void (d.profile.careerStages[i].goalShareOfExtra = v), conf(`stage.${s.id}.share`))} /></Field>
          </div>
          <div className="mt-4">
            <div className="eyebrow mb-1">Conditions</div>
            <p className="mb-2 text-xs text-faint">Tick only when achieved in real life. Funding a course doesn't prove you've qualified.</p>
            <div className="flex flex-col gap-2">
              {s.conditions.map((c, j) => (
                <div key={c.id} className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" aria-label="Achieved in real life" checked={c.doneInRealLife} onChange={(e) => update((d) => void (d.profile.careerStages[i].conditions[j].doneInRealLife = e.target.checked))} />
                  <input className="input" value={c.text} placeholder="Qualification, skill or condition" onChange={(e) => update((d) => void (d.profile.careerStages[i].conditions[j].text = e.target.value))} />
                  <button className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-faint hover:bg-mist" aria-label="Remove condition" onClick={() => update((d) => void d.profile.careerStages[i].conditions.splice(j, 1))}><X size={15} /></button>
                </div>
              ))}
              <button className="btn-soft btn-sm self-start" onClick={() => update((d) => void d.profile.careerStages[i].conditions.push({ id: uid('c'), text: '', doneInRealLife: false }))}><Plus size={14} /> Add condition</button>
            </div>
          </div>
        </div>
      ))}
      <button className="btn-ghost self-start" onClick={() => update((d) => void d.profile.careerStages.push({ id: uid('s'), name: '', developmentBudget: 0, conditions: [], earliestDate: dateOfMonth(d.profile.startDate, 12), delayMonths: 0, takeHome: d.profile.careerStages.at(-1)?.takeHome ?? d.profile.takeHome, grossAnnual: null, goalShareOfExtra: d.profile.preferences.extraIncomeShare }))}>
        <Plus size={15} /> Add a career stage
      </button>
    </div>
  );
}

export function Career() {
  const { state, model } = useStore();
  const money = useMoney();
  const p = state.profile;
  const plan = model.results.plan;
  const noRise = model.results.planNoRise;
  const h = model.horizon;
  const sumTo = (rows: typeof plan.rows) => rows.slice(0, h).reduce((a, r) => a + r.toPlan, 0);
  const fPlan = goalFunding(state, plan).filter((g) => g.included);
  const fNo = goalFunding(state, noRise).filter((g) => g.included);
  const fmt = (m: number | null) => (m === null ? 'Not within 50 years' : m === 0 ? 'Already' : prettyDate(dateOfMonth(p.startDate, m)));
  const inc = model.series(['plan', 'planNoRise'], 'income');
  const con = model.series(['plan', 'planNoRise'], 'toPlan');
  const two = (s: typeof inc) => [
    { id: 'plan', label: 'Expected progression', color: SERIES_COLORS.career, points: s[0].points },
    { id: 'nr', label: 'No pay rise', color: '#7d8a96', dashed: true, points: s[1].points },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Stat label="Development paid (forecast)" value={money(plan.rows.slice(0, h).reduce((a, r) => a + r.training, 0))} note="An expense when paid" tone="ink" />
        <Stat label={`Into plan over ${state.plan.horizonYears} yrs — progression`} value={money(sumTo(plan.rows))} />
        <Stat label="Same, with no pay rise" value={money(sumTo(noRise.rows))} note="Training still paid" />
      </div>
      <Card eyebrow="Your route" title="Stages: money, conditions, assumed outcomes">
        {p.careerStages.length === 0 ? <p className="text-sm text-muted">No career stages yet. No income growth is modelled — add a stage below if one applies to you.</p> : (
          <TableWrap>
            <table className="table-data">
              <thead><tr><th>Stage</th><th>Budget</th><th>Funded (forecast)</th><th>Income could start <ProvTag p="assumption" /></th><th>Take-home</th><th>Conditions done</th></tr></thead>
              <tbody>{p.careerStages.map((s, i) => (
                <tr key={s.id}><td className="font-semibold">{s.name || `Stage ${i + 1}`}</td><td>{money(s.developmentBudget)}</td><td>{fmt(plan.stageFundedMonth[i])}</td><td>{fmt(plan.stageActiveMonth[i])}</td><td>{money(s.takeHome)}</td><td>{s.conditions.filter((c) => c.doneInRealLife).length} / {s.conditions.length}</td></tr>
              ))}</tbody>
            </table>
          </TableWrap>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card eyebrow="Income — not wealth" title="Monthly take-home"><EngineChart title="Take-home income" series={two(inc)} height={200} unit="take-home per month" /></Card>
        <Card eyebrow="Actual contributions" title="Monthly money into your plan"><EngineChart title="Plan contributions" series={two(con)} height={200} unit="into plan per month" /></Card>
      </div>
      <Card eyebrow="Effect on dates" title="When each goal is first reached">
        <TableWrap>
          <table className="table-data">
            <thead><tr><th>Goal</th><th>Expected progression</th><th>No pay rise</th></tr></thead>
            <tbody>{fPlan.map((g, i) => <tr key={g.goalId}><td>{g.name}</td><td>{fmt(g.firstHitMonth)}</td><td>{fmt(fNo[i]?.firstHitMonth ?? null)}</td></tr>)}</tbody>
          </table>
        </TableWrap>
      </Card>
      <Card eyebrow="Edit" title="Your career route"><StageEditor /></Card>
    </div>
  );
}
