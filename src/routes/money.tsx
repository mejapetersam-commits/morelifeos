import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ImportTransactions } from "@/components/ImportTransactions";
import { useFinance } from "@/lib/finance-store";
import { computeMetrics, formatMoney, isValidAmount, parseAmount } from "@/lib/finance-utils";
import type {
  AccountType,
  Budget,
  RecurrenceFrequency,
  RecurringTransaction,
  Transaction,
  TxType,
} from "@/lib/finance-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Pencil, Search, Repeat, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/money")({
  head: () => ({
    meta: [
      { title: "Money — Accounts & Transactions | FinanceOS" },
      {
        name: "description",
        content: "Track your accounts and money movement with clarity.",
      },
    ],
  }),
  component: Money,
});

const categories = [
  "Food",
  "Transport",
  "Housing",
  "Lifestyle",
  "Business",
  "Investment",
  "Savings",
  "Income",
  "Other",
];

function Money() {
  const {
    state,
    addAccountWithOpeningBalance,
    recordOpeningBalance,
    updateAccount,
    removeAccount,
    addTransaction,
    updateTransaction,
    removeTransaction,
    addBudget,
    removeBudget,
    addRecurring,
    updateRecurring,
    removeRecurring,
  } = useFinance();
  const currency = state.profile.currency;
  const m = computeMetrics(state);

  // Transaction search/filter
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const filteredTx = useMemo(() => {
    return state.transactions.filter((t) => {
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
      if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.date) > new Date(`${dateTo}T23:59:59`)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const acct = state.accounts.find((a) => a.id === t.accountId);
        const haystack = `${t.description ?? ""} ${t.category} ${acct?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [state.transactions, state.accounts, search, filterCategory, filterAccount, dateFrom, dateTo]);

  // Any filter change invalidates the current page — e.g. narrowing a
  // filter down to 3 results while on page 4 would otherwise show nothing.
  useEffect(() => {
    setPage(1);
  }, [search, filterCategory, filterAccount, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredTx.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTx = filteredTx.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filtersActive =
    search.trim() || filterCategory !== "all" || filterAccount !== "all" || dateFrom || dateTo;

  return (
    <>
      <OnboardingModal />
      <AppShell>
        <SectionHeader
          title="Money"
          description="Where your money lives and how it moves. Structure builds understanding."
        />

        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-6">
            <div className="mb-4 flex justify-end">
              <AddAccountDialog
                onAdd={(a) =>
                  addAccountWithOpeningBalance(
                    { name: a.name, type: a.type, currency: a.currency },
                    a.balance,
                  )
                }
                defaultCurrency={currency}
              />
            </div>
            {state.accounts.length === 0 ? (
              <EmptyState text="No accounts yet. Add your first to start tracking." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {state.accounts.map((a) => {
                  const hasOpeningTx = state.transactions.some(
                    (t) => t.accountId === a.id && t.isOpeningBalance,
                  );
                  return (
                    <div
                      key={a.id}
                      className="group relative rounded-2xl bg-surface-elevated p-6 shadow-soft"
                    >
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">
                        {a.type}
                      </div>
                      <div className="mt-1 font-display text-lg font-semibold">{a.name}</div>
                      <div className="mt-4 font-display text-2xl font-semibold num">
                        {formatMoney(a.balance, a.currency)}
                      </div>
                      <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <EditAccountDialog
                          account={a}
                          onSave={(patch) => updateAccount(a.id, patch)}
                        />
                        <button
                          onClick={() => removeAccount(a.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                          aria-label="Delete account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {!hasOpeningTx && a.balance !== 0 && (
                        <button
                          onClick={() => recordOpeningBalance(a.id)}
                          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber hover:underline"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          This balance isn't backed by a transaction yet — record it
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search description, category, account…"
                  className="pl-9"
                  aria-label="Search transactions"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="w-[150px]" aria-label="Filter by account">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {state.accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
                aria-label="From date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
                aria-label="To date"
              />
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterCategory("all");
                    setFilterAccount("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Clear
                </Button>
              )}
              <div className="ml-auto">
                <AddTxDialog
                  accounts={state.accounts}
                  incomeSources={state.incomeSources}
                  onAdd={addTransaction}
                />
              </div>
            </div>

            {state.transactions.length === 0 ? (
              <EmptyState text="Record income and expenses to build your financial picture." />
            ) : filteredTx.length === 0 ? (
              <EmptyState text="No transactions match these filters." />
            ) : (
              <div className="overflow-hidden rounded-2xl bg-surface-elevated shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-accent/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTx.map((t) => {
                      const acct = state.accounts.find((a) => a.id === t.accountId);
                      const sign = t.type === "income" ? "+" : t.type === "expense" ? "−" : "";
                      const color =
                        t.type === "income"
                          ? "text-sage"
                          : t.type === "expense"
                            ? "text-foreground"
                            : "text-ocean";
                      return (
                        <tr key={t.id} className="border-t border-border/60">
                          <td className="px-4 py-3 num">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 capitalize">{t.type}</td>
                          <td className="px-4 py-3">{t.category}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {t.description || acct?.name || "—"}
                          </td>
                          <td className={`px-4 py-3 text-right num font-medium ${color}`}>
                            {sign} {formatMoney(t.amount, currency).replace("-", "")}
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-1">
                              <EditTransactionDialog
                                transaction={t}
                                onSave={(patch) => updateTransaction(t.id, patch)}
                              />
                              <button
                                onClick={() => removeTransaction(t.id)}
                                className="rounded p-2 text-muted-foreground hover:bg-accent"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filteredTx.length)} of {filteredTx.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="budgets" className="mt-6">
            <div className="mb-4 flex justify-end">
              <AddBudgetDialog
                existing={state.budgets.map((b) => String(b.category))}
                onAdd={addBudget}
              />
            </div>
            {state.budgets.length === 0 ? (
              <EmptyState text="Set a monthly limit per category to see how you're tracking." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {state.budgets.map((b) => {
                  const spent = m.byCategory[b.category] || 0;
                  const pct =
                    b.monthlyLimit > 0 ? Math.min(150, (spent / b.monthlyLimit) * 100) : 0;
                  const over = spent > b.monthlyLimit;
                  const near = !over && pct >= 80;
                  return (
                    <div key={b.id} className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-display text-base font-semibold">{b.category}</div>
                          <div className="mt-1 text-sm num text-muted-foreground">
                            {formatMoney(spent, currency)} of{" "}
                            {formatMoney(b.monthlyLimit, currency)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeBudget(b.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                          aria-label="Remove budget"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Progress
                        value={Math.min(100, pct)}
                        className={`mt-4 h-2 ${over ? "[&>div]:bg-destructive" : near ? "[&>div]:bg-gold" : "[&>div]:bg-sage"}`}
                      />
                      {over && (
                        <p className="mt-2 text-xs font-medium text-destructive">
                          {formatMoney(spent - b.monthlyLimit, currency)} over budget this month
                        </p>
                      )}
                      {near && (
                        <p className="mt-2 text-xs font-medium text-gold">
                          Approaching the limit — {Math.round(pct)}% used
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <div className="mb-4 flex justify-end">
              <AddRecurringDialog accounts={state.accounts} onAdd={addRecurring} />
            </div>
            {state.recurring.length === 0 ? (
              <EmptyState text="Add rent, salary, or subscriptions so they post automatically." />
            ) : (
              <div className="overflow-hidden rounded-2xl bg-surface-elevated shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-accent/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">Next</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Active</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.recurring.map((r) => (
                      <tr key={r.id} className="border-t border-border/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                            {r.description || r.category}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{r.type}</td>
                        <td className="px-4 py-3 capitalize">{r.frequency}</td>
                        <td className="px-4 py-3 num">
                          {new Date(r.nextDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right num font-medium">
                          {formatMoney(r.amount, currency)}
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            checked={r.active}
                            onCheckedChange={(checked) =>
                              updateRecurring(r.id, { active: checked })
                            }
                            aria-label={`${r.active ? "Deactivate" : "Activate"} ${r.description || r.category}`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <button
                            onClick={() => removeRecurring(r.id)}
                            className="rounded p-2 text-muted-foreground hover:bg-accent"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <ImportTransactions accounts={state.accounts} onImport={addTransaction} />
          </TabsContent>
        </Tabs>
      </AppShell>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function AddAccountDialog({
  onAdd,
  defaultCurrency,
}: {
  onAdd: (a: { name: string; type: AccountType; balance: number; currency: string }) => void;
  defaultCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [balance, setBalance] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      type,
      balance: parseAmount(balance) || 0,
      currency: defaultCurrency,
    });
    setName("");
    setBalance("");
    setType("bank");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-ocean text-ocean-foreground hover:bg-ocean/90">
          <Plus className="mr-2 h-4 w-4" /> New account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-acct-name">Name</Label>
            <Input
              id="add-acct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Salary account"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-acct-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id="add-acct-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="mobile">Mobile money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-acct-balance">Starting balance</Label>
            <Input
              id="add-acct-balance"
              inputMode="numeric"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <Button
            onClick={submit}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Add account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog({
  account,
  onSave,
}: {
  account: { id: string; name: string; type: AccountType; balance: number };
  onSave: (patch: { name: string; type: AccountType; balance: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.name);
  const [type, setType] = useState<AccountType>(account.type);
  const [balance, setBalance] = useState(String(account.balance));
  const uid = useId();

  const openWithReset = (next: boolean) => {
    if (next) {
      setName(account.name);
      setType(account.type);
      setBalance(String(account.balance));
    }
    setOpen(next);
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), type, balance: parseAmount(balance) || 0 });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={openWithReset}>
      <DialogTrigger asChild>
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          aria-label="Edit account"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-name`}>Name</Label>
            <Input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-type`}>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id={`${uid}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="mobile">Mobile money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-balance`}>Balance</Label>
            <Input
              id={`${uid}-balance`}
              inputMode="numeric"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Adjusting this directly changes the balance without creating a transaction.
            </p>
          </div>
          <Button
            onClick={submit}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddTxDialog({
  accounts,
  incomeSources,
  onAdd,
}: {
  accounts: { id: string; name: string; type: AccountType }[];
  incomeSources: { id: string; name: string }[];
  onAdd: (t: {
    type: TxType;
    amount: number;
    category: string;
    accountId: string;
    toAccountId?: string;
    date: string;
    description?: string;
    sourceId?: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [sourceId, setSourceId] = useState<string>("none");

  const disabled = !accountId || !isValidAmount(amount);

  const submit = () => {
    if (disabled) return;
    onAdd({
      type,
      amount: parseAmount(amount),
      category: type === "income" ? "Income" : category,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      date: new Date(date).toISOString(),
      description: description.trim() || undefined,
      sourceId: type === "income" && sourceId !== "none" ? sourceId : undefined,
    });
    setAmount("");
    setDescription("");
    setSourceId("none");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={accounts.length === 0}
          className="bg-gold text-gold-foreground hover:bg-gold/90"
        >
          <Plus className="mr-2 h-4 w-4" /> Record transaction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Transaction type">
            {(["income", "expense", "transfer", "investment"] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`rounded-lg border px-2 py-2 text-xs capitalize transition-colors ${
                  type === t
                    ? "border-ocean bg-ocean text-ocean-foreground"
                    : "border-border hover:border-ocean/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx-account">{type === "transfer" ? "From account" : "Account"}</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="tx-account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "income" && incomeSources.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="tx-source">Income source (optional)</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger id="tx-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {incomeSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type === "transfer" && (
            <div className="space-y-1.5">
              <Label htmlFor="tx-to-account">To account</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger id="tx-to-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {type !== "income" && type !== "transfer" && (
            <div className="space-y-1.5">
              <Label htmlFor="tx-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="tx-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="tx-note">Note (optional)</Label>
            <Input
              id="tx-note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button
            onClick={submit}
            disabled={disabled}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Save transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditTransactionDialog({
  transaction,
  onSave,
}: {
  transaction: Transaction;
  onSave: (patch: Partial<Omit<Transaction, "id">>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(String(transaction.category));
  const [date, setDate] = useState(transaction.date.slice(0, 10));
  const [description, setDescription] = useState(transaction.description || "");
  const uid = useId();

  const openWithReset = (next: boolean) => {
    if (next) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategory(String(transaction.category));
      setDate(transaction.date.slice(0, 10));
      setDescription(transaction.description || "");
    }
    setOpen(next);
  };

  const submit = () => {
    if (!isValidAmount(amount)) return;
    onSave({
      type,
      amount: parseAmount(amount),
      category: type === "income" ? "Income" : category,
      date: new Date(date).toISOString(),
      description: description.trim() || undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={openWithReset}>
      <DialogTrigger asChild>
        <button
          className="rounded p-2 text-muted-foreground hover:bg-accent"
          aria-label="Edit transaction"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {transaction.type !== "transfer" && (
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Transaction type">
              {(["income", "expense", "investment"] as TxType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  aria-pressed={type === t}
                  className={`rounded-lg border px-2 py-2 text-xs capitalize transition-colors ${
                    type === t
                      ? "border-ocean bg-ocean text-ocean-foreground"
                      : "border-border hover:border-ocean/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-amount`}>Amount</Label>
              <Input
                id={`${uid}-amount`}
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-date`}>Date</Label>
              <Input
                id={`${uid}-date`}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          {type !== "income" && type !== "transfer" && (
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-category`}>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id={`${uid}-category`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-note`}>Note (optional)</Label>
            <Input
              id={`${uid}-note`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {transaction.type === "transfer" && (
            <p className="text-xs text-muted-foreground">
              Transfers keep their type and accounts fixed here — delete and re-add if you need to
              change which accounts were involved.
            </p>
          )}
          <Button
            onClick={submit}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddBudgetDialog({
  existing,
  onAdd,
}: {
  existing: string[];
  onAdd: (b: Omit<Budget, "id">) => void;
}) {
  const available = categories.filter((c) => c !== "Income" && !existing.includes(c));
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(available[0] || "Food");
  const [limit, setLimit] = useState("");

  const submit = () => {
    if (!isValidAmount(limit)) return;
    onAdd({ category, monthlyLimit: parseAmount(limit) });
    setLimit("");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setCategory(available[0] || "Food");
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          disabled={available.length === 0}
          className="bg-ocean text-ocean-foreground hover:bg-ocean/90"
        >
          <Plus className="mr-2 h-4 w-4" /> New budget
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a category budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="budget-category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="budget-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget-limit">Monthly limit</Label>
            <Input
              id="budget-limit"
              inputMode="numeric"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <Button
            onClick={submit}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Save budget
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function nextOccurrence(frequency: RecurrenceFrequency, anchor: number): string {
  const now = new Date();
  if (frequency === "weekly") {
    const d = new Date(now);
    const diff = (anchor - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  const day = Math.min(anchor, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
  let d = new Date(now.getFullYear(), now.getMonth(), day, 9, 0, 0);
  if (d.getTime() <= now.getTime()) {
    const nextMonthDay = Math.min(
      anchor,
      new Date(now.getFullYear(), now.getMonth() + 2, 0).getDate(),
    );
    d = new Date(now.getFullYear(), now.getMonth() + 1, nextMonthDay, 9, 0, 0);
  }
  return d.toISOString();
}

function AddRecurringDialog({
  accounts,
  onAdd,
}: {
  accounts: { id: string; name: string }[];
  onAdd: (r: Omit<RecurringTransaction, "id" | "createdAt">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Housing");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [anchor, setAnchor] = useState("1");
  const [description, setDescription] = useState("");

  const disabled = !accountId || !isValidAmount(amount);

  const submit = () => {
    if (disabled) return;
    const anchorNum = Number(anchor) || 1;
    onAdd({
      type,
      amount: parseAmount(amount),
      category: type === "income" ? "Income" : category,
      accountId,
      frequency,
      anchor: anchorNum,
      nextDate: nextOccurrence(frequency, anchorNum),
      active: true,
      description: description.trim() || undefined,
    });
    setAmount("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={accounts.length === 0}
          className="bg-gold text-gold-foreground hover:bg-gold/90"
        >
          <Plus className="mr-2 h-4 w-4" /> New recurring
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recurring transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Transaction type">
            {(["income", "expense", "investment"] as TxType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`rounded-lg border px-2 py-2 text-xs capitalize transition-colors ${
                  type === t
                    ? "border-ocean bg-ocean text-ocean-foreground"
                    : "border-border hover:border-ocean/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input
                id="rec-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-frequency">Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}
              >
                <SelectTrigger id="rec-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-anchor">
              {frequency === "monthly" ? "Day of month (1-31)" : "Day of week (0=Sun-6=Sat)"}
            </Label>
            <Input
              id="rec-anchor"
              inputMode="numeric"
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-account">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="rec-account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type !== "income" && (
            <div className="space-y-1.5">
              <Label htmlFor="rec-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="rec-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="rec-label">Label (e.g. "Rent", "Salary")</Label>
            <Input
              id="rec-label"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button
            onClick={submit}
            disabled={disabled}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Save recurring transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
