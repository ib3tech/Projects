import { dateOfMonth, prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { EngineChart, SERIES_COLORS } from '../Chart';
import { Card, Choice, Field, MoneyInput, PctInput, ProvTag, TableWrap, useMoney } from '../kit';

export function Pots() {
  const { state, model, update } = useStore();
  const money = useMoney();
  const plan = state.plan;
  const res = model.results.plan;
  const goals = state.profile.goals;
  const ids = ['emergency', ...goals.map((g) => g.id)];
  const names: Record<string, string> = { emergency: 'Emergency reserve', ...Object.fromEntries(goals.map((g) => [g.id, g.name || g.kind])) };
  const colors = ['#7d8a96', SERIES_COLORS.plan, SERIES_COLORS.index, SERIES_COLORS.career];
  const bal = (id: string, m: number) => (m === 0 ? (id === 'emergency' ? res.opening.emergency : res.opening.pots[id] ?? 0) : id === 'emergency' ? res.rows[m - 1].emergency : res.rows[m - 1].pots[id] ?? 0);
  const series = ids.map((id, i) => ({ id, label: names[id], color: colors[i], points: Array.from({ length: model.horizon + 1 }, (_, m) => ({ m, v: bal(id, m) })) }));
  const done = res.events.find((e) => e.type === 'emergencyComplete');
  const conf = { emergency: 'confirmed' as const };

  return (
    <div className="flex flex-col gap-4">
      <Card eyebrow="Your safety net" title="Emergency fund" sub="Kept separate from all three goal pots. Once it reaches its target, its share flows to your goals." actions={<ProvTag p={state.provenance.emergency ?? 'assumption'} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Reserve target"><MoneyInput value={plan.emergency.target} onChange={(v) => update((d) => void (d.plan.emergency.target = v), conf)} /></Field>
          <Field label="Priority">
            <Choice value={plan.emergency.mode} onChange={(v) => update((d) => void (d.plan.emergency.mode = v), conf)} options={[{ v: 'first', label: 'First' }, { v: 'alongside', label: 'Alongside' }, { v: 'starter', label: 'Starter, then split' }]} />
          </Field>
          {plan.emergency.mode === 'starter' && <Field label="Starter buffer"><MoneyInput value={plan.emergency.starter} onChange={(v) => update((d) => void (d.plan.emergency.starter = v), conf)} /></Field>}
          {plan.emergency.mode !== 'first' && <Field label="Share of plan money to the reserve"><PctInput value={plan.emergency.share} min={0} max={100} step={5} onChange={(v) => update((d) => void (d.plan.emergency.share = v), conf)} /></Field>}
        </div>
        <p className="mt-3 text-sm text-muted">{done ? `Forecast: reserve complete ${prettyDate(dateOfMonth(state.profile.startDate, done.m))}.` : plan.emergency.target <= res.opening.emergency ? 'Reserve already at target.' : 'Reserve not completed within 50 years under these assumptions.'}</p>
      </Card>

      <Card eyebrow="Three pots" title="How goal money is split" sub="A pot never gets more than it needs; a funded goal's share is redistributed. Money with nowhere to go stays visible as unallocated cash.">
        <Choice value={plan.allocation.method} onChange={(v) => update((d) => void (d.plan.allocation.method = v))} options={[{ v: 'weighted', label: 'By priority & deadline' }, { v: 'manual', label: 'My own percentages' }]} />
        {plan.allocation.method === 'weighted' ? (
          <p className="mt-2 text-xs text-muted">Weight = priority × money still needed ÷ months to deadline — recomputed monthly, so proportions change as goals progress.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {goals.map((g) => <Field key={g.id} label={names[g.id]}><PctInput value={plan.allocation.manualShares[g.id] ?? 0} min={0} max={100} step={5} onChange={(v) => update((d) => void (d.plan.allocation.manualShares[g.id] = v))} /></Field>)}
          </div>
        )}
        <div className="eyebrow mb-1 mt-5">Proportions over time</div>
        <TableWrap>
          <table className="table-data">
            <thead><tr><th>Year</th>{ids.map((id) => <th key={id}>{names[id]}</th>)}<th>Unallocated</th><th>Into plan</th></tr></thead>
            <tbody>
              {Array.from({ length: Math.min(plan.horizonYears, 50) }, (_, y) => y + 1).map((y) => {
                const rows = res.rows.slice((y - 1) * 12, y * 12);
                const tot = rows.reduce((a, r) => a + r.toPlan, 0);
                const part = (id: string) => rows.reduce((a, r) => a + (id === 'emergency' ? r.toEmergency : r.toPots[id] ?? 0), 0);
                const pct = (v: number) => (tot > 0 ? `${Math.round((v / tot) * 100)}%` : '—');
                return <tr key={y}><td>{y}</td>{ids.map((id) => <td key={id}>{pct(part(id))}</td>)}<td>{pct(rows.reduce((a, r) => a + r.overflow, 0))}</td><td>{money(tot)}</td></tr>;
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card eyebrow="Forecast" title="Pot balances" sub="Each pound sits in one pot only. The career pot empties when development is paid for — that money becomes an expense.">
        <EngineChart title="Pot balances over time" series={series} />
      </Card>
    </div>
  );
}
