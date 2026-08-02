import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Account,
  Allocation,
  Budget,
  Decision,
  DecisionOutcome,
  FinanceState,
  Goal,
  IncomeOpportunity,
  IncomeSource,
  InboxItem,
  Profile,
  RecurringTransaction,
  Review,
  Transaction,
} from "./finance-types";
import { pruneAllocations, validateAllocation } from "./allocations";
import { useSession } from "./auth-client";

const STORAGE_KEY = "financeos:v1";

const defaultProfile: Profile = {
  currency: "KSh",
  monthlyIncome: 0,
  fixedExpenses: 0,
  variableExpenses: 0,
  savings: 0,
  investments: 0,
  debt: 0,
  vision: [],
  onboarded: false,
};

const defaultState: FinanceState = {
  profile: defaultProfile,
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
};

interface Ctx {
  state: FinanceState;
  setProfile: (p: Partial<Profile>) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  /** Creates an account and, if openingBalance is nonzero, posts a real opening-balance transaction for it instead of silently setting a number. */
  addAccountWithOpeningBalance: (
    a: Omit<Account, "id" | "balance">,
    openingBalance: number,
  ) => void;
  /** Backfills an opening-balance transaction for an existing account whose balance isn't traceable to any transaction — matches the current balance, doesn't change it. */
  recordOpeningBalance: (accountId: string) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  /** Posts accrued interest/growth as a real income transaction and refreshes the account's rate-confirmed date. */
  postAccountGrowth: (accountId: string, amount: number) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  removeTransaction: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  /** Moves real money from an account into a goal — posts a transaction, doesn't just bump a number. */
  contributeToGoal: (goalId: string, accountId: string, amount: number) => void;
  addReview: (r: Omit<Review, "id" | "createdAt">) => void;
  addBudget: (b: Omit<Budget, "id">) => void;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  removeBudget: (id: string) => void;
  addRecurring: (r: Omit<RecurringTransaction, "id" | "createdAt">) => void;
  updateRecurring: (id: string, patch: Partial<RecurringTransaction>) => void;
  removeRecurring: (id: string) => void;
  addOpportunity: (o: Omit<IncomeOpportunity, "id" | "createdAt">) => void;
  updateOpportunity: (id: string, patch: Partial<IncomeOpportunity>) => void;
  removeOpportunity: (id: string) => void;
  /** Marks an opportunity paid and posts a matching income transaction to the given account. */
  markOpportunityPaid: (id: string, accountId: string) => void;
  addIncomeSource: (s: Omit<IncomeSource, "id" | "createdAt">) => void;
  updateIncomeSource: (id: string, patch: Partial<IncomeSource>) => void;
  removeIncomeSource: (id: string) => void;
  addInboxItem: (item: Omit<InboxItem, "id" | "createdAt" | "status">) => void;
  updateInboxItem: (id: string, patch: Partial<InboxItem>) => void;
  archiveInboxItem: (id: string) => void;
  removeInboxItem: (id: string) => void;
  addDecision: (d: Omit<Decision, "id" | "createdAt">) => void;
  recordDecisionOutcome: (id: string, outcome: DecisionOutcome, note?: string) => void;
  removeDecision: (id: string) => void;
  /** Assigns (does NOT move) money from an account to a goal. amount <= 0 removes the allocation. Rejects over-allocation. */
  setAllocation: (goalId: string, accountId: string, amount: number) => void;
  removeAllocation: (id: string) => void;
  /** Wipes all financial data and returns the app to a first-run state. Auth is untouched. */
  resetFinancialData: () => void;
  reset: () => void;
  replaceState: (next: FinanceState) => void;
  /** "local" until logged in; reflects cloud sync progress once a session exists. */
  syncStatus: "local" | "syncing" | "synced" | "error";
}

const FinanceContext = createContext<Ctx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function accountDelta(tx: Pick<Transaction, "type" | "amount">) {
  return tx.type === "income"
    ? tx.amount
    : tx.type === "expense" || tx.type === "investment" || tx.type === "transfer"
      ? -tx.amount
      : 0;
}

