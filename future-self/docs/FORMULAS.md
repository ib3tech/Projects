# Future Self — formulas and engine rules

Every number in the app comes from one function: `simulate()` in `src/engine/simulate.ts`.
The dashboard, Delusion Meter, route, pots, career, comparison graph and "Open the math"
all read the results of the same runs, built once per state change by `buildModel()`
(`src/engine/model.ts`).

All money is held as **integer pence**. Every computation that can produce a fraction is rounded to the
penny, so each month reconciles exactly.

## Monthly timing (m = 1 … 600)

1. **Growth/loss** on opening pot balances: `g = round(balance × ((1 + annual)^(1/12) − 1))`.
   Invested pots use the investment return; the emergency reserve, career pot and cash-held life pot use the cash return.
   A negative opening cash balance (deficit) is charged `deficit APR`, because borrowing is not assumed to be free.
2. **Income** = absolute take-home of the active career stage + calendar adjustments (floored at 0).
3. **Debts**: interest is added to the balance, then the required repayment is paid from cash.
4. **Spending** = essentials + planned discretionary + lifestyle spending from extra income,
   where `lifestyle = (stage take-home − starting take-home) × (1 − share to goals)`.
5. `surplus = income − essentials − debt repayments − spending`. It goes into cash.
6. **Deficit first**: if cash was negative, a positive surplus repays it before anything else.
   `available = max(0, min(surplus, cash after surplus))`.
7. **Self-tax and sweep**
   - `levy_c = round(max(0, spend_c − allowance_c) × rate_c)` for unprotected optional categories (rate > 0).
   - `rebate_c = round(max(0, spend_c − allowance_c) × |rate_c|)` for charity (rate between −5% and 0).
   - `cap = available` (sweep) or `min(ceiling, available)` (manual).
   - `levy = min(Σ levy_c, cap)`, so it can never create an overdraft. `rebate = min(Σ rebate_c, levy)`.
   - `sweep = cap − levy`. `into plan = cap − rebate`. The rebate stays in cash as spendable money, so the sweep does not take it back.
   - Worked example: £500 available, £200 purchases, £40 levy and £260 swept gives **£300** into the plan, not £340.
8. **Emergency reserve** (never more than it still needs):
   - first: `min(into plan, need)`
   - alongside: `min(round(into plan × share), need)`
   - starter: fill the starter buffer first, then `share` of the rest.
9. **Goal pots** split the remainder by weights, with water-filling so no pot gets more than it needs.
   - By priority and deadline: `weight = priority × need ÷ months left to deadline`, recomputed every month.
   - Manual: the user's own percentages.
   - Money that has nowhere to go because every goal is funded stays in cash as *unallocated*.
10. **Career**: once the career pot holds the next stage's development budget, the budget is paid out as an expense.
    The stage's income starts at `max(earliest month, funded month + 1 + delay, previous stage start)`.
    In the no-pay-rise scenario the training is still paid, but income never changes.

## Reconciliation (checked every month)

```
opening tracked assets
+ income received
+ investment growth/loss
− actual spending
− training paid
− deficit interest
− debt repayments (moved to liabilities)
= closing tracked assets = cash + emergency + Σ pots
```

Debts are tracked as a separate liability: `opening + interest − repayments = closing`.

## Delusion Meter

```
shortfall_g = max(0, 1 − funded_g at deadline ÷ target_g)
score       = mean(shortfall_g over active goals with a target > 0) × 100
```

For the career goal, *funded* means development already paid plus the career pot balance, and *target* is the sum of
the stage development budgets. *First target hit* (the first month the forecast reaches the target) is reported
separately from *funded at deadline*. The score is a planning measure: it is not a probability of success and not a judgement of the person.

"Assumptions responsible" and "Changes that could close the gap" each re-run the same engine with one input changed.

## Comparison graph

The graph measures **net tracked assets** (cash + reserve + pots/investment account − debts).
Salary is never added in, and future wages are not treated as assets.

Every line shares the same starting balances, emergency settings, spending, take-home income, calendar changes and return assumption:

| Line | What changes |
|---|---|
| Your three-pot plan | Your plan as set up |
| Index investing | Plan money goes into one uncapped invested pot; no career stages |
| Career, then investing | Career budgets are paid first, then everything is invested |
| …no pay rise | Same, but the stage incomes never apply |
| Spending the money | The emergency share is still saved; the rest is spent |

The following are **not modelled**: inflation, fees, taxes on returns, currency effects, and changes in future living costs.
