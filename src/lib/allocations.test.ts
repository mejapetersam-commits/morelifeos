import { describe, it, expect } from "vitest";
import {
  accountAllocationView,
  allocatedForAccount,
  allocatedForGoal,
  goalFunding,
  overAllocatedAccounts,
  pruneAllocations,
  validateAllocation,
} from "./allocations";
import type { Account, Allocation, FinanceState, Goal } from "./finance-types";

function acct(id: string, name: string, balance: number): Account {
  return { id, name, type: "investment", balance, currency: "KSh" };
}

function goal(id: string, target: number, saved = 0): Goal {
  return {
    id,
    name: `Goal ${id}`,
    target,
    saved,
    deadline: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

function alloc(id: string, goalId: string, accountId: string, amount: number): Allocation {
  return {
    id,
    goalId,
    accountId,
    amount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function state(overrides: Partial<FinanceState> = {}): FinanceState {
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
    ...overrides,
  };
}

describe("allocation totals", () => {
  const sanlam = acct("sanlam", "Sanlam MMF", 70_000);
  const allocations = [
    alloc("a1", "vitara", "sanlam", 30_000),
    alloc("a2", "emergency", "sanlam", 10_000),
    alloc("a3", "vacation", "sanlam", 5_000),
  ];

  it("sums allocations per account", () => {
    expect(allocatedForAccount(allocations, "sanlam")).toBe(45_000);
  });

  it("leaves the account balance untouched and only reduces what's available", () => {
    const view = accountAllocationView(sanlam, allocations);
    expect(view.balance).toBe(70_000);
    expect(view.allocated).toBe(45_000);
    expect(view.available).toBe(25_000);
    expect(view.overAllocatedBy).toBe(0);
  });

  it("reports over-allocation instead of clamping it away", () => {
    const view = accountAllocationView(acct("sanlam", "Sanlam MMF", 40_000), allocations);
    expect(view.available).toBe(-5_000);
    expect(view.overAllocatedBy).toBe(5_000);
  });

  it("sums allocations per goal across several accounts", () => {
    const multi = [
      alloc("a1", "vitara", "sanlam", 30_000),
      alloc("a2", "vitara", "ncba", 20_000),
      alloc("a3", "vitara", "cic", 15_000),
    ];
    expect(allocatedForGoal(multi, "vitara")).toBe(65_000);
  });
});

describe("goalFunding", () => {
  const accounts = [
    acct("sanlam", "Sanlam MMF", 70_000),
    acct("ncba", "NCBA", 50_000),
    acct("cic", "CIC MMF", 30_000),
  ];
  const allocations = [
    alloc("a1", "vitara", "sanlam", 30_000),
    alloc("a2", "vitara", "ncba", 20_000),
    alloc("a3", "vitara", "cic", 15_000),
  ];

  it("reports progress from multiple funding accounts", () => {
    const view = goalFunding(goal("vitara", 700_000), allocations, accounts);
    expect(view.allocated).toBe(65_000);
    expect(view.funded).toBe(65_000);
    expect(view.remaining).toBe(635_000);
    expect(view.percent).toBe(9);
    expect(view.lines.map((l) => l.accountName)).toEqual(["Sanlam MMF", "NCBA", "CIC MMF"]);
  });

  it("counts legacy moved-money contributions alongside allocations", () => {
    const view = goalFunding(goal("vitara", 100_000, 10_000), allocations, accounts);
    expect(view.contributed).toBe(10_000);
    expect(view.funded).toBe(75_000);
  });

  it("never exceeds 100% or reports negative remaining", () => {
    const view = goalFunding(goal("vitara", 50_000), allocations, accounts);
    expect(view.percent).toBe(100);
    expect(view.remaining).toBe(0);
  });

  it("handles a zero-target goal without dividing by zero", () => {
    expect(goalFunding(goal("x", 0), [], accounts).percent).toBe(0);
  });
});

describe("validateAllocation", () => {
  const accounts = [acct("sanlam", "Sanlam MMF", 70_000)];
  const existing = [alloc("a1", "emergency", "sanlam", 50_000)];

  it("allows an allocation inside the remaining balance", () => {
    expect(validateAllocation(accounts, existing, "sanlam", "vitara", 20_000).ok).toBe(true);
  });

  it("rejects and quantifies an over-allocation", () => {
    const r = validateAllocation(accounts, existing, "sanlam", "vitara", 25_000);
    expect(r.ok).toBe(false);
    expect(r.overBy).toBe(5_000);
    expect(r.max).toBe(20_000);
  });

  it("ignores the pair being edited so an existing allocation can be raised", () => {
    const r = validateAllocation(accounts, existing, "sanlam", "emergency", 70_000);
    expect(r.ok).toBe(true);
  });

  it("rejects negative amounts and unknown accounts", () => {
    expect(validateAllocation(accounts, existing, "sanlam", "vitara", -1).ok).toBe(false);
    expect(validateAllocation(accounts, existing, "ghost", "vitara", 1).ok).toBe(false);
  });
});

describe("pruneAllocations (data integrity)", () => {
  it("drops allocations whose account was deleted", () => {
    const s = state({
      goals: [goal("g1", 100)],
      allocations: [alloc("a1", "g1", "gone", 10)],
    });
    expect(pruneAllocations(s).allocations).toHaveLength(0);
  });

  it("drops allocations whose goal was deleted", () => {
    const s = state({
      accounts: [acct("acc", "Acc", 100)],
      allocations: [alloc("a1", "gone", "acc", 10)],
    });
    expect(pruneAllocations(s).allocations).toHaveLength(0);
  });

  it("merges duplicate rows for the same account/goal pair", () => {
    const s = state({
      accounts: [acct("acc", "Acc", 100)],
      goals: [goal("g1", 100)],
      allocations: [alloc("a1", "g1", "acc", 10), alloc("a2", "g1", "acc", 15)],
    });
    const next = pruneAllocations(s).allocations;
    expect(next).toHaveLength(1);
    expect(next[0].amount).toBe(25);
  });

  it("removes zero and negative allocations", () => {
    const s = state({
      accounts: [acct("acc", "Acc", 100)],
      goals: [goal("g1", 100)],
      allocations: [alloc("a1", "g1", "acc", 0), alloc("a2", "g1", "acc", -5)],
    });
    expect(pruneAllocations(s).allocations).toHaveLength(0);
  });

  it("returns the same object when nothing needs cleaning", () => {
    const s = state({
      accounts: [acct("acc", "Acc", 100)],
      goals: [goal("g1", 100)],
      allocations: [alloc("a1", "g1", "acc", 10)],
    });
    expect(pruneAllocations(s)).toBe(s);
  });

  it("tolerates legacy state saved before allocations existed", () => {
    const legacy = state();
    // @ts-expect-error simulating a pre-allocation persisted payload
    delete legacy.allocations;
    expect(pruneAllocations(legacy).allocations).toEqual([]);
  });

  it("flags accounts whose balance dropped below what's allocated", () => {
    const s = state({
      accounts: [acct("acc", "Acc", 20)],
      goals: [goal("g1", 100)],
      allocations: [alloc("a1", "g1", "acc", 50)],
    });
    expect(overAllocatedAccounts(s).map((a) => a.id)).toEqual(["acc"]);
  });
});
