import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { formatMoney, isValidAmount, parseAmount } from "@/lib/finance-utils";
import { accountAllocationView, goalFunding, validateAllocation } from "@/lib/allocations";
import type { Account, Allocation, Goal } from "@/lib/finance-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, AlertTriangle, X } from "lucide-react";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goals — FinanceOS" },
      {
        name: "description",
        content: "Define financial goals and see the monthly effort they require.",
      },
    ],
  }),
  component: Goals,
});

function monthsBetween(a: Date, b: Date) {
  const y = b.getFullYear() - a.getFullYear();
  const m = b.getMonth() - a.getMonth();
  return Math.max(1, y * 12 + m);
}

function Goals() {
  const { state, addGoal, updateGoal, removeGoal, contributeToGoal, setAllocation } = useFinance();
  const currency = state.profile.currency;

  return (
    <>
      <OnboardingModal />
      <AppShell>
        <SectionHeader
          title="Goals"
          description="Money without direction drifts. A clear goal reshapes daily choices."
          action={<AddGoalDialog onAdd={addGoal} />}
        />

        {state.goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <p className="text-sm text-muted-foreground">
              You haven't set a goal yet. Start with something meaningful — an emergency fund, an
              asset, or a business seed.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {state.goals.map((g) => {
              const funding = goalFunding(g, state.allocations, state.accounts);
              const months = monthsBetween(new Date(), new Date(g.deadline));
              const monthly = Math.max(0, funding.remaining / months);
              return (
                <div key={g.id} className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-lg font-semibold">{g.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Deadline {new Date(g.deadline).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <EditGoalDialog goal={g} onSave={(patch) => updateGoal(g.id, patch)} />
                      <button
                        onClick={() => removeGoal(g.id)}
                        className="rounded p-2 text-muted-foreground hover:bg-accent"
                        aria-label="Delete goal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="num font-medium">
                        {formatMoney(funding.funded, currency)}
                      </span>
                      <span className="num text-muted-foreground">
                        of {formatMoney(g.target, currency)}
                      </span>
                    </div>
                    <Progress value={funding.percent} className="mt-2 h-2" />
                    <div className="mt-1 text-xs text-muted-foreground num">
                      {funding.percent}% complete · {formatMoney(funding.remaining, currency)}{" "}
                      remaining
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniStat label="Allocated" value={formatMoney(funding.allocated, currency)} />
                    <MiniStat label="Monthly effort" value={formatMoney(monthly, currency)} />
                    <MiniStat label="Months left" value={String(months)} />
                  </div>

                  <GoalAllocations
                    goal={g}
                    accounts={state.accounts}
                    allocations={state.allocations}
                    currency={currency}
                    onSet={(accountId, amount) => setAllocation(g.id, accountId, amount)}
                  />

                  <AddContribution
                    accounts={state.accounts}
                    onAdd={(accountId, amount) => contributeToGoal(g.id, accountId, amount)}
                    currency={currency}
                  />
                </div>
              );
            })}
          </div>
        )}
      </AppShell>
    </>
  );
}

