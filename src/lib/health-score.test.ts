import { describe, it, expect } from "vitest";
import { computeHealthScore, gradeFor } from "./health-score";
import { forecastCashFlow, expandRecurring } from "./forecast";
import { computeMetrics } from "./finance-utils";
import type { FinanceState, Transaction, Account, RecurringTransaction } from "./finance-types";

function makeState(o: Partial<FinanceState> = {}): FinanceState {
  return {
    profile: {
      currency: "KSh",
      monthlyIncome: 0,
      fixedExpenses: 0,
      variableExpenses: 0,
      savings: 0,
      investments: 0,
      debt: 0,
      vision: [],
      onboarded: true,
    },
    accounts: [],
    transactions: [],
    goals: [],
    reviews: [],
    budgets: [],
    recurring: [],
    opportunities: [],
    incomeSources: [],
    inbox: [],
    decisions: [],
    allocations: [],
    ...o,
  };
}

function acct(o: Partial<Account> = {}): Account {
  return { id: "a1", name: "Bank", type: "bank", balance: 0, currency: "KSh", ...o };
}

function tx(o: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    type: "expense",
    amount: 0,
    category: "Food",
    accountId: "a1",
    date: thisMonth(1),
    ...o,
  };
}

function thisMonth(daysBack = 0): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
  const cand = new Date(now.getTime() - daysBack * 86_400_000);
  return (cand < start ? start : cand).toISOString();
}

// ─── health score ───────────────────────────────────────────────────────

