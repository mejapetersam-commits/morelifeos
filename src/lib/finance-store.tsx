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
  Budget,
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
};

interface Ctx {
  state: FinanceState;
  setProfile: (p: Partial<Profile>) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  /** Posts accrued interest/growth as a real income transaction and refreshes the account's rate-confirmed date. */
  postAccountGrowth: (accountId: string, amount: number) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  removeTransaction: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
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

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Ctx["syncStatus"]>("local");
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const cloudReady = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const loaded = raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
      setState(processDueRecurring(loaded));
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
    (async () => {
      try {
        const res = await fetch("/api/finance-data");
        if (!res.ok) throw new Error(`GET /api/finance-data failed: ${res.status}`);
        const body = (await res.json()) as { data: FinanceState | null };
        if (cancelled) return;
        if (body.data) {
          setState(processDueRecurring({ ...defaultState, ...body.data }));
        } else {
          await fetch("/api/finance-data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      removeGoal: (id) => setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
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
      reset: () => setState(defaultState),
      replaceState: (next) => setState(processDueRecurring({ ...defaultState, ...next })),
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
