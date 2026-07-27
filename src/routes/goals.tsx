import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { formatMoney } from "@/lib/finance-utils";
import type { Account, Goal } from "@/lib/finance-types";
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
import { Plus, Trash2, Pencil } from "lucide-react";

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
  const { state, addGoal, updateGoal, removeGoal, contributeToGoal } = useFinance();
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
              const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              const months = monthsBetween(new Date(), new Date(g.deadline));
              const monthly = Math.max(0, (g.target - g.saved) / months);
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
                      <span className="num font-medium">{formatMoney(g.saved, currency)}</span>
                      <span className="num text-muted-foreground">
                        of {formatMoney(g.target, currency)}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-2 h-2" />
                    <div className="mt-1 text-xs text-muted-foreground num">{pct}% complete</div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-accent/40 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Monthly effort
                      </div>
                      <div className="mt-1 font-display text-base font-semibold num">
                        {formatMoney(monthly, currency)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-accent/40 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        Months left
                      </div>
                      <div className="mt-1 font-display text-base font-semibold num">{months}</div>
                    </div>
                  </div>
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
    if (Number(v) > 0 && accountId) {
      onAdd(accountId, Number(v));
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
    if (!name.trim() || !Number(target)) return;
    onAdd({
      name: name.trim(),
      target: Number(target),
      saved: Number(saved) || 0,
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
            <Label>Goal name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Target amount</Label>
              <Input
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Already saved</Label>
              <Input inputMode="numeric" value={saved} onChange={(e) => setSaved(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Target date</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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

  const openWithReset = (next: boolean) => {
    if (next) {
      setName(goal.name);
      setTarget(String(goal.target));
      setDeadline(goal.deadline.slice(0, 10));
    }
    setOpen(next);
  };

  const submit = () => {
    if (!name.trim() || !Number(target)) return;
    onSave({
      name: name.trim(),
      target: Number(target),
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
            <Label>Goal name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target amount</Label>
            <Input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target date</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
