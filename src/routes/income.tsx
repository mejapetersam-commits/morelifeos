import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader, SectionTitle, StatCard } from "@/components/finance-cards";
import { useFinance } from "@/lib/finance-store";
import { formatMoney, computePipelineMetrics, computeSourceAnalytics } from "@/lib/finance-utils";
import type {
  IncomeOpportunity,
  IncomeSource,
  IncomeSourceStatus,
  OpportunityStatus,
} from "@/lib/finance-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Pencil, CheckCircle2, Star, Activity, Briefcase } from "lucide-react";

export const Route = createFileRoute("/income")({
  head: () => ({
    meta: [
      { title: "Income | FinanceOS" },
      {
        name: "description",
        content: "Track expected income and understand where your money comes from.",
      },
    ],
  }),
  component: IncomePage,
});

const statusLabels: Record<OpportunityStatus, string> = {
  idea: "Idea",
  quoted: "Quoted",
  negotiating: "Negotiating",
  confirmed: "Confirmed",
  paid: "Paid",
  cancelled: "Cancelled",
};

const statusOrder: OpportunityStatus[] = [
  "idea",
  "quoted",
  "negotiating",
  "confirmed",
  "paid",
  "cancelled",
];

const statusBadge: Record<OpportunityStatus, string> = {
  idea: "bg-accent text-foreground/70",
  quoted: "bg-royal/15 text-royal",
  negotiating: "bg-amber/15 text-amber",
  confirmed: "bg-ocean/15 text-ocean",
  paid: "bg-sage/15 text-sage",
  cancelled: "bg-coral/15 text-coral",
};

const sourceCategories = [
  "Salary",
  "Freelancing",
  "Business",
  "Investments",
  "Rental Income",
  "Side Hustle",
  "Other",
];

