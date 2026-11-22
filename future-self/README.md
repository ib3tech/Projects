# Future Self — prototype

A personalised financial-planning web app. It turns money a person does not spend, voluntary "self-tax" and career
development into progress toward that person's own goals.

> **Simulated only.** Accounts, balances, achievements and transfers are all simulated. There is no bank connection and no money moves.
> Data stays in the browser's local storage.

## Run

```bash
cd future-self
npm install
npm run dev        # http://localhost:5173
npm test           # engine test suite (vitest)
npm run build      # type-check and build into dist/
```

On the sign-up screen, choose **Load fictional demo persona** to review the app with a clearly labelled made-up profile, or sign up to work through the questionnaire with your own answers.

## Structure

```
src/engine/          pure calculation logic, no React
  simulate.ts        THE month-by-month engine (the only calculation path)
  selfTax.ts         levy, rebate, purchase explanation
  allocate.ts        emergency allocation, water-filling and sequential pot allocation
  scenarios.ts       builds every scenario from one profile and plan (shared assumptions)
  delusion.ts        Delusion Meter score, sensitivities and gap-closing suggestions
  aiPlanner.ts       self-tax planner: prompt for Claude, validation, engine evaluation, built-in fallback
  route.ts           personalised route and timeline
  gamification.ts    quests, XP and levels (actions only, never money)
  suggest.ts         suggested rates, allowances and plan (all labelled assumptions)
  model.ts           buildModel(): the single derived model every view reads
  profile.ts         domain types (profile, plan, goals, career stages)
  __tests__/         acceptance tests
src/state/store.tsx  React context and localStorage persistence
src/ui/              presentation only (views and components)
docs/FORMULAS.md     documented formulas and timing
```

## AI self-tax planner

On the hosted page, the Self-tax screen's planner asks Claude to budget the month and propose self-tax rates and a payday set-aside. Claude checks its drafts with the app's own engine, the app validates the result, and the person applies it or not. Run locally, the planner falls back to a clearly labelled built-in rules-based planner.

## Tested acceptance cases (`src/engine/__tests__/engine.test.ts`)

- The £500 / £200 example: £40 levy and £260 swept make £300, never £340
- With a full sweep, rates and allowances change the split but not the total
- Zero income, and spending above income (the deficit costs the assumed APR)
- A deficit is repaid before any saving
- Allowances above spending, and protected or zero-rated categories
- Charity rebates larger than the available levies, the −5% clamp, and the rebate being excluded from the sweep
- Career funding, the delay, the earliest date, absolute (not stacked) salaries, and the share of extra income
- No pay rise; calendar income changes applied in every scenario
- The emergency fund completing and its share being redistributed; a fully funded goal's share being redistributed
- Negative returns; first target hit compared with funding at the deadline
- Targets already reached; an empty profile does not get a fake score; targets that take decades
- Identical values across the dashboard, meter, chart series and math rows
- Every month of every scenario reconciles to the penny
