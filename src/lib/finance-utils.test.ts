import { describe, it, expect } from "vitest";
import {
  computeMetrics,
  futureValue,
  computeSafeToSpend,
  parseMpesaMessages,
  parseCsvRows,
  computeWeekSummary,
  monthlySeries,
  computePipelineMetrics,
  computeInvestmentSummary,
} from "./finance-utils";
import type { FinanceState, Transaction, Account } from "./finance-types";

// ─── Shared test fixtures ──────────────────────────────────────────────

function makeState(overrides: Partial<FinanceState> = {}): FinanceState {
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
      onboarded: false,
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
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "a1",
    name: "Test account",
    type: "bank",
    balance: 0,
    currency: "KSh",
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    type: "expense",
    amount: 0,
    category: "Other",
    accountId: "a1",
    date: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

// ─── computeMetrics ─────────────────────────────────────────────────────

describe("computeMetrics", () => {
  it("excludes investment accounts from availableCash but includes them in netWorth", () => {
    const state = makeState({
      accounts: [
        makeAccount({ id: "bank", type: "bank", balance: 10_000 }),
        makeAccount({ id: "inv", type: "investment", balance: 5_000 }),
      ],
    });
    const m = computeMetrics(state);
    expect(m.availableCash).toBe(10_000);
    expect(m.netWorth).toBe(15_000);
  });

  it("subtracts profile debt from net worth", () => {
    const state = makeState({
      accounts: [makeAccount({ balance: 10_000 })],
      profile: {
        currency: "KSh",
        monthlyIncome: 0,
        fixedExpenses: 0,
        variableExpenses: 0,
        savings: 0,
        investments: 0,
        debt: 3_000,
        vision: [],
        onboarded: false,
      },
    });
    expect(computeMetrics(state).netWorth).toBe(7_000);
  });

  it("does not count profile.investments toward net worth — real investment accounts are the source of truth, not the legacy onboarding figure", () => {
    // Regression test: this field used to be added on top of real
    // investment account balances, producing a phantom Net Worth number
    // for anyone with no investment accounts at all — untraceable to any
    // account or transaction, and with no UI to edit or clear it.
    const state = makeState({
      accounts: [], // no investment accounts
      profile: {
        currency: "KSh",
        monthlyIncome: 0,
        fixedExpenses: 0,
        variableExpenses: 0,
        savings: 0,
        investments: 3_000,
        debt: 0,
        vision: [],
        onboarded: true,
      },
    });
    expect(computeMetrics(state).netWorth).toBe(0);
  });

  it("only counts this month's transactions toward monthIncome/monthExpenses", () => {
    const state = makeState({
      transactions: [
        makeTx({ type: "income", amount: 50_000, date: daysAgo(2) }),
        makeTx({ type: "expense", amount: 5_000, category: "Food", date: daysAgo(2) }),
        // A transaction from ~60 days ago should not count toward this month.
        makeTx({ type: "expense", amount: 99_999, category: "Food", date: daysAgo(60) }),
      ],
    });
    const m = computeMetrics(state);
    expect(m.monthIncome).toBe(50_000);
    expect(m.monthExpenses).toBe(5_000);
  });

  it("aggregates expenses by category for the current month only", () => {
    const state = makeState({
      transactions: [
        makeTx({ type: "expense", amount: 1_000, category: "Food", date: daysAgo(1) }),
        makeTx({ type: "expense", amount: 500, category: "Food", date: daysAgo(1) }),
        makeTx({ type: "expense", amount: 2_000, category: "Transport", date: daysAgo(1) }),
      ],
    });
    const m = computeMetrics(state);
    expect(m.byCategory.Food).toBe(1_500);
    expect(m.byCategory.Transport).toBe(2_000);
  });

  it("computes a zero savings rate when there is no income, instead of dividing by zero", () => {
    const state = makeState({
      transactions: [makeTx({ type: "expense", amount: 1_000, date: daysAgo(1) })],
    });
    expect(computeMetrics(state).savingsRate).toBe(0);
  });

  it("excludes opening-balance transactions from monthIncome — they aren't real cash flow", () => {
    const state = makeState({
      transactions: [
        makeTx({
          type: "income",
          amount: 200_000,
          date: daysAgo(1),
          isOpeningBalance: true,
        }),
        makeTx({ type: "income", amount: 5_000, date: daysAgo(1) }),
      ],
    });
    const m = computeMetrics(state);
    expect(m.monthIncome).toBe(5_000);
  });
});

// ─── futureValue ────────────────────────────────────────────────────────

describe("futureValue", () => {
  it("returns the principal unchanged at a zero rate", () => {
    expect(futureValue(10_000, 0, 5, "annually")).toBe(10_000);
  });

  it("compounds annually as expected", () => {
    // 10,000 at 10%/yr for 1 year, compounded annually = 11,000
    expect(futureValue(10_000, 10, 1, "annually")).toBeCloseTo(11_000, 2);
  });

  it("monthly compounding yields more than annual compounding at the same nominal rate", () => {
    const annual = futureValue(10_000, 12, 1, "annually");
    const monthly = futureValue(10_000, 12, 1, "monthly");
    expect(monthly).toBeGreaterThan(annual);
  });
});

// ─── computeSafeToSpend ─────────────────────────────────────────────────

describe("computeSafeToSpend", () => {
  it("subtracts only bills due within the window, and each goal's monthly reserve", () => {
    const in3Months = new Date();
    in3Months.setMonth(in3Months.getMonth() + 3);

    const state = makeState({
      goals: [
        {
          id: "g1",
          name: "Emergency fund",
          target: 60_000,
          saved: 30_000,
          deadline: in3Months.toISOString(),
          createdAt: new Date().toISOString(),
        },
      ],
      recurring: [
        {
          id: "r1",
          type: "expense",
          amount: 5_000,
          category: "Housing",
          accountId: "a1",
          frequency: "monthly",
          anchor: 1,
          nextDate: daysFromNow(10), // inside a 30-day window
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: "r2",
          type: "expense",
          amount: 2_000,
          category: "Lifestyle",
          accountId: "a1",
          frequency: "monthly",
          anchor: 1,
          nextDate: daysFromNow(45), // outside a 30-day window
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const result = computeSafeToSpend(state, 50_000, 30);
    expect(result.upcomingBills).toBe(5_000); // only r1
    expect(result.goalReserve).toBe(10_000); // (60000-30000)/3 months
    expect(result.safeToSpend).toBe(50_000 - 5_000 - 10_000);
  });

  it("ignores inactive recurring rules", () => {
    const state = makeState({
      recurring: [
        {
          id: "r1",
          type: "expense",
          amount: 5_000,
          category: "Housing",
          accountId: "a1",
          frequency: "monthly",
          anchor: 1,
          nextDate: daysFromNow(5),
          active: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(computeSafeToSpend(state, 10_000, 30).upcomingBills).toBe(0);
  });
});

// ─── parseMpesaMessages ─────────────────────────────────────────────────

describe("parseMpesaMessages", () => {
  it("parses a 'sent to' message as a high-confidence expense", () => {
    const rows = parseMpesaMessages(
      "QCI7X8Y9Z1 Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 20/7/26 at 2:30 PM. New M-PESA balance is Ksh1,234.00.",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("expense");
    expect(rows[0].amount).toBe(500);
    expect(rows[0].confidence).toBe("high");
  });

  it("parses a 'received from' message as income", () => {
    const rows = parseMpesaMessages(
      "QCI7X8Y9Z2 Confirmed. You have received Ksh1,000.00 from JANE DOE 0798765432 on 21/7/26 at 9:15 AM. New M-PESA balance is Ksh5,678.00.",
    );
    expect(rows[0].type).toBe("income");
    expect(rows[0].amount).toBe(1_000);
  });

  it("guesses a sensible category from the counterparty name", () => {
    const rows = parseMpesaMessages(
      "QCI7X8Y9Z3 Confirmed. Ksh200.00 paid to NAIVAS SUPERMARKET on 22/7/26 at 6:45 PM. New M-PESA balance is Ksh478.00.",
    );
    expect(rows[0].category).toBe("Food");
  });

  it("does not swallow an unrecognized message that trails a recognized one in the same paste", () => {
    // Regression test: chunking used to merge a trailing unrecognized
    // paragraph into the preceding recognized message, silently dropping it.
    const text = `
QCI7X8Y9Z7 Confirmed. You have received Ksh1,000.00 cash deposit from AGENT SHOP on 23/7/26 at 8:00 AM. New M-PESA balance is Ksh2,000.00.

Some totally unrecognized message format but mentions Ksh75.50 somewhere in the middle of it.
`;
    const rows = parseMpesaMessages(text);
    expect(rows).toHaveLength(2);
    expect(rows[1].confidence).toBe("low");
    expect(rows[1].amount).toBe(75.5);
  });

  it("returns an empty array for text with no Ksh amount", () => {
    expect(parseMpesaMessages("Hello, just checking in, no transaction here.")).toHaveLength(0);
  });
});

// ─── parseCsvRows ───────────────────────────────────────────────────────

describe("parseCsvRows", () => {
  it("parses DD/MM/YYYY dates correctly, not as the ambiguous US MM/DD/YYYY format", () => {
    // Regression test: native `new Date("20/07/2026")` silently produces an
    // Invalid Date (20 isn't a valid month) and used to fall back to
    // "today" — this locks in the explicit day-first parser instead.
    const rows = parseCsvRows([["20/07/2026", "SALARY PAYMENT", "50000"]], {
      date: 0,
      description: 1,
      amount: 2,
    });
    expect(rows[0].date.slice(0, 10)).toBe("2026-07-20");
  });

  it("treats a negative amount as an expense and a positive one as income when there's a single amount column", () => {
    const rows = parseCsvRows(
      [
        ["2026-07-20", "Salary", "50000"],
        ["2026-07-21", "Groceries", "-2500"],
      ],
      { date: 0, description: 1, amount: 2 },
    );
    expect(rows[0].type).toBe("income");
    expect(rows[1].type).toBe("expense");
    expect(rows[1].amount).toBe(2500); // stored as a positive magnitude
  });

  it("uses the money-out column to decide type when in/out are separate columns", () => {
    const rows = parseCsvRows([["2026-07-20", "Rent", "0", "15000"]], {
      date: 0,
      description: 1,
      amount: 2,
      amountOut: 3,
    });
    expect(rows[0].type).toBe("expense");
    expect(rows[0].amount).toBe(15000);
  });

  it("skips rows with no usable amount", () => {
    const rows = parseCsvRows([["2026-07-20", "Nothing", "0"]], {
      date: 0,
      description: 1,
      amount: 2,
    });
    expect(rows).toHaveLength(0);
  });
});

// ─── computeWeekSummary ─────────────────────────────────────────────────

describe("computeWeekSummary", () => {
  it("only includes transactions within the 7-day window starting at weekStart", () => {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    const inWeek = new Date(monday.getTime() + 2 * 86_400_000).toISOString();
    const outOfWeek = new Date(monday.getTime() - 2 * 86_400_000).toISOString();

    const state = makeState({
      transactions: [
        makeTx({ type: "income", amount: 10_000, date: inWeek }),
        makeTx({ type: "expense", amount: 3_000, category: "Food", date: inWeek }),
        makeTx({ type: "expense", amount: 99_999, category: "Food", date: outOfWeek }),
      ],
    });

    const summary = computeWeekSummary(state, monday);
    expect(summary.income).toBe(10_000);
    expect(summary.expenses).toBe(3_000);
    expect(summary.net).toBe(7_000);
    expect(summary.topCategory).toBe("Food");
    expect(summary.txCount).toBe(2);
  });

  it("reports zero transactions for a week with no activity", () => {
    const state = makeState();
    const summary = computeWeekSummary(state, new Date());
    expect(summary.txCount).toBe(0);
    expect(summary.topCategory).toBeNull();
  });
});

// ─── monthlySeries ──────────────────────────────────────────────────────

describe("monthlySeries", () => {
  it("returns one entry per requested month, most recent last", () => {
    const series = monthlySeries([], 3);
    expect(series).toHaveLength(3);
  });

  it("sums income and expenses into the correct month bucket", () => {
    const thisMonth = new Date().toISOString();
    const txs: Transaction[] = [
      makeTx({ type: "income", amount: 1_000, date: thisMonth }),
      makeTx({ type: "expense", amount: 400, date: thisMonth }),
    ];
    const series = monthlySeries(txs, 1);
    expect(series[0].income).toBe(1_000);
    expect(series[0].expenses).toBe(400);
    expect(series[0].net).toBe(600);
  });

  it("excludes opening-balance transactions from the cash flow chart", () => {
    const thisMonth = new Date().toISOString();
    const txs: Transaction[] = [
      makeTx({ type: "income", amount: 100_000, date: thisMonth, isOpeningBalance: true }),
      makeTx({ type: "income", amount: 1_000, date: thisMonth }),
    ];
    const series = monthlySeries(txs, 1);
    expect(series[0].income).toBe(1_000);
  });
});

// ─── computePipelineMetrics ─────────────────────────────────────────────

describe("computePipelineMetrics", () => {
  it("buckets opportunities by status correctly and computes a sane conversion rate", () => {
    const state = makeState({
      opportunities: [
        {
          id: "1",
          client: "A",
          amount: 1000,
          expectedDate: "",
          status: "idea",
          probability: 50,
          createdAt: "",
        },
        {
          id: "2",
          client: "B",
          amount: 2000,
          expectedDate: "",
          status: "confirmed",
          probability: 80,
          createdAt: "",
        },
        {
          id: "3",
          client: "C",
          amount: 3000,
          expectedDate: "",
          status: "paid",
          probability: 100,
          createdAt: "",
        },
        {
          id: "4",
          client: "D",
          amount: 500,
          expectedDate: "",
          status: "cancelled",
          probability: 0,
          createdAt: "",
        },
      ],
    });
    const m = computePipelineMetrics(state);
    expect(m.expected).toBe(1000 + 2000); // idea + confirmed (paid is "collected", not "expected")
    expect(m.confirmed).toBe(2000);
    expect(m.collected).toBe(3000);
    expect(m.lost).toBe(500);
    expect(m.conversionRate).toBe(50); // 1 paid / (1 paid + 1 cancelled) = 50%
  });

  it("reports a zero conversion rate when nothing has closed yet", () => {
    const state = makeState({
      opportunities: [
        {
          id: "1",
          client: "A",
          amount: 1000,
          expectedDate: "",
          status: "idea",
          probability: 50,
          createdAt: "",
        },
      ],
    });
    expect(computePipelineMetrics(state).conversionRate).toBe(0);
  });
});

// ─── computeInvestmentSummary ───────────────────────────────────────────

describe("computeInvestmentSummary", () => {
  it("computes a balance-weighted average return across investment accounts", () => {
    const state = makeState({
      accounts: [
        makeAccount({ id: "i1", type: "investment", balance: 8_000, expectedAnnualReturn: 10 }),
        makeAccount({ id: "i2", type: "investment", balance: 2_000, expectedAnnualReturn: 20 }),
        makeAccount({ id: "bank", type: "bank", balance: 5_000 }), // should be excluded
      ],
    });
    const summary = computeInvestmentSummary(state);
    expect(summary.totalInvested).toBe(10_000);
    // (8000*10 + 2000*20) / 10000 = 12
    expect(summary.weightedAvgReturn).toBeCloseTo(12, 5);
  });

  it("returns a zero weighted average return when there are no investment accounts", () => {
    const state = makeState({ accounts: [makeAccount({ type: "bank", balance: 5_000 })] });
    expect(computeInvestmentSummary(state).weightedAvgReturn).toBe(0);
  });
});