function IncomePage() {
  const {
    state,
    addOpportunity,
    updateOpportunity,
    removeOpportunity,
    markOpportunityPaid,
    addIncomeSource,
    updateIncomeSource,
    removeIncomeSource,
  } = useFinance();
  const currency = state.profile.currency;
  const pipeline = computePipelineMetrics(state);
  const sourceAnalytics = computeSourceAnalytics(state);

  return (
    <AppShell>
      <SectionHeader
        title="Income"
        description="Where money is coming from, and what's still on the way."
      />

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        {/* ─── Pipeline ─────────────────────────────────────────── */}
        <TabsContent value="pipeline" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              label="Expected"
              value={formatMoney(pipeline.expected, currency)}
              accent="royal"
            />
            <StatCard
              label="Confirmed"
              value={formatMoney(pipeline.confirmed, currency)}
              accent="ocean"
            />
            <StatCard
              label="Collected"
              value={formatMoney(pipeline.collected, currency)}
              accent="emerald"
            />
            <StatCard label="Lost" value={formatMoney(pipeline.lost, currency)} accent="coral" />
            <StatCard
              label="Conversion rate"
              value={`${pipeline.conversionRate.toFixed(0)}%`}
              hint="paid vs. cancelled"
              accent="gold"
            />
          </div>

          <div className="mt-8">
            <SectionTitle
              eyebrow="Opportunities"
              title="Pipeline"
              action={<AddOpportunityDialog onAdd={addOpportunity} />}
            />

            {state.opportunities.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                text="No opportunities yet. Add a quote or negotiation in progress to start forecasting income."
              />
            ) : (
              <div className="space-y-3">
                {state.opportunities
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime(),
                  )
                  .map((o) => (
                    <OpportunityRow
                      key={o.id}
                      opportunity={o}
                      currency={currency}
                      accounts={state.accounts}
                      onUpdate={(patch) => updateOpportunity(o.id, patch)}
                      onRemove={() => removeOpportunity(o.id)}
                      onMarkPaid={(accountId) => markOpportunityPaid(o.id, accountId)}
                    />
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── Sources ──────────────────────────────────────────── */}
        <TabsContent value="sources" className="mt-6">
          <div className="mb-4 flex justify-end">
            <AddSourceDialog onAdd={addIncomeSource} />
          </div>

          {state.incomeSources.length === 0 ? (
            <EmptyState
              icon={Activity}
              text="Add your income sources (salary, freelancing, rental, etc.) to see how each one is performing."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sourceAnalytics.map((a) => (
                <SourceCard
                  key={a.source.id}
                  analytics={a}
                  currency={currency}
                  onSave={(patch) => updateIncomeSource(a.source.id, patch)}
                  onRemove={() => removeIncomeSource(a.source.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Briefcase; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function OpportunityRow({
  opportunity: o,
  currency,
  accounts,
  onUpdate,
  onRemove,
  onMarkPaid,
}: {
  opportunity: IncomeOpportunity;
  currency: string;
  accounts: { id: string; name: string }[];
  onUpdate: (patch: Partial<IncomeOpportunity>) => void;
  onRemove: () => void;
  onMarkPaid: (accountId: string) => void;
}) {
  const closed = o.status === "paid" || o.status === "cancelled";
  return (
    <div className="rounded-2xl bg-surface-elevated p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-base font-semibold">{o.client}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Expected {new Date(o.expectedDate).toLocaleDateString()} · {o.probability}% likely
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="num text-lg font-semibold">{formatMoney(o.amount, currency)}</span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge[o.status]}`}>
            {statusLabels[o.status]}
          </span>
        </div>
      </div>
      {o.notes && <p className="mt-2 text-sm text-muted-foreground">{o.notes}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!closed && (
          <Select
            value={o.status}
            onValueChange={(v) => onUpdate({ status: v as OpportunityStatus })}
          >
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOrder.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!closed && accounts.length > 0 && (
          <MarkPaidDialog accounts={accounts} onConfirm={onMarkPaid} />
        )}
        {!closed && (
          <button
            onClick={() => onUpdate({ status: "cancelled" })}
            className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
          >
            Mark lost
          </button>
        )}
        <button
          onClick={onRemove}
          className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function MarkPaidDialog({
  accounts,
  onConfirm,
}: {
  accounts: { id: string; name: string }[];
  onConfirm: (accountId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 rounded-lg bg-sage/10 px-2.5 py-1 text-xs font-medium text-sage hover:bg-sage/20">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark paid
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Which account received this?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
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
          <p className="text-xs text-muted-foreground">
            This posts an income transaction to that account and marks the opportunity paid.
          </p>
          <Button
            onClick={() => {
              onConfirm(accountId);
              setOpen(false);
            }}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Confirm payment received
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddOpportunityDialog({
  onAdd,
}: {
  onAdd: (o: Omit<IncomeOpportunity, "id" | "createdAt">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState("");
  const [amount, setAmount] = useState("");
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<OpportunityStatus>("idea");
  const [probability, setProbability] = useState("50");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!client.trim() || !amount || Number(amount) <= 0) return;
    onAdd({
      client: client.trim(),
      amount: Number(amount),
      expectedDate: new Date(expectedDate).toISOString(),
      status,
      probability: Math.min(100, Math.max(0, Number(probability) || 0)),
      notes: notes.trim() || undefined,
    });
    setClient("");
    setAmount("");
    setNotes("");
    setStatus("idea");
    setProbability("50");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-ocean text-ocean-foreground hover:bg-ocean/90">
          <Plus className="mr-2 h-4 w-4" /> New opportunity
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New income opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="opp-client">Client / project</Label>
            <Input id="opp-client" value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="opp-amount">Amount</Label>
              <Input
                id="opp-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-date">Expected date</Label>
              <Input
                id="opp-date"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="opp-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OpportunityStatus)}>
                <SelectTrigger id="opp-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOrder
                    .filter((s) => s !== "paid")
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="opp-probability">Probability (%)</Label>
              <Input
                id="opp-probability"
                inputMode="numeric"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="opp-notes">Notes (optional)</Label>
            <Textarea
              id="opp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            onClick={submit}
            className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
          >
            Add opportunity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SourceCard({
  analytics: a,
  currency,
  onSave,
  onRemove,
}: {
  analytics: ReturnType<typeof computeSourceAnalytics>[number];
  currency: string;
  onSave: (patch: Partial<IncomeSource>) => void;
  onRemove: () => void;
}) {
  const { source } = a;
  const targetProgress =
    source.monthlyTarget && source.monthlyTarget > 0
      ? Math.min(100, (a.thisMonth / source.monthlyTarget) * 100)
      : null;

  return (
    <div className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-base font-semibold">{source.name}</div>
            {a.isBestPerforming && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold">
                <Star className="h-3 w-3" /> Top this month
              </span>
            )}
            {a.isMostConsistent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2 py-0.5 text-[10px] font-medium text-sage">
                Most consistent
              </span>
            )}
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {source.category} · <span className="capitalize">{source.status}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <EditSourceDialog source={source} onSave={onSave} />
          <button
            onClick={onRemove}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label="Delete source"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">This month</div>
          <div className="num font-semibold">{formatMoney(a.thisMonth, currency)}</div>
          {a.momGrowthPct !== null && (
            <div className={`text-xs ${a.momGrowthPct >= 0 ? "text-sage" : "text-coral"}`}>
              {a.momGrowthPct >= 0 ? "+" : ""}
              {a.momGrowthPct.toFixed(0)}% vs last month
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Year to date</div>
          <div className="num font-semibold">{formatMoney(a.ytd, currency)}</div>
          <div className="text-xs text-muted-foreground">
            {a.pctContributionThisMonth.toFixed(0)}% of this month's income
          </div>
        </div>
      </div>

      {targetProgress !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Monthly target</span>
            <span className="num">{formatMoney(source.monthlyTarget!, currency)}</span>
          </div>
          <Progress value={targetProgress} className="mt-1.5 h-2 [&>div]:bg-ocean" />
        </div>
      )}
    </div>
  );
}

function SourceForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<IncomeSource>;
  onSubmit: (v: Omit<IncomeSource, "id" | "createdAt">) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || sourceCategories[0]);
  const [status, setStatus] = useState<IncomeSourceStatus>(initial?.status || "active");
  const [monthlyTarget, setMonthlyTarget] = useState(String(initial?.monthlyTarget ?? ""));
  const [annualTarget, setAnnualTarget] = useState(String(initial?.annualTarget ?? ""));
  const uid = useId();

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category,
      status,
      monthlyTarget: monthlyTarget ? Number(monthlyTarget) : undefined,
      annualTarget: annualTarget ? Number(annualTarget) : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-name`}>Name</Label>
        <Input
          id={`${uid}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Freelance design"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-category`}>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id={`${uid}-category`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-status`}>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as IncomeSourceStatus)}>
            <SelectTrigger id={`${uid}-status`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-monthly`}>Monthly target (optional)</Label>
          <Input
            id={`${uid}-monthly`}
            inputMode="numeric"
            value={monthlyTarget}
            onChange={(e) => setMonthlyTarget(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-annual`}>Annual target (optional)</Label>
          <Input
            id={`${uid}-annual`}
            inputMode="numeric"
            value={annualTarget}
            onChange={(e) => setAnnualTarget(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Attribute income transactions to this source from the "Record transaction" dialog on the
        Money page to see it reflected here.
      </p>
      <Button onClick={submit} className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90">
        {submitLabel}
      </Button>
    </div>
  );
}

function AddSourceDialog({
  onAdd,
}: {
  onAdd: (s: Omit<IncomeSource, "id" | "createdAt">) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-ocean text-ocean-foreground hover:bg-ocean/90">
          <Plus className="mr-2 h-4 w-4" /> New source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an income source</DialogTitle>
        </DialogHeader>
        <SourceForm
          submitLabel="Add source"
          onSubmit={(v) => {
            onAdd(v);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditSourceDialog({
  source,
  onSave,
}: {
  source: IncomeSource;
  onSave: (patch: Partial<IncomeSource>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          aria-label="Edit source"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {source.name}</DialogTitle>
        </DialogHeader>
        <SourceForm
          initial={source}
          submitLabel="Save changes"
          onSubmit={(v) => {
            onSave(v);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
