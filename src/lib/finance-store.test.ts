import { describe, it, expect } from "vitest";
import { mergeById, mergeStates } from "./finance-store";
import type { FinanceState, Goal } from "./finance-types";

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    name: "Test goal",
    target: 10_000,
    saved: 0,
    deadline: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

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
    allocations: [],
    ...overrides,
  };
}

describe("mergeById", () => {
  it("keeps items that only exist locally (a new goal added during the pull window)", () => {
    const local = [makeGoal({ id: "new-goal", name: "Just added" })];
    const cloud: Goal[] = [];
    const merged = mergeById(local, cloud);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("new-goal");
  });

  it("keeps items that only exist in the cloud (added from another device)", () => {
    const local: Goal[] = [];
    const cloud = [makeGoal({ id: "other-device-goal" })];
    const merged = mergeById(local, cloud);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("other-device-goal");
  });

  it("prefers the local version on an id collision, since it reflects the most recent edit", () => {
    const local = [makeGoal({ id: "g1", saved: 500 })];
    const cloud = [makeGoal({ id: "g1", saved: 0 })];
    const merged = mergeById(local, cloud);
    expect(merged).toHaveLength(1);
    expect(merged[0].saved).toBe(500);
  });
});

describe("mergeStates — regression test for the goals-not-saving bug", () => {
  it("preserves a goal added locally during the cloud pull window instead of discarding it", () => {
    // This is exactly the scenario that was losing data: the cloud pull
    // starts, the user adds a goal before it resolves, and the pull's
    // response (which doesn't know about that goal yet) used to
    // unconditionally overwrite local state and silently drop it.
    const cloudSnapshot = makeState({ goals: [makeGoal({ id: "existing" })] });
    const localWithNewGoal = makeState({
      goals: [makeGoal({ id: "existing" }), makeGoal({ id: "just-added", name: "New goal" })],
    });

    const merged = mergeStates(localWithNewGoal, cloudSnapshot);
    expect(merged.goals).toHaveLength(2);
    expect(merged.goals.some((g) => g.id === "just-added")).toBe(true);
  });

  it("keeps the local profile rather than the cloud's, since the user is actively looking at it", () => {
    const local = makeState({ profile: { ...makeState().profile, monthlyIncome: 5000 } });
    const cloud = makeState({ profile: { ...makeState().profile, monthlyIncome: 1000 } });
    expect(mergeStates(local, cloud).profile.monthlyIncome).toBe(5000);
  });
});
