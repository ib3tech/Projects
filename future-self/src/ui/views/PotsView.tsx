import { dateOfMonth, prettyDate } from '../../engine/profile';
import { useStore } from '../../state/store';
import { Card, Field, MoneyInput, PctInput, ProvTag, Seg, useMoney } from '../components/inputs';
import { LineChart } from '../components/LineChart';

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

export function PotsView() {
  const { state, model, update } = useStore();
  const money = useMoney();
  const plan = state.plan;
  const res = model.results.plan;
  const h = model.horizon;
  const goals = state.profile.goals;
  const ids = ['emergency', ...goals.map((g) => g.id)];
  const names: Record<string, string> = { emergency: 'Emergency reserve', ...Object.fromEntries(goals.map((g) => [g.id, g.name || g.kind])) };
  const bal = (id: string, m: number) => {
    if (m === 0) return id === 'emergency' ? res.opening.emergency : res.opening.pots[id] ?? 0;
    const r = res.rows[m - 1];
    return id === 'emergency' ? r.emergency : r.pots[id] ?? 0;
  };
  const series = ids.map((id, i) => ({ id, label: names[id], color: COLORS[i], points: Array.from({ length: h + 1 }, (_, m) => ({ m, v: bal(id, m) })) }));
  const years = Array.from({ length: Math.min(state.plan.horizonYears, 50) }, (_, y) => y + 1);
  const conf = { emergency: 'confirmed' as const };

  return (
    <div className="stack">
      <Card title="Emergency fund" sub="Kept separate from all three goal pots. Once the target is reached, its share is redirected to the goals.">
        <div className="grid2">
          <Field label="Reserve target" prov={state.provenance.emergency ?? 'assumption'}>
            <MoneyInput value={plan.emergency.target} onChange={(v) => update((d) => void (d.plan.emergency.target = v), conf)} />
          </Field>
          <Field label="Priority">
            <Seg
              value={plan.emergency.mode}
              onChange={(v) => update((d) => void (d.plan.emergency.mode = v), conf)}
              options={[
                { v: 'first', label: 'First' },
                { v: 'alongside', label: 'Alongside' },
                { v: 'starter', label: 'Starter, then split' },
              ]}
            />
          </Field>
          {plan.emergency.mode === 'starter' && (
            <Field label="Starter buffer">
              <MoneyInput value={plan.emergency.starter} onChange={(v) => update((d) => void (d.plan.emergency.starter = v), conf)} />
            </Field>
          )}
          {plan.emergency.mode !== 'first' && (
            <Field label="Share of plan money to the reserve">
              <PctInput value={plan.emergency.share} min={0} max={100} step={5} onChange={(v) => update((d) => void (d.plan.emergency.share = v), conf)} />
            </Field>
          )}
        </div>
        <p className="small muted">
          {res.events.find((e) => e.type === 'emergencyComplete') ? `Forecast: reserve complete ${prettyDate(dateOfMonth(state.profile.startDate, res.events.find((e) => e.type === 'emergencyComplete')!.m))}.` : plan.emergency.target <= res.opening.emergency ? 'Reserve already at target.' : 'Reserve not completed within 50 years under these assumptions.'}
        </p>
      </Card>

      <Card title="How goal money is split" sub="After the emergency share. A pot never receives more than it still needs; a fully funded goal's share is redistributed, and money with nowhere to go stays visible as unallocated cash.">
        <Seg
          value={plan.allocation.method}
          onChange={(v) => update((d) => void (d.plan.allocation.method = v))}
          options={[
            { v: 'weighted', label: 'By priority & deadline' },
            { v: 'manual', label: 'My own percentages' },
          ]}
        />
        {plan.allocation.method === 'weighted' ? (
          <p className="small muted">Weight = priority × money still needed ÷ months left to the deadline — recomputed every month, so the proportions change as goals progress.</p>
        ) : (
          <div className="grid3">
            {goals.map((g) => (
              <Field key={g.id} label={names[g.id]}>
                <PctInput value={plan.allocation.manualShares[g.id] ?? 0} min={0} max={100} step={5} onChange={(v) => update((d) => void (d.plan.allocation.manualShares[g.id] = v))} />
              </Field>
            ))}
          </div>
        )}
        <h4>Proportions over time (share of each year's plan money)</h4>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Year</th>
                {ids.map((id) => (
                  <th key={id}>{names[id]}</th>
                ))}
                <th>Unallocated</th>
                <th>Total into plan</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const rows = res.rows.slice((y - 1) * 12, y * 12);
                const tot = rows.reduce((a, r) => a + r.toPlan, 0);
                const part = (id: string) => rows.reduce((a, r) => a + (id === 'emergency' ? r.toEmergency : r.toPots[id] ?? 0), 0);
                const over = rows.reduce((a, r) => a + r.overflow, 0);
                const pct = (v: number) => (tot > 0 ? `${((v / tot) * 100).toFixed(0)}%` : '—');
                return (
                  <tr key={y}>
                    <td>{y}</td>
                    {ids.map((id) => (
                      <td key={id}>{pct(part(id))}</td>
                    ))}
                    <td>{pct(over)}</td>
                    <td>{money(tot)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Pot balances (forecast)" sub="Each pound sits in exactly one pot. The career pot empties when development is paid for — that money becomes an expense.">
        <LineChart title="Pot balances over time" series={series} />
        <ul className="small assumption-list">
          {goals.map((g) => (
            <li key={g.id}>
              {names[g.id]}: held as {g.kind === 'financial' ? 'invested' : g.kind === 'career' ? 'cash' : g.vehicle} <ProvTag p="assumption" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
