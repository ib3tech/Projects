import { dateOfMonth, prettyDate } from '../../engine/profile';
import { uid } from '../../engine/defaults';
import { useStore } from '../../state/store';
import { Card, Field, MoneyInput, MonthInput, PctInput, ProvTag, Stat, useMoney } from '../components/inputs';
import { LineChart } from '../components/LineChart';
import { goalFunding } from '../../engine/delusion';

export function StageEditor() {
  const { state, update } = useStore();
  const p = state.profile;
  const money = useMoney();
  const conf = (k: string) => ({ [k]: 'confirmed' as const });
  return (
    <div className="stack">
      <div className="stage-now">
        <strong>Stage 0 — now:</strong> {p.careerStage || 'Current situation'} · take-home {money(p.takeHome)} / month
      </div>
      {p.careerStages.map((s, i) => (
        <Card key={s.id} className="inner" title={`Stage ${i + 1}`} actions={<button className="icon-btn" aria-label="Remove stage" onClick={() => update((d) => void d.profile.careerStages.splice(i, 1))}>×</button>}>
          <Field label="Stage name">
            <input value={s.name} placeholder="Your next role, qualification or business milestone" onChange={(e) => update((d) => void (d.profile.careerStages[i].name = e.target.value))} />
          </Field>
          <div className="grid2">
            <Field label="Development budget required" prov={state.provenance[`stage.${s.id}.budget`] ?? 'assumption'} hint="Course fees, exams, tools. Becomes an expense when paid.">
              <MoneyInput value={s.developmentBudget} onChange={(v) => update((d) => void (d.profile.careerStages[i].developmentBudget = v), conf(`stage.${s.id}.budget`))} />
            </Field>
            <Field label="Earliest possible transition">
              <MonthInput value={s.earliestDate} onChange={(v) => update((d) => void (d.profile.careerStages[i].earliestDate = v))} />
            </Field>
            <Field label="Delay after funding (months)" hint="Study time, exams, job search.">
              <input type="number" min={0} value={s.delayMonths} onChange={(e) => update((d) => void (d.profile.careerStages[i].delayMonths = Math.max(0, +e.target.value || 0)))} />
            </Field>
            <Field label="Expected TOTAL monthly take-home at this stage" prov="assumption" hint="Absolute level, not an increase. Not guaranteed.">
              <MoneyInput value={s.takeHome} onChange={(v) => update((d) => void (d.profile.careerStages[i].takeHome = v))} />
            </Field>
            <Field label="Gross annual salary (optional, informational)">
              <MoneyInput value={s.grossAnnual} onChange={(v) => update((d) => void (d.profile.careerStages[i].grossAnnual = v || null))} />
            </Field>
            <Field label="Share of extra income directed to goals">
              <PctInput value={s.goalShareOfExtra} min={0} max={100} step={5} onChange={(v) => update((d) => void (d.profile.careerStages[i].goalShareOfExtra = v), conf(`stage.${s.id}.share`))} />
            </Field>
          </div>
          <Field label="Qualifications, skills or other conditions" hint="Tick only when actually achieved in real life. Funding a course does not prove you have qualified.">
            <div className="stack">
              {s.conditions.map((c, j) => (
                <div className="row" key={c.id}>
                  <input type="checkbox" aria-label="Achieved in real life" checked={c.doneInRealLife} onChange={(e) => update((d) => void (d.profile.careerStages[i].conditions[j].doneInRealLife = e.target.checked))} />
                  <input value={c.text} placeholder="Condition" onChange={(e) => update((d) => void (d.profile.careerStages[i].conditions[j].text = e.target.value))} />
                  <button className="icon-btn" aria-label="Remove condition" onClick={() => update((d) => void d.profile.careerStages[i].conditions.splice(j, 1))}>×</button>
                </div>
              ))}
              <button type="button" className="btn ghost small" onClick={() => update((d) => void d.profile.careerStages[i].conditions.push({ id: uid('c'), text: '', doneInRealLife: false }))}>
                + Add condition
              </button>
            </div>
          </Field>
        </Card>
      ))}
      <button
        className="btn ghost"
        onClick={() =>
          update((d) =>
            void d.profile.careerStages.push({
              id: uid('s'),
              name: '',
              developmentBudget: 0,
              conditions: [],
              earliestDate: dateOfMonth(d.profile.startDate, 12),
              delayMonths: 0,
              takeHome: d.profile.careerStages.at(-1)?.takeHome ?? d.profile.takeHome,
              grossAnnual: null,
              goalShareOfExtra: d.profile.preferences.extraIncomeShare,
            }),
          )
        }
      >
        + Add career stage
      </button>
    </div>
  );
}

