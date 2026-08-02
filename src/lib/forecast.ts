import type { FinanceState, RecurringTransaction } from "./finance-types";

/**
 * Cash-flow forecasting.
 *
 * Two signals are combined:
 *  1. Known, scheduled money — active recurring transactions, expanded
 *     occurrence by occurrence across the horizon. These are facts, not guesses.
 *  2. Unscheduled drift — the average daily net of the last 90 days of real
 *     transactions, excluding anything already covered by a recurring rule
 *     and excluding opening balances.
 *
 * The result is a daily balance projection plus the headline questions:
 * where will I be in 7 / 30 / 90 / 365 days, and do I run out of money first?
 */

const DAY = 86_400_000;

export interface ForecastPoint {
  date: string; // ISO date (yyyy-mm-dd)
  balance: number;
  /** Scheduled money landing on this exact day (signed). */
  scheduled: number;
}

export interface CashFlowForecast {
  startingBalance: number;
  points: ForecastPoint[];
  horizons: { days: number; balance: number; change: number }[];
  /** First day the projected balance goes negative, or null if it never does. */
  shortfallDate: string | null;
  /** Average net movement per day used for unscheduled drift. */
  dailyDrift: number;
  /** True when there is too little history to project drift honestly. */
  lowConfidence: boolean;
}

function iso(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

/** Signed daily amounts for every occurrence of a recurring rule in [from, to]. */
export function expandRecurring(
  rule: RecurringTransaction,
  from: Date,
  to: Date,
): { date: string; amount: number }[] {
  if (!rule.active) return [];
  const out: { date: string; amount: number }[] = [];
  const sign = rule.type === "income" ? 1 : rule.type === "expense" ? -1 : 0;
  if (sign === 0) return []; // transfers move money between own accounts — net zero

  let cursor = new Date(rule.nextDate);
  // Guard against a stale nextDate far in the past.
  let safety = 0;
  while (cursor < from && safety++ < 2_000) {
    cursor =
      rule.frequency === "weekly"
        ? new Date(cursor.getTime() + 7 * DAY)
        : new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  }
  safety = 0;
  while (cursor <= to && safety++ < 2_000) {
    out.push({ date: iso(cursor), amount: sign * rule.amount });
    cursor =
      rule.frequency === "weekly"
        ? new Date(cursor.getTime() + 7 * DAY)
        : new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
  }
  return out;
}

export function forecastCashFlow(
  state: FinanceState,
  opts: { days?: number; now?: Date } = {},
): CashFlowForecast {
  const days = opts.days ?? 365;
  const now = opts.now ?? new Date();
  const end = new Date(now.getTime() + days * DAY);

  const startingBalance = state.accounts
    .filter((a) => a.type !== "investment")
    .reduce((s, a) => s + a.balance, 0);

  // ── Scheduled money ──────────────────────────────────────────────────
  const scheduledByDate = new Map<string, number>();
  for (const rule of state.recurring ?? []) {
    for (const occ of expandRecurring(rule, now, end)) {
      scheduledByDate.set(occ.date, (scheduledByDate.get(occ.date) ?? 0) + occ.amount);
    }
  }

  // ── Unscheduled drift from the last 90 days ──────────────────────────
  const windowStart = now.getTime() - 90 * DAY;
  let netHistoric = 0;
  let observedDays = 0;
  let earliest = Infinity;
  for (const t of state.transactions) {
    if (t.isOpeningBalance) continue;
    const ts = new Date(t.date).getTime();
    if (ts < windowStart || ts > now.getTime()) continue;
    earliest = Math.min(earliest, ts);
    if (t.type === "income") netHistoric += t.amount;
    else if (t.type === "expense") netHistoric -= t.amount;
  }
  if (earliest !== Infinity) {
    observedDays = Math.max(1, Math.round((now.getTime() - earliest) / DAY));
  }

  // Money that is ALREADY represented by a recurring rule must not be counted
  // twice — subtract the recurring rules' equivalent daily rate from drift.
  const recurringDailyRate = (state.recurring ?? [])
    .filter((r) => r.active && r.type !== "transfer")
    .reduce((s, r) => {
      const per = r.frequency === "weekly" ? r.amount / 7 : (r.amount * 12) / 365;
      return s + (r.type === "income" ? per : -per);
    }, 0);

  // Averaging over a window shorter than a month makes a single monthly
  // salary look like a huge daily inflow, so the denominator is floored at
  // 30 days: short history projects conservatively rather than optimistically.
  const averagingDays = Math.max(30, observedDays);
  const rawDrift = observedDays > 0 ? netHistoric / averagingDays : 0;
  const dailyDrift = observedDays > 0 ? rawDrift - recurringDailyRate : 0;
  const lowConfidence = observedDays < 14;

  // ── Project day by day ───────────────────────────────────────────────
  const points: ForecastPoint[] = [];
  let balance = startingBalance;
  let shortfallDate: string | null = null;

  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() + i * DAY);
    const key = iso(d);
    const scheduled = scheduledByDate.get(key) ?? 0;
    balance += scheduled + dailyDrift;
    if (shortfallDate === null && balance < 0) shortfallDate = key;
    points.push({ date: key, balance: Math.round(balance), scheduled });
  }

  const at = (n: number) => points[Math.min(points.length, n) - 1]?.balance ?? startingBalance;
  const horizons = [7, 30, 90, 365]
    .filter((h) => h <= days)
    .map((h) => ({ days: h, balance: at(h), change: at(h) - startingBalance }));

  return {
    startingBalance,
    points,
    horizons,
    shortfallDate,
    dailyDrift,
    lowConfidence,
  };
}
