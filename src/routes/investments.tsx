import { createFileRoute } from "@tanstack/react-router";
import { useId, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader, SectionTitle, StatCard } from "@/components/finance-cards";
import { useFinance } from "@/lib/finance-store";
import {
  formatMoney,
  futureValue,
  accruedSinceUpdate,
  computeInvestmentSummary,
  institutionLabel,
} from "@/lib/finance-utils";
import type {
  Account,
  CompoundingFrequency,
  InstitutionType,
  RiskLevel,
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
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  PiggyBank,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/investments")({
  head: () => ({
    meta: [
      { title: "Investments & Savings | FinanceOS" },
      {
        name: "description",
        content: "Track savings and investment accounts, returns, and projected growth.",
      },
    ],
  }),
  component: InvestmentsPage,
});

const institutionTypes: { value: InstitutionType; label: string }[] = [
  { value: "bank", label: "Bank / Fixed Deposit" },
  { value: "mmf", label: "Money Market Fund" },
  { value: "sacco", label: "SACCO" },
  { value: "broker", label: "Stocks / Broker" },
  { value: "crypto", label: "Crypto" },
  { value: "bond", label: "Government Bond / T-Bill" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS = [
  "var(--gold)",
  "var(--emerald)",
  "var(--royal)",
  "var(--coral)",
  "var(--indigo)",
  "var(--amber)",
  "var(--sage)",
];

const riskBadge: Record<RiskLevel, string> = {
  low: "bg-sage/15 text-sage",
  medium: "bg-amber/15 text-amber",
  high: "bg-coral/15 text-coral",
};

function InvestmentsPage() {
  const {
    state,
    addAccountWithOpeningBalance,
    recordOpeningBalance,
    updateAccount,
    removeAccount,
    postAccountGrowth,
  } = useFinance();
  const currency = state.profile.currency;
  const summary = computeInvestmentSummary(state);
  const fiveYear = summary.projected.find((p) => p.years === 5)?.value ?? summary.totalInvested;

  const handleAddInvestment = (a: Omit<Account, "id" | "currency">) => {
    const { balance, ...rest } = a;
    addAccountWithOpeningBalance({ ...rest, currency }, balance);
  };

  return (
    <AppShell>
      <SectionHeader
        title="Investments & Savings"
        description="Where your wealth is actually growing, and how fast."
      />

      {summary.accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <PiggyBank className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No savings or investment accounts yet. Add one — a SACCO, money market fund, bond, or
            brokerage — to start tracking real returns.
          </p>
          <div className="mt-5 flex justify-center">
            <AddInvestmentDialog onAdd={handleAddInvestment} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total invested"
              value={formatMoney(summary.totalInvested, currency)}
              accent="ocean"
            />
            <StatCard
              label="Weighted avg. return"
              value={`${summary.weightedAvgReturn.toFixed(1)}%`}
              hint="per year, across all holdings"
              accent="emerald"
            />
            <StatCard
              label="Projected in 5 years"
              value={formatMoney(fiveYear, currency)}
              hint="at current balances & rates"
              accent="gold"
            />
          </div>

          <div className="mt-8">
            <SectionTitle eyebrow="Allocation" title="Portfolio by institution type" />
            <div className="rounded-3xl bg-surface-elevated p-7 shadow-soft">
              <div className="flex flex-col items-center gap-8 md:flex-row">
                <div className="h-52 w-52 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.byInstitutionType}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={86}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {summary.byInstitutionType.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => formatMoney(v, currency)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-2.5">
                  {summary.byInstitutionType.map((c, i) => {
                    const share = summary.totalInvested > 0 ? c.value / summary.totalInvested : 0;
                    return (
                      <li key={c.name} className="flex items-center justify-between text-[13px]">
                        <span className="flex items-center gap-2.5">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                          />
                          {c.name}
                          <span className="text-muted-foreground">{Math.round(share * 100)}%</span>
                        </span>
                        <span className="num font-semibold">{formatMoney(c.value, currency)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <SectionTitle
              eyebrow="Holdings"
              title="Your accounts"
              action={<AddInvestmentDialog onAdd={handleAddInvestment} />}
            />
            <div className="grid gap-4 md:grid-cols-2">
              {summary.accounts.map((a) => {
                const accrued = accruedSinceUpdate(a);
                const projected5y = futureValue(
                  a.balance,
                  a.expectedAnnualReturn || 0,
                  5,
                  a.compoundingFrequency,
                );
                const hasOpeningTx = state.transactions.some(
                  (t) => t.accountId === a.id && t.isOpeningBalance,
                );
                return (
                  <div key={a.id} className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {institutionLabel(a.institutionType)}
                          {a.institution ? ` — ${a.institution}` : ""}
                        </div>
                        <div className="mt-1 font-display text-lg font-semibold">{a.name}</div>
                      </div>
                      <div className="flex gap-1">
                        <EditInvestmentDialog
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
                    </div>

                    <div className="mt-4 font-display text-2xl font-semibold num">
                      {formatMoney(a.balance, a.currency)}
                    </div>

                    {!hasOpeningTx && a.balance !== 0 && (
                      <button
                        onClick={() => recordOpeningBalance(a.id)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber hover:underline"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        This balance isn't backed by a transaction yet — record it
                      </button>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      {a.expectedAnnualReturn ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ocean/10 px-2.5 py-1 font-medium text-ocean">
                          <TrendingUp className="h-3 w-3" />
                          {a.expectedAnnualReturn}% / yr
                        </span>
                      ) : null}
                      {a.riskLevel && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium capitalize ${riskBadge[a.riskLevel]}`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {a.riskLevel} risk
                        </span>
                      )}
                      {a.maturityDate && (
                        <span className="rounded-full bg-accent px-2.5 py-1 font-medium text-foreground/70">
                          Matures {new Date(a.maturityDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>
                        Projected in 5y:{" "}
                        <span className="num font-medium text-foreground">
                          {formatMoney(projected5y, a.currency)}
                        </span>
                      </span>
                      <span>
                        Rate confirmed{" "}
                        {a.rateUpdatedAt ? new Date(a.rateUpdatedAt).toLocaleDateString() : "never"}
                      </span>
                    </div>

                    {accrued > 1 && (
                      <button
                        onClick={() => postAccountGrowth(a.id, Math.round(accrued))}
                        className="mt-3 w-full rounded-lg bg-sage/10 px-3 py-2 text-xs font-medium text-sage hover:bg-sage/20"
                      >
                        Post {formatMoney(accrued, a.currency)} accrued growth since last update
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

function InvestmentForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Partial<Account>;
  onSubmit: (v: {
    name: string;
    balance: number;
    institution: string;
    institutionType: InstitutionType;
    expectedAnnualReturn: number;
    compoundingFrequency: CompoundingFrequency;
    riskLevel: RiskLevel;
    rateUpdatedAt: string;
    maturityDate?: string;
  }) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [institution, setInstitution] = useState(initial?.institution || "");
  const [institutionType, setInstitutionType] = useState<InstitutionType>(
    initial?.institutionType || "sacco",
  );
  const [balance, setBalance] = useState(String(initial?.balance ?? ""));
  const [rate, setRate] = useState(String(initial?.expectedAnnualReturn ?? ""));
  const [compounding, setCompounding] = useState<CompoundingFrequency>(
    initial?.compoundingFrequency || "annually",
  );
  const [risk, setRisk] = useState<RiskLevel>(initial?.riskLevel || "medium");
  const [maturityDate, setMaturityDate] = useState(initial?.maturityDate?.slice(0, 10) || "");
  const uid = useId();

  const submit = () => {
    if (!name.trim() || !balance) return;
    onSubmit({
      name: name.trim(),
      balance: Number(balance) || 0,
      institution: institution.trim(),
      institutionType,
      expectedAnnualReturn: Number(rate) || 0,
      compoundingFrequency: compounding,
      riskLevel: risk,
      rateUpdatedAt: new Date().toISOString(),
      maturityDate: maturityDate ? new Date(maturityDate).toISOString() : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-name`}>Account name</Label>
          <Input
            id={`${uid}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mwalimu SACCO"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-institution`}>Institution (optional)</Label>
          <Input
            id={`${uid}-institution`}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="e.g. Mwalimu National"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-type`}>Type</Label>
          <Select
            value={institutionType}
            onValueChange={(v) => setInstitutionType(v as InstitutionType)}
          >
            <SelectTrigger id={`${uid}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {institutionTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-balance`}>Current balance</Label>
          <Input
            id={`${uid}-balance`}
            inputMode="numeric"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-rate`}>Expected annual return (%)</Label>
          <Input
            id={`${uid}-rate`}
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 9.5"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-compounding`}>Compounding</Label>
          <Select
            value={compounding}
            onValueChange={(v) => setCompounding(v as CompoundingFrequency)}
          >
            <SelectTrigger id={`${uid}-compounding`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-risk`}>Risk level</Label>
          <Select value={risk} onValueChange={(v) => setRisk(v as RiskLevel)}>
            <SelectTrigger id={`${uid}-risk`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-maturity`}>Maturity date (optional)</Label>
          <Input
            id={`${uid}-maturity`}
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Rates like SACCO dividends only change once a year at the AGM — update the return rate here
        whenever your institution announces a new one.
      </p>
      <Button onClick={submit} className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90">
        {submitLabel}
      </Button>
    </div>
  );
}

function AddInvestmentDialog({ onAdd }: { onAdd: (a: Omit<Account, "id" | "currency">) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-ocean text-ocean-foreground hover:bg-ocean/90">
          <Plus className="mr-2 h-4 w-4" /> Add account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a savings or investment account</DialogTitle>
        </DialogHeader>
        <InvestmentForm
          submitLabel="Add account"
          onSubmit={(v) => {
            onAdd({ type: "investment", ...v });
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditInvestmentDialog({
  account,
  onSave,
}: {
  account: Account;
  onSave: (patch: Partial<Account>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>Edit {account.name}</DialogTitle>
        </DialogHeader>
        <InvestmentForm
          initial={account}
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