export function CareerView() {
  const { state, model } = useStore();
  const money = useMoney();
  const p = state.profile;
  const plan = model.results.plan;
  const noRise = model.results.planNoRise;
  const start = p.startDate;
  const series = model.series(['plan', 'planNoRise'], 'income');
  const contrib = model.series(['plan', 'planNoRise'], 'toPlan');
  const fPlan = goalFunding(state, plan);
  const fNo = goalFunding(state, noRise);
  const careerGoal = p.goals.find((g) => g.kind === 'career');
  const fmtM = (m: number | null) => (m === null ? 'Not within 50 years' : m === 0 ? 'Already' : prettyDate(dateOfMonth(start, m)));
  const h = model.horizon;
  const sumTo = (rows: typeof plan.rows) => rows.slice(0, h).reduce((a, r) => a + r.toPlan, 0);

  return (
    <div className="stack">
      <Card title="Career development affects the main forecast" sub="Career outcomes are assumptions, not guaranteed returns. Skills are not compounded at an investment rate. Future wages are not assets.">
        <div className="stats">
          <Stat label="Development paid (forecast, to horizon)" value={money(plan.rows.slice(0, h).reduce((a, r) => a + r.training, 0))} note="Counted as an expense when paid" />
          <Stat label="Plan contributions — expected progression" value={money(sumTo(plan.rows))} note={`over ${state.plan.horizonYears} years`} />
          <Stat label="Plan contributions — no pay rise" value={money(sumTo(noRise.rows))} note="Same training paid, income stays flat" />
        </div>
        {careerGoal?.targetTakeHome ? (
          <p className="muted small">
            Earning-capacity goal: {money(careerGoal.targetTakeHome)} take-home by {prettyDate(careerGoal.deadline)}. Forecast take-home then: {money(plan.rows[Math.max(0, Math.min(plan.rows.length, model.meters.plan.goals.find((g) => g.kind === 'career')?.deadlineMonth ?? 1) - 1)]?.income ?? 0)} <ProvTag p="assumption" />
          </p>
        ) : null}
      </Card>

      <Card title="Stages: money, conditions and assumed outcomes">
        {p.careerStages.length === 0 && <p className="muted">No career stages yet. Add them below if they apply to you — nobody needs the same route.</p>}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Budget</th>
                <th>Funded (forecast)</th>
                <th>Income could start (assumed)</th>
                <th>Take-home (assumed)</th>
                <th>Conditions achieved (real life)</th>
              </tr>
            </thead>
            <tbody>
              {p.careerStages.map((s, i) => (
                <tr key={s.id}>
                  <td>{s.name || `Stage ${i + 1}`}</td>
                  <td>{money(s.developmentBudget)}</td>
                  <td>{fmtM(plan.stageFundedMonth[i])}</td>
                  <td>{fmtM(plan.stageActiveMonth[i])}</td>
                  <td>{money(s.takeHome)}</td>
                  <td>
                    {s.conditions.filter((c) => c.doneInRealLife).length} / {s.conditions.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Monthly take-home income" sub="Income — not wealth. Shown separately from the assets graph on purpose.">
        <LineChart
          title="Monthly take-home income, expected progression vs no pay rise"
          series={[
            { id: 'plan', label: 'Expected progression', color: 'var(--series-1)', points: series[0].points },
            { id: 'nr', label: 'No pay rise', color: 'var(--series-2)', dashed: true, points: series[1].points },
          ]}
          height={200}
        />
      </Card>
      <Card title="Monthly money into your plan" sub="Actual contributions under each income scenario.">
        <LineChart
          title="Monthly plan contributions"
          series={[
            { id: 'plan', label: 'Expected progression', color: 'var(--series-1)', points: contrib[0].points },
            { id: 'nr', label: 'No pay rise', color: 'var(--series-2)', dashed: true, points: contrib[1].points },
          ]}
          height={200}
        />
      </Card>
      <Card title="Effect on goal dates">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Goal</th>
                <th>First target hit — progression</th>
                <th>First target hit — no pay rise</th>
              </tr>
            </thead>
            <tbody>
              {fPlan.filter((g) => g.included).map((g, i) => (
                <tr key={g.goalId}>
                  <td>{g.name || g.kind}</td>
                  <td>{fmtM(g.firstHitMonth)}</td>
                  <td>{fmtM(fNo.filter((x) => x.included)[i]?.firstHitMonth ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Edit your career route">
        <StageEditor />
      </Card>
    </div>
  );
}
