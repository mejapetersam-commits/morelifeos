import type { Account, Allocation, FinanceState, Goal } from "./finance-types";

/**
 * Allocation math. Money never leaves an account when it's allocated —
 * an allocation is only a claim on part of a balance, so every figure
 * here is derived, never stored twice.
 */

export function allocatedForAccount(allocations: Allocation[], accountId: string): number {
  return allocations.filter((a) => a.accountId === accountId).reduce((sum, a) => sum + a.amount, 0);
}

export function allocatedForGoal(allocations: Allocation[], goalId: string): number {
  return allocations.filter((a) => a.goalId === goalId).reduce((sum, a) => sum + a.amount, 0);
}

export interface AccountAllocationView {
  balance: number;
  allocated: number;
  /** balance − allocated. Negative means the account is over-allocated. */
  available: number;
  overAllocatedBy: number;
}

export function accountAllocationView(
  account: Account,
  allocations: Allocation[],
): AccountAllocationView {
  const allocated = allocatedForAccount(allocations, account.id);
  const available = account.balance - allocated;
  return {
    balance: account.balance,
    allocated,
    available,
    overAllocatedBy: available < 0 ? -available : 0,
  };
}

export interface GoalFundingLine {
  accountId: string;
  accountName: string;
  amount: number;
}

export interface GoalFundingView {
  /** Total assigned from accounts (money still sitting in those accounts). */
  allocated: number;
  /** Legacy contributions that actually moved money out of an account. */
  contributed: number;
  /** allocated + contributed — what counts toward the target. */
  funded: number;
  remaining: number;
  percent: number;
  lines: GoalFundingLine[];
}

export function goalFunding(
  goal: Goal,
  allocations: Allocation[],
  accounts: Account[],
): GoalFundingView {
  const lines = allocations
    .filter((a) => a.goalId === goal.id)
    .map((a) => ({
      accountId: a.accountId,
      accountName: accounts.find((acc) => acc.id === a.accountId)?.name ?? "Unknown account",
      amount: a.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const allocated = lines.reduce((sum, l) => sum + l.amount, 0);
  const contributed = goal.saved || 0;
  const funded = allocated + contributed;
  const remaining = Math.max(0, goal.target - funded);
  const percent = goal.target > 0 ? Math.min(100, Math.round((funded / goal.target) * 100)) : 0;

  return { allocated, contributed, funded, remaining, percent, lines };
}

export interface AllocationValidation {
  ok: boolean;
  /** Max this account can put behind this goal, given its other allocations. */
  max: number;
  overBy: number;
  message?: string;
}

/**
 * Validates a proposed allocation of `amount` from `accountId` to `goalId`,
 * ignoring any existing allocation for that same pair (it's being replaced).
 */
export function validateAllocation(
  accounts: Account[],
  allocations: Allocation[],
  accountId: string,
  goalId: string,
  amount: number,
): AllocationValidation {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return { ok: false, max: 0, overBy: 0, message: "That account no longer exists." };

  const others = allocations.filter((a) => !(a.accountId === accountId && a.goalId === goalId));
  const max = account.balance - allocatedForAccount(others, accountId);

  if (amount < 0) return { ok: false, max, overBy: 0, message: "Amount can't be negative." };
  if (amount > max) {
    return {
      ok: false,
      max,
      overBy: amount - max,
      message: `Over-allocated — ${account.name} only has ${Math.max(0, max).toLocaleString()} left to allocate.`,
    };
  }
  return { ok: true, max, overBy: 0 };
}

/**
 * Central integrity pass: drops allocations pointing at deleted accounts or
 * goals, merges accidental duplicates for the same account/goal pair, and
 * removes zero/negative rows. Run on every state load and restore so no
 * screen can ever read an orphaned figure.
 */
export function pruneAllocations(state: FinanceState): FinanceState {
  const allocations = state.allocations ?? [];
  const accountIds = new Set(state.accounts.map((a) => a.id));
  const goalIds = new Set(state.goals.map((g) => g.id));

  const byPair = new Map<string, Allocation>();
  for (const a of allocations) {
    if (!accountIds.has(a.accountId) || !goalIds.has(a.goalId)) continue;
    if (!(a.amount > 0)) continue;
    const key = `${a.accountId}:${a.goalId}`;
    const existing = byPair.get(key);
    byPair.set(key, existing ? { ...existing, amount: existing.amount + a.amount } : a);
  }

  const next = Array.from(byPair.values());
  const unchanged =
    Array.isArray(state.allocations) &&
    next.length === allocations.length &&
    next.every((a, i) => a === allocations[i]);
  return unchanged ? state : { ...state, allocations: next };
}

export function overAllocatedAccounts(state: FinanceState): Account[] {
  return state.accounts.filter(
    (a) => accountAllocationView(a, state.allocations ?? []).overAllocatedBy > 0,
  );
}
