import { scoreBand } from '../../engine/delusion';
import { levelOf, totalXp } from '../../engine/gamification';
import { dateOfMonth, prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Bar, Card, Stat, useMoney } from '../components/inputs';
import { CharacterSvg, DreamScene } from '../components/Character';
import { LineChart } from '../components/LineChart';

export function MeterGauge({ score }: { score: number | null }) {
  const band = scoreBand(score);
  const v = score ?? 0;
  const angle = Math.PI * (1 - v / 100);
  const cx = 100, cy = 100, r = 80;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 116" role="img" aria-label={`Delusion Meter funding-gap score ${score === null ? 'not available' : v.toFixed(0)} out of 100`}>
        <path d="M20 100 A80 80 0 0 1 180 100" className="gauge-track" />
        {score !== null && v > 0.5 && <path d={`M20 100 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`} className={`gauge-fill tone-${band.tone}`} />}
        <text x="100" y="88" textAnchor="middle" className="gauge-num">
          {score === null ? '—' : v.toFixed(0)}
        </text>
        <text x="100" y="108" textAnchor="middle" className="gauge-sub">
          funding gap / 100
        </text>
      </svg>
      <div className={`band tone-${band.tone}`}>
        <span aria-hidden>{band.tone === 'good' ? '✓' : band.tone === 'none' ? '○' : '!'}</span> {band.label}
      </div>
    </div>
  );
}

export function Dashboard({ go }: { go: (t: string) => void }) {
  const { state, model } = useStore();
  const money = useMoney();
  const r1 = model.summary.month1;
  const plan = model.results.plan;
  const start = state.profile.startDate;
  const goals = model.meters.plan.goals;
  const xp = totalXp(state);
  const lvl = levelOf(xp);
  const doneActions = state.milestones.filter((m) => m.completed).length + state.profile.careerStages.flatMap((s) => s.conditions).filter((c) => c.doneInRealLife).length;
  const series = model.series(['current', 'plan'], 'netAssets');
  const deadlineMarkers = state.profile.goals.filter((g) => g.active).map((g) => ({ m: model.meters.plan.goals.find((x) => x.goalId === g.id)!.deadlineMonth, label: g.name.slice(0, 14) || g.kind }));

  return (
    <div className="stack">
      <div className="dash-top">
        <Card className="meter-card" title="Delusion Meter" sub="A planning measure — not a probability of success, and not a judgement of you." actions={<button className="link" onClick={() => go('meter')}>Details →</button>}>
          <MeterGauge score={model.meters.plan.score} />
          <p className="muted small center">Current habits score: {model.meters.current.score === null ? '—' : model.meters.current.score.toFixed(0)}</p>
        </Card>
        <Card className="dream-card" title={state.dream.title || 'Your dream'} actions={<button className="link" onClick={() => go('you')}>Edit →</button>}>
          <div className="dream-wrap">
            <DreamScene dream={state.dream} stage={Math.min(5, lvl.level - 1)} />
            <div className="dream-char">
              <CharacterSvg c={state.character} level={lvl.level} size={120} />
            </div>
          </div>
          <div className="row between small">
            <span>
              Level {lvl.level} · {lvl.name}
            </span>
            <span>{doneActions} real-life actions logged</span>
          </div>
          <Bar value={lvl.into} max={lvl.span} label="XP to next level" />
        </Card>
      </div>

      <Card title="This month (forecast, month 1)" sub={`${prettyDate(start)} · simulated — no real money moves`} actions={<button className="link" onClick={() => go('math')}>Open the math →</button>}>
        <div className="stats">
          <Stat label="Take-home income" value={money(r1.income)} />
          <Stat label="Essentials + repayments" value={money(r1.essentials + r1.debtRepayments)} />
          <Stat label="Planned discretionary" value={money(r1.discretionary)} />
          <Stat label="Self-tax (levy)" value={money(r1.levy)} note={r1.rebate ? `rebate ${money(r1.rebate)} returned` : undefined} />
          <Stat label="Unspent money swept" value={money(r1.sweep)} />
          <Stat label="Total into plan" value={money(r1.toPlan)} tone="good" note="levy − rebate + sweep (never double-counted)" />
        </div>
        {r1.surplus < 0 && <p className="notice warn">Spending is above income this month. A deficit of {money(-r1.cash)} builds up and will be cleared before any goal is funded.</p>}
      </Card>

      <Card title="Goals at their deadlines (forecast)" actions={<button className="link" onClick={() => go('pots')}>Pots →</button>}>
        <div className="goal-list">
          {goals.map((g) => (
            <div key={g.goalId} className={`goal-row ${g.included ? '' : 'dim'}`}>
              <div className="row between">
                <strong>{g.name || g.kind}</strong>
                <span className="small muted">by {prettyDate(g.deadline)}</span>
              </div>
              <Bar value={g.fundedAtDeadline} max={g.target} label={`${g.name} funding at deadline`} tone={g.shortfallPct === 0 ? 'good' : ''} />
              <div className="row between small">
                <span>
                  {money(g.fundedAtDeadline)} of {money(g.target)} {g.kind === 'career' ? '(development budget)' : ''}
                </span>
                <span>{g.target === 0 ? 'No funding target' : g.firstHitMonth === null ? 'Not reached within 50 years' : g.firstHitMonth === 0 ? 'Already reached' : `First hit ${prettyDate(dateOfMonth(start, g.firstHitMonth))}`}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Net tracked assets: current habits vs your plan" sub="Cash + emergency reserve + goal pots − debts. Course costs are expenses; future wages are not assets." actions={<button className="link" onClick={() => go('compare')}>Compare →</button>}>
        <LineChart
          title="Net tracked assets over time"
          series={[
            { id: 'current', label: 'Current habits', color: 'var(--series-2)', dashed: true, points: series[0].points },
            { id: 'plan', label: 'Your plan', color: 'var(--series-1)', points: series[1].points },
          ]}
          markers={deadlineMarkers}
        />
        <p className="small muted">Plan net assets after {state.plan.horizonYears} years: {money(model.summary.netAssetsAtHorizon)} (forecast).</p>
      </Card>

      <Card title="Next on your route" actions={<button className="link" onClick={() => go('route')}>Full route →</button>}>
        <ul className="route-mini">
          {model.route
            .filter((i) => !i.completed && i.m >= 0)
            .slice(0, 5)
            .map((i) => (
              <li key={i.id}>
                <span className={`rtype t-${i.type}`}>{typeLabel(i.type)}</span>
                <span>{i.title}</span>
                <span className="muted small">{prettyDate(i.date)}</span>
              </li>
            ))}
        </ul>
      </Card>
      {plan.rows.some((r) => !r.reconciles) && <p className="notice warn">Reconciliation error detected — please report.</p>}
    </div>
  );
}

export function typeLabel(t: string) {
  return (
    { money: 'Money', action: 'Action', qualification: 'Condition', 'assumed-outcome': 'Assumed outcome', achievement: 'Achieved', warning: 'Warning' } as Record<string, string>
  )[t] ?? t;
}
