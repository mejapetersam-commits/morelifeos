import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, FinanceState, Goal, Profile, Review, Transaction } from "./finance-types";

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
};

interface Ctx {
  state: FinanceState;
  setProfile: (p: Partial<Profile>) => void;
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  addTransaction: (t: Omit<Transaction, "id">) => void;
  removeTransaction: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "createdAt">) => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addReview: (r: Omit<Review, "id" | "createdAt">) => void;
  reset: () => void;
}

const FinanceContext = createContext<Ctx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

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
          const accounts = s.accounts.map((a) => {
            if (a.id === tx.accountId) {
              const delta =
                tx.type === "income"
                  ? tx.amount
                  : tx.type === "expense" || tx.type === "investment" || tx.type === "transfer"
                    ? -tx.amount
                    : 0;
              return { ...a, balance: a.balance + delta };
            }
            if (tx.type === "transfer" && a.id === tx.toAccountId) {
              return { ...a, balance: a.balance + tx.amount };
            }
            return a;
          });
          return { ...s, accounts, transactions: [tx, ...s.transactions] };
        }),
      removeTransaction: (id) =>
        setState((s) => {
          const tx = s.transactions.find((t) => t.id === id);
          if (!tx) return s;
          const accounts = s.accounts.map((a) => {
            if (a.id === tx.accountId) {
              const delta =
                tx.type === "income"
                  ? -tx.amount
                  : tx.type === "expense" || tx.type === "investment" || tx.type === "transfer"
                    ? tx.amount
                    : 0;
              return { ...a, balance: a.balance + delta };
            }
            if (tx.type === "transfer" && a.id === tx.toAccountId) {
              return { ...a, balance: a.balance - tx.amount };
            }
            return a;
          });
          return { ...s, accounts, transactions: s.transactions.filter((t) => t.id !== id) };
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
        setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
      addReview: (r) =>
        setState((s) => ({
          ...s,
          reviews: [
            { ...r, id: uid(), createdAt: new Date().toISOString() },
            ...s.reviews,
          ],
        })),
      reset: () => setState(defaultState),
    }),
    [state],
  );

  return <FinanceContext.Provider value={api}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