describe("computeHealthScore", () => {
  it("returns null with no financial data at all, rather than inventing a score", () => {
    const state = makeState();
    expect(computeHealthScore(state, computeMetrics(state))).toBeNull();
  });

  it("scores a strong profile above a weak one", () => {
    const strong = makeState({
      accounts: [acct({ balance: 600_000 }), acct({ id: "a2", type: "investment", balance: 400_000 })],
      transactions: [
        tx({ type: "income", amount: 200_000, accountId: "a1" }),
        tx({ type: "expense", amount: 100_000, accountId: "a1" }),
      ],
    });
    const weak = makeState({
      profile: { ...makeState().profile, debt: 3_000_000 },
      accounts: [acct({ balance: 2_000 })],
      transactions: [
        tx({ type: "income", amount: 100_000, accountId: "a1" }),
        tx({ type: "expense", amount: 140_000, accountId: "a1" }),
      ],
    });
    const s = computeHealthScore(strong, computeMetrics(strong))!;
    const w = computeHealthScore(weak, computeMetrics(weak))!;
    expect(s.score).toBeGreaterThan(w.score);
    expect(s.score).toBeGreaterThan(60);
  });

  it("can fall below 40 — the old score had a hard floor that hid real distress", () => {
    const state = makeState({
      profile: { ...makeState().profile, debt: 5_000_000 },
      accounts: [acct({ balance: -20_000 })],
      transactions: [
        tx({ type: "income", amount: 50_000, accountId: "a1" }),
        tx({ type: "expense", amount: 120_000, accountId: "a1" }),
      ],
    });
    const r = computeHealthScore(state, computeMetrics(state))!;
    expect(r.score).toBeLessThan(40);
    expect(r.grade === "At risk" || r.grade === "Critical").toBe(true);
  });

  it("never returns a score outside 0–100", () => {
    const state = makeState({
      accounts: [acct({ balance: 99_000_000 })],
      transactions: [tx({ type: "income", amount: 10_000_000, accountId: "a1" })],
    });
    const r = computeHealthScore(state, computeMetrics(state))!;
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("omits factors whose underlying data does not exist", () => {
    const state = makeState({ accounts: [acct({ balance: 10_000 })] });
    const r = computeHealthScore(state, computeMetrics(state))!;
    expect(r.factors.some((f) => f.key === "goals")).toBe(false);
    expect(r.factors.some((f) => f.key === "spendingConsistency")).toBe(false);
  });

  it("surfaces the weakest factors so the UI can say what to fix", () => {
    const state = makeState({
      profile: { ...makeState().profile, debt: 2_000_000 },
      accounts: [acct({ balance: 1_000 })],
      transactions: [
        tx({ type: "income", amount: 80_000, accountId: "a1" }),
        tx({ type: "expense", amount: 79_000, accountId: "a1" }),
      ],
    });
    const r = computeHealthScore(state, computeMetrics(state))!;
    expect(r.weakest.length).toBeGreaterThan(0);
    r.weakest.forEach((f) => expect(f.score).toBeLessThan(60));
  });

  it("grades map to the documented bands", () => {
    expect(gradeFor(90)).toBe("Excellent");
    expect(gradeFor(70)).toBe("Strong");
    expect(gradeFor(50)).toBe("Fair");
    expect(gradeFor(30)).toBe("At risk");
    expect(gradeFor(10)).toBe("Critical");
  });
});

// ─── forecasting ────────────────────────────────────────────────────────

function rule(o: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: "r1",
    type: "expense",
    amount: 10_000,
    category: "Rent",
    accountId: "a1",
    frequency: "monthly",
    anchor: 1,
    nextDate: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    active: true,
    createdAt: new Date().toISOString(),
    ...o,
  };
}

describe("expandRecurring", () => {
  it("expands a monthly rule once per month across the horizon", () => {
    const from = new Date();
    const to = new Date(from.getTime() + 100 * 86_400_000);
    const occ = expandRecurring(rule(), from, to);
    expect(occ.length).toBe(4);
    occ.forEach((o) => expect(o.amount).toBe(-10_000));
  });

  it("treats income rules as positive and transfers as net zero", () => {
    const from = new Date();
    const to = new Date(from.getTime() + 30 * 86_400_000);
    expect(expandRecurring(rule({ type: "income" }), from, to)[0]!.amount).toBe(10_000);
    expect(expandRecurring(rule({ type: "transfer" }), from, to)).toHaveLength(0);
  });

  it("skips inactive rules", () => {
    const from = new Date();
    expect(expandRecurring(rule({ active: false }), from, new Date(from.getTime() + 60 * 86_400_000)))
      .toHaveLength(0);
  });

  it("catches up a stale nextDate instead of emitting a year of backdated hits", () => {
    const from = new Date();
    const to = new Date(from.getTime() + 40 * 86_400_000);
    const occ = expandRecurring(
      rule({ nextDate: new Date(from.getTime() - 400 * 86_400_000).toISOString() }),
      from,
      to,
    );
    expect(occ.length).toBeLessThanOrEqual(2);
    occ.forEach((o) => expect(new Date(o.date).getTime()).toBeGreaterThanOrEqual(from.getTime() - 86_400_000));
  });
});

describe("forecastCashFlow", () => {
  it("starts from cash accounts only, excluding investments", () => {
    const state = makeState({
      accounts: [acct({ balance: 100_000 }), acct({ id: "a2", type: "investment", balance: 500_000 })],
    });
    expect(forecastCashFlow(state, { days: 30 }).startingBalance).toBe(100_000);
  });

  it("subtracts scheduled bills on the day they land", () => {
    const state = makeState({
      accounts: [acct({ balance: 100_000 })],
      recurring: [rule({ amount: 25_000 })],
    });
    const f = forecastCashFlow(state, { days: 30 });
    expect(f.horizons.find((h) => h.days === 30)!.balance).toBe(75_000);
    expect(f.points.filter((p) => p.scheduled !== 0)).toHaveLength(1);
  });

  it("flags the day the balance runs out", () => {
    const state = makeState({
      accounts: [acct({ balance: 10_000 })],
      recurring: [rule({ amount: 40_000 })],
    });
    const f = forecastCashFlow(state, { days: 60 });
    expect(f.shortfallDate).not.toBeNull();
  });

  it("returns no shortfall when the projection stays positive", () => {
    const state = makeState({
      accounts: [acct({ balance: 500_000 })],
      recurring: [rule({ type: "income", amount: 100_000 })],
    });
    expect(forecastCashFlow(state, { days: 90 }).shortfallDate).toBeNull();
  });

  it("marks low confidence when there is barely any transaction history", () => {
    const state = makeState({ accounts: [acct({ balance: 50_000 })] });
    expect(forecastCashFlow(state, { days: 30 }).lowConfidence).toBe(true);
  });

  it("does not double-count money that a recurring rule already covers", () => {
    // One historic salary payment AND a recurring rule for the same salary.
    const salaryDate = new Date(Date.now() - 20 * 86_400_000).toISOString();
    const withBoth = makeState({
      accounts: [acct({ balance: 0 })],
      transactions: [tx({ type: "income", amount: 60_000, date: salaryDate })],
      recurring: [rule({ type: "income", amount: 60_000 })],
    });
    const f = forecastCashFlow(withBoth, { days: 30 });
    // Drift should be ~0, so 30 days ≈ one scheduled salary, not two.
    expect(Math.abs(f.dailyDrift)).toBeLessThan(500);
    expect(f.horizons.find((h) => h.days === 30)!.balance).toBeLessThan(90_000);
  });

  it("produces one point per day and clamps horizons to the requested window", () => {
    const state = makeState({ accounts: [acct({ balance: 1_000 })] });
    const f = forecastCashFlow(state, { days: 45 });
    expect(f.points).toHaveLength(45);
    expect(f.horizons.map((h) => h.days)).toEqual([7, 30]);
  });
});