function applyTxToAccounts(accounts: Account[], tx: Transaction): Account[] {
  return accounts.map((a) => {
    if (a.id === tx.accountId) {
      return { ...a, balance: a.balance + accountDelta(tx) };
    }
    if (tx.type === "transfer" && a.id === tx.toAccountId) {
      return { ...a, balance: a.balance + tx.amount };
    }
    return a;
  });
}

/** Advance a recurring rule's nextDate by one period. */
function advance(rule: RecurringTransaction): string {
  const d = new Date(rule.nextDate);
  if (rule.frequency === "weekly") {
    d.setDate(d.getDate() + 7);
  } else {
    d.setMonth(d.getMonth() + 1);
    // Clamp to the anchor day so short months don't drift the schedule.
    d.setDate(Math.min(rule.anchor, daysInMonth(d.getFullYear(), d.getMonth())));
  }
  return d.toISOString();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Posts any recurring transactions whose nextDate has arrived, catching up
 * on missed periods (capped) if the app wasn't opened for a while.
 */
function processDueRecurring(state: FinanceState): FinanceState {
  if (state.recurring.length === 0) return state;

  let accounts = state.accounts;
  const newTxs: Transaction[] = [];
  const updatedRecurring = state.recurring.map((rule) => {
    if (!rule.active) return rule;
    let next = rule.nextDate;
    let guard = 0;
    while (new Date(next).getTime() <= Date.now() && guard < 24) {
      const tx: Transaction = {
        id: uid(),
        type: rule.type,
        amount: rule.amount,
        category: rule.category,
        accountId: rule.accountId,
        toAccountId: rule.toAccountId,
        date: next,
        description: rule.description ? `${rule.description} (auto)` : undefined,
      };
      accounts = applyTxToAccounts(accounts, tx);
      newTxs.push(tx);
      next = advance({ ...rule, nextDate: next });
      guard++;
    }
    return next === rule.nextDate ? rule : { ...rule, nextDate: next };
  });

  if (newTxs.length === 0) return state;

  return {
    ...state,
    accounts,
    transactions: [...newTxs, ...state.transactions],
    recurring: updatedRecurring,
  };
}

/**
 * Union-by-id merge, local wins on id collision. Used when a cloud pull
 * resolves after local edits happened during the pull window — without
 * this, the pull would silently overwrite whatever the user just added
 * (e.g. a goal created right after login, before the pull finished).
 */
export function mergeById<T extends { id: string }>(local: T[], cloud: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cloud) map.set(item.id, item);
  for (const item of local) map.set(item.id, item);
  return Array.from(map.values());
}