function AddContribution({
  accounts,
  onAdd,
  currency,
}: {
  accounts: Account[];
  onAdd: (accountId: string, amount: number) => void;
  currency: string;
}) {
  const [v, setV] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");

  if (accounts.length === 0) {
    return (
      <p className="mt-4 text-xs text-muted-foreground">
        Add an account on the Money page first — a contribution needs to come from somewhere.
      </p>
    );
  }

  const submit = () => {
    if (isValidAmount(v) && accountId) {
      onAdd(accountId, parseAmount(v));
      setV("");
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={`Amount (${currency})`}
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
        <Button onClick={submit} className="bg-sage text-sage-foreground hover:bg-sage/90 shrink-0">
          Add
        </Button>
      </div>
      <Select value={accountId} onValueChange={setAccountId}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="From account" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        This moves real money — it posts a transaction and reduces the account's balance.
      </p>
    </div>
  );
}

function AddGoalDialog({
  onAdd,
}: {
  onAdd: (g: { name: string; target: number; saved: number; deadline: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10),
  );

  const submit = () => {
    if (!name.trim() || !isValidAmount(target)) return;
    onAdd({
      name: name.trim(),
      target: parseAmount(target),
      saved: parseAmount(saved) || 0,
      deadline: new Date(deadline).toISOString(),
    });
    setOpen(false);
    setName("");
    setTarget("");
    setSaved("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gold text-gold-foreground hover:bg-gold/90">
          <Plus className="mr-2 h-4 w-4" /> New goal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Define a goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-goal-name">Goal name</Label>
            <Input
              id="add-goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="add-goal-target">Target amount</Label>
              <Input
                id="add-goal-target"
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-goal-saved">Already saved</Label>
              <Input
                id="add-goal-saved"
                inputMode="numeric"
                value={saved}
                onChange={(e) => setSaved(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-goal-deadline">Target date</Label>
            <Input
              id="add-goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            "Already saved" is a starting point only, not linked to a transaction — use "Add
            contribution" afterwards for amounts that should move real money.
          </p>
          <Button
            onClick={submit}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Create goal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditGoalDialog({
  goal,
  onSave,
}: {
  goal: Goal;
  onSave: (patch: { name: string; target: number; deadline: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(String(goal.target));
  const [deadline, setDeadline] = useState(goal.deadline.slice(0, 10));
  const uid = useId();

  const openWithReset = (next: boolean) => {
    if (next) {
      setName(goal.name);
      setTarget(String(goal.target));
      setDeadline(goal.deadline.slice(0, 10));
    }
    setOpen(next);
  };

  const submit = () => {
    if (!name.trim() || !isValidAmount(target)) return;
    onSave({
      name: name.trim(),
      target: parseAmount(target),
      deadline: new Date(deadline).toISOString(),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={openWithReset}>
      <DialogTrigger asChild>
        <button
          className="rounded p-2 text-muted-foreground hover:bg-accent"
          aria-label="Edit goal"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-name`}>Goal name</Label>
            <Input id={`${uid}-name`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-target`}>Target amount</Label>
            <Input
              id={`${uid}-target`}
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-deadline`}>Target date</Label>
            <Input
              id={`${uid}-deadline`}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            To change the saved amount, use "Add contribution" on the goal card instead — that keeps
            it linked to a real transaction.
          </p>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-accent/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-base font-semibold num">{value}</div>
    </div>
  );
}

/**
 * Allocation panel. Assigning money to a goal never moves it — the
 * account balance stays put and only its "available to allocate" drops.
 */
function GoalAllocations({
  goal,
  accounts,
  allocations,
  currency,
  onSet,
}: {
  goal: Goal;
  accounts: Account[];
  allocations: Allocation[];
  currency: string;
  onSet: (accountId: string, amount: number) => void;
}) {
  const mine = allocations.filter((a) => a.goalId === goal.id);
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");

  const selected = accounts.find((a) => a.id === accountId);
  const parsed = parseAmount(amount) || 0;
  const check = selected
    ? validateAllocation(accounts, allocations, selected.id, goal.id, parsed)
    : null;

  const submit = () => {
    if (!selected || !check?.ok || parsed <= 0) return;
    onSet(selected.id, parsed);
    setAmount("");
  };

  return (
    <div className="mt-5 rounded-xl border border-border/60 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Funded by
        </div>
        <div className="text-[11px] text-muted-foreground">Money stays in the account</div>
      </div>

      {mine.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No accounts assigned yet. Allocate part of an existing balance below.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {mine.map((al) => {
            const acct = accounts.find((a) => a.id === al.accountId);
            return (
              <li key={al.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{acct?.name ?? "Unknown account"}</span>
                <span className="flex items-center gap-2">
                  <span className="num font-medium">{formatMoney(al.amount, currency)}</span>
                  <button
                    onClick={() => onSet(al.accountId, 0)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                    aria-label={`Remove allocation from ${acct?.name ?? "account"}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {accounts.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 text-xs" aria-label="Account to allocate from">
                <SelectValue placeholder="Allocate from…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => {
                  const view = accountAllocationView(a, allocations);
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {formatMoney(view.available, currency)} free
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Input
              className="h-9 max-w-[130px]"
              placeholder="Amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Allocation amount"
            />
            <Button
              className="h-9 shrink-0 bg-royal text-ocean-foreground hover:bg-royal/90"
              onClick={submit}
              disabled={!selected || parsed <= 0 || !check?.ok}
            >
              Allocate
            </Button>
          </div>
          {selected && parsed > 0 && check && !check.ok && (
            <p className="flex items-center gap-1.5 text-xs text-coral">
              <AlertTriangle className="h-3.5 w-3.5" />
              Over-allocated by {formatMoney(check.overBy, currency)} — {selected.name} has{" "}
              {formatMoney(Math.max(0, check.max), currency)} available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
