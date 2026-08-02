import type { FinanceState } from "./finance-types";
import type { FinanceMetrics } from "./finance-utils";

/**
 * Multi-factor, explainable Financial Health Score.
 *
 * The previous score was a flat "start at 40 and add points" heuristic: it
 * could never fall below a floor, ignored debt entirely, and gave the user no
 * way to see WHY the number moved. This version scores independent factors
 * 0–100 each, then takes a weighted average — so every point is traceable to
 * a factor, and the UI can explain a change ("your debt ratio dropped").
 *
 * Factors are only included when the underlying data exists, and the weights
 * of the included factors are re-normalised. A user with no debt is not
 * punished for having no debt data, and a user with no investments is scored
 * on the factors they do have.
 */

export type HealthFactorKey =
  | "savingsRate"
  | "emergencyFund"
  | "debtRatio"
  | "cashFlow"
  | "investing"
  | "netWorthTrend"
  | "goals"
  | "spendingConsistency";

export interface HealthFactor {
  key: HealthFactorKey;
  label: string;
  /** 0–100 for this factor alone. */
  score: number;
  /** Relative importance in the blended score. */
  weight: number;
  /** One-sentence, plain-language explanation of this factor's score. */
  detail: string;
}

export interface HealthScoreResult {
  /** 0–100 blended score. */
  score: number;
  grade: "Excellent" | "Strong" | "Fair" | "At risk" | "Critical";
  factors: HealthFactor[];
  /** Factors dragging the score down the most, best-first to fix. */
  weakest: HealthFactor[];
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

/** Linear score: `at` floor -> 0, `to` ceiling -> 100. */
function ramp(value: number, floor: number, ceiling: number) {
  if (ceiling === floor) return value >= ceiling ? 100 : 0;
  return clamp(((value - floor) / (ceiling - floor)) * 100);
}

export function gradeFor(score: number): HealthScoreResult["grade"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Fair";
  if (score >= 30) return "At risk";
  return "Critical";
}

export function computeHealthScore(
  state: FinanceState,
  m: FinanceMetrics,
): HealthScoreResult | null {
  const hasAnyData =
    m.monthIncome > 0 ||
    m.monthExpenses > 0 ||
    m.availableCash !== 0 ||
    state.goals.length > 0 ||
    state.profile.debt > 0;

  // No data yet: a score would be fiction. The UI shows an empty state.
  if (!hasAnyData) return null;

  const factors: HealthFactor[] = [];
  const monthlyBurn = m.monthExpenses > 0 ? m.monthExpenses : m.prevExpenses;

  // ── Savings rate: 0% -> 0, 25%+ -> 100 ──────────────────────────────
  if (m.monthIncome > 0) {
    const s = ramp(m.savingsRate, 0, 0.25);
    factors.push({
      key: "savingsRate",
      label: "Savings rate",
      score: s,
      weight: 20,
      detail:
        m.savingsRate <= 0
          ? "You spent everything you earned this month, or more."
          : `You kept ${(m.savingsRate * 100).toFixed(0)}% of your income this month.`,
    });
  }

  // ── Emergency fund: months of expenses covered by cash. 0 -> 0, 6 -> 100 ──
  if (monthlyBurn > 0) {
    const months = m.availableCash / monthlyBurn;
    factors.push({
      key: "emergencyFund",
      label: "Emergency fund",
      score: ramp(months, 0, 6),
      weight: 20,
      detail:
        months <= 0
          ? "Your cash accounts cover none of your monthly spending."
          : `Your cash covers about ${months.toFixed(1)} months of spending (6 is the target).`,
    });
  }

  // ── Debt-to-income: 0x annual income -> 100, 2x+ -> 0 ────────────────
  const annualIncome = (m.monthIncome || m.prevIncome) * 12;
  if (state.profile.debt > 0 || annualIncome > 0) {
    const ratio =
      annualIncome > 0 ? state.profile.debt / annualIncome : state.profile.debt > 0 ? 2 : 0;
    factors.push({
      key: "debtRatio",
      label: "Debt load",
      score: clamp(100 - ramp(ratio, 0, 2)),
      weight: 15,
      detail:
        state.profile.debt <= 0
          ? "You carry no recorded debt."
          : `Your debt is ${ratio.toFixed(2)}× your annual income.`,
    });
  }

  // ── Cash flow: surplus vs expenses ───────────────────────────────────
  if (m.monthIncome > 0 || m.monthExpenses > 0) {
    const net = m.monthIncome - m.monthExpenses;
    const base = m.monthExpenses > 0 ? m.monthExpenses : m.monthIncome;
    factors.push({
      key: "cashFlow",
      label: "Cash flow",
      score: ramp(net / (base || 1), -0.5, 0.5),
      weight: 15,
      detail:
        net >= 0
          ? "You are running a monthly surplus."
          : "You are spending more than you earn this month.",
    });
  }

  // ── Investing habit: share of net worth actually invested ────────────
  const invested = state.accounts
    .filter((a) => a.type === "investment")
    .reduce((s, a) => s + a.balance, 0);
  const positiveAssets = state.accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  if (positiveAssets > 0) {
    const share = invested / positiveAssets;
    factors.push({
      key: "investing",
      label: "Investing",
      score: ramp(share, 0, 0.4),
      weight: 10,
      detail:
        invested <= 0
          ? "None of your money is invested for growth yet."
          : `${(share * 100).toFixed(0)}% of your assets are invested.`,
    });
  }

  // ── Net worth trend: this month's surplus vs last month's ────────────
  if (m.prevIncome > 0 || m.prevExpenses > 0) {
    const now = m.monthIncome - m.monthExpenses;
    const prev = m.prevIncome - m.prevExpenses;
    factors.push({
      key: "netWorthTrend",
      label: "Net worth trend",
      score: now >= prev ? (now > prev ? 100 : 70) : ramp(now - prev, -Math.abs(prev || 1), 0),
      weight: 10,
      detail:
        now >= prev
          ? "You are building wealth faster than last month."
          : "You built less wealth this month than last month.",
    });
  }

  // ── Goals: average completion across active goals ────────────────────
  if (state.goals.length > 0) {
    const avg =
      state.goals.reduce((s, g) => s + (g.target > 0 ? Math.min(1, g.saved / g.target) : 0), 0) /
      state.goals.length;
    factors.push({
      key: "goals",
      label: "Goal progress",
      score: clamp(avg * 100),
      weight: 10,
      detail: `Your goals are ${(avg * 100).toFixed(0)}% funded on average.`,
    });
  }

  // ── Spending consistency: month-over-month volatility ────────────────
  if (m.prevExpenses > 0 && m.monthExpenses > 0) {
    const swing = Math.abs(m.monthExpenses - m.prevExpenses) / m.prevExpenses;
    factors.push({
      key: "spendingConsistency",
      label: "Spending consistency",
      score: clamp(100 - ramp(swing, 0, 0.5)),
      weight: 10,
      detail: `Your spending moved ${(swing * 100).toFixed(0)}% versus last month.`,
    });
  }

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const score =
    totalWeight === 0
      ? 0
      : Math.round(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight);

  const weakest = [...factors]
    .filter((f) => f.score < 60)
    .sort((a, b) => a.score * a.weight - b.score * b.weight)
    .slice(0, 3);

  return { score, grade: gradeFor(score), factors, weakest };
}