export function mergeStates(local: FinanceState, cloud: FinanceState): FinanceState {
  return {
    profile: local.profile,
    accounts: mergeById(local.accounts, cloud.accounts),
    transactions: mergeById(local.transactions, cloud.transactions),
    goals: mergeById(local.goals, cloud.goals),
    reviews: mergeById(local.reviews, cloud.reviews),
    budgets: mergeById(local.budgets, cloud.budgets),
    recurring: mergeById(local.recurring, cloud.recurring),
    opportunities: mergeById(local.opportunities, cloud.opportunities),
    incomeSources: mergeById(local.incomeSources, cloud.incomeSources),
    inbox: mergeById(local.inbox, cloud.inbox),
    decisions: mergeById(local.decisions, cloud.decisions),
    allocations: mergeById(local.allocations ?? [], cloud.allocations ?? []),
  };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Ctx["syncStatus"]>("local");
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const cloudReady = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Always-current mirror of state, readable synchronously inside async
  // callbacks without the stale-closure problem a plain effect dependency
  // would have.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
      setState(pruneAllocations(processDueRecurring(loaded)));
    } catch {
      // Corrupt or missing localStorage data — fall back to defaults.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be full or unavailable (e.g. private browsing) — data
      // stays in memory for this session even though it won't persist.
    }
  }, [state, hydrated]);

  // On login: pull the cloud copy if one exists, otherwise treat the
  // current (local) state as the first cloud save. Runs once per session.
  useEffect(() => {
    if (!hydrated || !userId) {
      cloudReady.current = false;
      if (!userId) setSyncStatus("local");
      return;
    }
    let cancelled = false;
    cloudReady.current = false;
    setSyncStatus("syncing");
    const snapshotAtPullStart = stateRef.current;
    (async () => {
      try {
        const res = await fetch("/api/finance-data");
        if (!res.ok) throw new Error(`GET /api/finance-data failed: ${res.status}`);
        const body = (await res.json()) as { data: FinanceState | null };
        if (cancelled) return;
        if (body.data) {
          const cloudData = pruneAllocations(
            processDueRecurring({ ...defaultState, ...body.data }),
          );
          setState((current) => {
            // If nothing changed locally while the pull was in flight, it's
            // safe to just take the cloud copy. If the user made edits
            // during that window (e.g. added a goal right after logging
            // in), merge rather than silently discarding them.
            if (current === snapshotAtPullStart) return cloudData;
            return mergeStates(current, cloudData);
          });
        } else {
          await fetch("/api/finance-data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stateRef.current),
          });
        }
        if (!cancelled) {
          cloudReady.current = true;
          setSyncStatus("synced");
        }
      } catch {
        if (!cancelled) setSyncStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when the logged-in user changes, not on every state edit.
  }, [hydrated, userId]);

  // While logged in and past the initial pull, debounce-save edits to the cloud.
  useEffect(() => {
    if (!hydrated || !userId || !cloudReady.current) return;
    setSyncStatus("syncing");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/finance-data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!res.ok) throw new Error(`PUT /api/finance-data failed: ${res.status}`);
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      }
    }, 1200);
    return () => clearTimeout(saveTimer.current);
  }, [state, hydrated, userId]);

  const api = useMemo<Ctx>(
    () => ({
      state,
      setProfile: (p) => setState((s) => ({ ...s, profile: { ...s.profile, ...p } })),
      addAccount: (a) =>
        setState((s) => ({ ...s, accounts: [...s.accounts, { ...a, id: uid() }] })),
      addAccountWithOpeningBalance: (a, openingBalance) =>
        setState((s) => {
          const id = uid();
          const newAccount: Account = { ...a, id, balance: 0 };
          let accounts = [...s.accounts, newAccount];
          let transactions = s.transactions;
          if (openingBalance !== 0) {
            const tx: Transaction = {
              id: uid(),
              type: openingBalance >= 0 ? "income" : "expense",
              amount: Math.abs(openingBalance),
              category: "Other",
              accountId: id,
              date: new Date().toISOString(),
              description: "Opening balance",
              isOpeningBalance: true,
            };
            accounts = applyTxToAccounts(accounts, tx);
            transactions = [tx, ...transactions];
          }
          return { ...s, accounts, transactions };
        }),
      recordOpeningBalance: (accountId) =>
        setState((s) => {
          const acct = s.accounts.find((a) => a.id === accountId);
          if (!acct || acct.balance === 0) return s;
          const alreadyHas = s.transactions.some(
            (t) => t.accountId === accountId && t.isOpeningBalance,
          );
          if (alreadyHas) return s;
          const tx: Transaction = {
            id: uid(),
            type: acct.balance >= 0 ? "income" : "expense",
            amount: Math.abs(acct.balance),
            category: "Other",
            accountId,
            date: new Date().toISOString(),
            description: "Opening balance (recorded retroactively)",
            isOpeningBalance: true,
          };
          // Backfill only — the balance is already correct, so this
          // deliberately does NOT go through applyTxToAccounts.
          return { ...s, transactions: [tx, ...s.transactions] };
        }),
      updateAccount: (id, patch) =>
        setState((s) => ({
          ...s,
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      removeAccount: (id) =>
        setState((s) => ({
          ...s,
          accounts: s.accounts.filter((a) => a.id !== id),
          transactions: s.transactions.filter((t) => t.accountId !== id && t.toAccountId !== id),
          // Dependent records must never outlive their account.
          allocations: s.allocations.filter((al) => al.accountId !== id),
        })),
      addTransaction: (t) =>
        setState((s) => {
          const tx: Transaction = { ...t, id: uid() };
          return {
            ...s,
            accounts: applyTxToAccounts(s.accounts, tx),
            transactions: [tx, ...s.transactions],
          };
        }),
      updateTransaction: (id, patch) =>
        setState((s) => {
          const old = s.transactions.find((t) => t.id === id);
          if (!old) return s;
          const reversed: Transaction = { ...old, amount: -old.amount };
          const accountsAfterReversal = applyTxToAccounts(s.accounts, reversed);
          const updated: Transaction = { ...old, ...patch };
          const accounts = applyTxToAccounts(accountsAfterReversal, updated);
          return {
            ...s,
            accounts,
            transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
          };
        }),
      postAccountGrowth: (accountId, amount) =>
        setState((s) => {
          if (amount <= 0) return s;
          const tx: Transaction = {
            id: uid(),
            type: "income",
            amount,
            category: "Investment",
            accountId,
            date: new Date().toISOString(),
            description: "Interest/growth accrued",
          };
          return {
            ...s,
            accounts: applyTxToAccounts(s.accounts, tx).map((a) =>
              a.id === accountId ? { ...a, rateUpdatedAt: new Date().toISOString() } : a,
            ),
            transactions: [tx, ...s.transactions],
          };
        }),
      removeTransaction: (id) =>
        setState((s) => {
          const tx = s.transactions.find((t) => t.id === id);
          if (!tx) return s;
          const reversed: Transaction = { ...tx, amount: -tx.amount };
          return {
            ...s,
            accounts: applyTxToAccounts(s.accounts, reversed),
            transactions: s.transactions.filter((t) => t.id !== id),
          };
        }),
      addGoal: (g) =>
        setState((s) => ({
          ...s,
          goals: [...s.goals, { ...g, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateGoal: (id, patch) =>
        setState((s) => ({
          ...s,
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      removeGoal: (id) =>
        setState((s) => ({
          ...s,
          goals: s.goals.filter((g) => g.id !== id),
          allocations: s.allocations.filter((al) => al.goalId !== id),
        })),
      setAllocation: (goalId, accountId, amount) =>
        setState((s) => {
          const existing = s.allocations.find(
            (a) => a.goalId === goalId && a.accountId === accountId,
          );
          if (!(amount > 0)) {
            return existing
              ? { ...s, allocations: s.allocations.filter((a) => a.id !== existing.id) }
              : s;
          }
          const check = validateAllocation(s.accounts, s.allocations, accountId, goalId, amount);
          if (!check.ok) return s;
          const now = new Date().toISOString();
          if (existing) {
            return {
              ...s,
              allocations: s.allocations.map((a) =>
                a.id === existing.id ? { ...a, amount, updatedAt: now } : a,
              ),
            };
          }
          const allocation: Allocation = {
            id: uid(),
            goalId,
            accountId,
            amount,
            createdAt: now,
            updatedAt: now,
          };
          return { ...s, allocations: [...s.allocations, allocation] };
        }),
      removeAllocation: (id) =>
        setState((s) => ({ ...s, allocations: s.allocations.filter((a) => a.id !== id) })),
      contributeToGoal: (goalId, accountId, amount) =>
        setState((s) => {
          if (amount <= 0) return s;
          const goal = s.goals.find((g) => g.id === goalId);
          if (!goal) return s;
          const tx: Transaction = {
            id: uid(),
            type: "expense",
            amount,
            category: "Savings",
            accountId,
            date: new Date().toISOString(),
            description: `Contribution to ${goal.name}`,
          };
          return {
            ...s,
            accounts: applyTxToAccounts(s.accounts, tx),
            transactions: [tx, ...s.transactions],
            goals: s.goals.map((g) => (g.id === goalId ? { ...g, saved: g.saved + amount } : g)),
          };
        }),
      addReview: (r) =>
        setState((s) => ({
          ...s,
          reviews: [{ ...r, id: uid(), createdAt: new Date().toISOString() }, ...s.reviews],
        })),
      addBudget: (b) => setState((s) => ({ ...s, budgets: [...s.budgets, { ...b, id: uid() }] })),
      updateBudget: (id, patch) =>
        setState((s) => ({
          ...s,
          budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      removeBudget: (id) =>
        setState((s) => ({ ...s, budgets: s.budgets.filter((b) => b.id !== id) })),
      addRecurring: (r) =>
        setState((s) => ({
          ...s,
          recurring: [...s.recurring, { ...r, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updateRecurring: (id, patch) =>
        setState((s) => ({
          ...s,
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeRecurring: (id) =>
        setState((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) })),
      addOpportunity: (o) =>
        setState((s) => ({
          ...s,
          opportunities: [
            { ...o, id: uid(), createdAt: new Date().toISOString() },
            ...s.opportunities,
          ],
        })),
      updateOpportunity: (id, patch) =>
        setState((s) => ({
          ...s,
          opportunities: s.opportunities.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      removeOpportunity: (id) =>
        setState((s) => ({ ...s, opportunities: s.opportunities.filter((o) => o.id !== id) })),
      markOpportunityPaid: (id, accountId) =>
        setState((s) => {
          const opp = s.opportunities.find((o) => o.id === id);
          if (!opp) return s;
          const tx: Transaction = {
            id: uid(),
            type: "income",
            amount: opp.amount,
            category: "Business",
            accountId,
            date: new Date().toISOString(),
            description: `Payment from ${opp.client}`,
          };
          return {
            ...s,
            accounts: applyTxToAccounts(s.accounts, tx),
            transactions: [tx, ...s.transactions],
            opportunities: s.opportunities.map((o) =>
              o.id === id ? { ...o, status: "paid", paidDate: new Date().toISOString() } : o,
            ),
          };
        }),
      addIncomeSource: (src) =>
        setState((s) => ({
          ...s,
          incomeSources: [
            ...s.incomeSources,
            { ...src, id: uid(), createdAt: new Date().toISOString() },
          ],
        })),
      updateIncomeSource: (id, patch) =>
        setState((s) => ({
          ...s,
          incomeSources: s.incomeSources.map((src) => (src.id === id ? { ...src, ...patch } : src)),
        })),
      removeIncomeSource: (id) =>
        setState((s) => ({
          ...s,
          incomeSources: s.incomeSources.filter((src) => src.id !== id),
        })),
      addInboxItem: (item) =>
        setState((s) => ({
          ...s,
          inbox: [
            { ...item, id: uid(), status: "new", createdAt: new Date().toISOString() },
            ...s.inbox,
          ],
        })),
      updateInboxItem: (id, patch) =>
        setState((s) => ({
          ...s,
          inbox: s.inbox.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      archiveInboxItem: (id) =>
        setState((s) => ({
          ...s,
          inbox: s.inbox.map((i) =>
            i.id === id ? { ...i, status: "archived", archivedAt: new Date().toISOString() } : i,
          ),
        })),
      removeInboxItem: (id) =>
        setState((s) => ({ ...s, inbox: s.inbox.filter((i) => i.id !== id) })),
      addDecision: (d) =>
        setState((s) => ({
          ...s,
          decisions: [{ ...d, id: uid(), createdAt: new Date().toISOString() }, ...s.decisions],
        })),
      recordDecisionOutcome: (id, outcome, note) =>
        setState((s) => ({
          ...s,
          decisions: s.decisions.map((d) =>
            d.id === id
              ? { ...d, outcome, outcomeNote: note, outcomeRecordedAt: new Date().toISOString() }
              : d,
          ),
        })),
      removeDecision: (id) =>
        setState((s) => ({ ...s, decisions: s.decisions.filter((d) => d.id !== id) })),
      resetFinancialData: () =>
        setState((s) => ({
          ...defaultState,
          // Keep the display currency so a reset app isn't suddenly foreign.
          profile: { ...defaultProfile, currency: s.profile.currency },
        })),
      reset: () => setState(defaultState),
      replaceState: (next) =>
        setState(pruneAllocations(processDueRecurring({ ...defaultState, ...next }))),
      syncStatus,
    }),
    [state, syncStatus],
  );

  return <FinanceContext.Provider value={api}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
