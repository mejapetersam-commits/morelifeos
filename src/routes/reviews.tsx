import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader, SectionTitle } from "@/components/finance-cards";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { computeWeekSummary, formatMoney, isValidAmount, parseAmount } from "@/lib/finance-utils";
import type { Decision, DecisionOutcome } from "@/lib/finance-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, HelpCircle, ThumbsUp, Minus, ThumbsDown } from "lucide-react";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Weekly Review — FinanceOS" },
      {
        name: "description",
        content: "Reflect weekly, with real data — and revisit decisions later.",
      },
    ],
  }),
  component: Reviews,
});

function mondayOf(d = new Date()) {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

const outcomeMeta: Record<DecisionOutcome, { label: string; className: string }> = {
  good: { label: "Good call", className: "bg-sage/15 text-sage" },
  mixed: { label: "Mixed", className: "bg-amber/15 text-amber" },
  bad: { label: "Not great", className: "bg-coral/15 text-coral" },
};

function Reviews() {
  const { state, addReview, addDecision, recordDecisionOutcome, removeDecision } = useFinance();
  const [form, setForm] = useState({ wentWell: "", challenged: "", learned: "", focus: "" });
  const currency = state.profile.currency;
  const thisWeekStart = mondayOf();
  const thisWeek = computeWeekSummary(state, thisWeekStart);

  const dueDecisions = state.decisions.filter(
    (d) => !d.outcome && new Date(d.followUpDate) <= new Date(),
  );

  const submit = () => {
    if (!Object.values(form).some((v) => v.trim())) return;
    addReview({ weekOf: thisWeekStart.toISOString(), ...form });
    setForm({ wentWell: "", challenged: "", learned: "", focus: "" });
  };

  const decisionsForWeek = (weekOf: string) => {
    const start = new Date(weekOf);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return state.decisions.filter((d) => {
      const dd = new Date(d.date);
      return dd >= start && dd < end;
    });
  };

  return (
    <>
      <OnboardingModal />
      <AppShell>
        <SectionHeader
          title="Weekly review"
          description="This is not judgment. It's practice — a short pause to notice, learn, and choose."
        />

        {dueDecisions.length > 0 && (
          <div className="mb-8">
            <SectionTitle eyebrow="Looking back" title="Was this the right call?" />
            <div className="space-y-3">
              {dueDecisions.map((d) => (
                <FollowUpCard
                  key={d.id}
                  decision={d}
                  currency={currency}
                  onRecord={(outcome, note) => recordDecisionOutcome(d.id, outcome, note)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-surface-elevated p-6 shadow-soft md:p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Week of {thisWeekStart.toLocaleDateString()}
          </div>

          <WeekStats summary={thisWeek} currency={currency} />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ReflectField
              label="What financial decision went well?"
              value={form.wentWell}
              onChange={(v) => setForm({ ...form, wentWell: v })}
            />
            <ReflectField
              label="What challenged you?"
              value={form.challenged}
              onChange={(v) => setForm({ ...form, challenged: v })}
            />
            <ReflectField
              label="What did you learn?"
              value={form.learned}
              onChange={(v) => setForm({ ...form, learned: v })}
            />
            <ReflectField
              label="What is your focus for next week?"
              value={form.focus}
              onChange={(v) => setForm({ ...form, focus: v })}
            />
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={submit} className="bg-ocean text-ocean-foreground hover:bg-ocean/90">
              Save reflection
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-6">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Decision log
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Log a real decision — not just a transaction — and FinanceOS will ask you in about 3
            months whether it turned out to be the right call.
          </p>
          <AddDecisionForm
            onAdd={(d) => {
              const followUp = new Date();
              followUp.setDate(followUp.getDate() + 90);
              addDecision({ ...d, followUpDate: followUp.toISOString() });
            }}
          />
        </div>

        {state.reviews.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-xl font-semibold">Previous reflections</h2>
            <div className="space-y-4">
              {state.reviews.map((r) => {
                const weekStats = computeWeekSummary(state, new Date(r.weekOf));
                const weekDecisions = decisionsForWeek(r.weekOf);
                return (
                  <div key={r.id} className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      Week of {new Date(r.weekOf).toLocaleDateString()}
                    </div>
                    <WeekStats summary={weekStats} currency={currency} compact />
                    <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                      {r.wentWell && <Entry label="Went well">{r.wentWell}</Entry>}
                      {r.challenged && <Entry label="Challenged">{r.challenged}</Entry>}
                      {r.learned && <Entry label="Learned">{r.learned}</Entry>}
                      {r.focus && <Entry label="Next focus">{r.focus}</Entry>}
                    </div>
                    {weekDecisions.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                        {weekDecisions.map((d) => (
                          <div key={d.id} className="flex items-center justify-between text-xs">
                            <span className="text-foreground/80">{d.description}</span>
                            {d.outcome ? (
                              <span
                                className={`rounded-full px-2 py-0.5 font-medium ${outcomeMeta[d.outcome].className}`}
                              >
                                {outcomeMeta[d.outcome].label}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <HelpCircle className="h-3 w-3" /> Awaiting follow-up
                              </span>
                            )}
                            <button
                              onClick={() => removeDecision(d.id)}
                              className="ml-2 rounded p-1 text-muted-foreground hover:bg-accent"
                              aria-label="Delete decision"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AppShell>
    </>
  );
}

function WeekStats({
  summary,
  currency,
  compact,
}: {
  summary: ReturnType<typeof computeWeekSummary>;
  currency: string;
  compact?: boolean;
}) {
  if (summary.txCount === 0) {
    return (
      <p className={`text-sm text-muted-foreground ${compact ? "mt-2" : "mt-4"}`}>
        No transactions recorded that week.
      </p>
    );
  }
  return (
    <div className={`grid grid-cols-3 gap-3 ${compact ? "mt-2" : "mt-4"}`}>
      <div className="rounded-xl bg-accent/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Income</div>
        <div className="mt-0.5 num text-sm font-semibold">
          {formatMoney(summary.income, currency)}
        </div>
      </div>
      <div className="rounded-xl bg-accent/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Spent</div>
        <div className="mt-0.5 num text-sm font-semibold">
          {formatMoney(summary.expenses, currency)}
        </div>
        {summary.topCategory && (
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
            mostly {summary.topCategory}
          </div>
        )}
      </div>
      <div className="rounded-xl bg-accent/40 p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</div>
        <div
          className={`mt-0.5 num text-sm font-semibold ${summary.net >= 0 ? "text-sage" : "text-coral"}`}
        >
          {formatMoney(summary.net, currency)}
        </div>
      </div>
    </div>
  );
}

function ReflectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Entry({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 leading-relaxed">{children}</div>
    </div>
  );
}

function AddDecisionForm({
  onAdd,
}: {
  onAdd: (d: {
    description: string;
    amount?: number;
    expectedOutcome?: string;
    date: string;
  }) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expected, setExpected] = useState("");

  const submit = () => {
    if (!description.trim()) return;
    onAdd({
      description: description.trim(),
      amount: isValidAmount(amount) ? parseAmount(amount) : undefined,
      expectedOutcome: expected.trim() || undefined,
      date: new Date().toISOString(),
    });
    setDescription("");
    setAmount("");
    setExpected("");
  };

  return (
    <div className="mt-4 space-y-3">
      <Input
        placeholder='e.g. "Decided to buy a new laptop for work"'
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          placeholder="Amount (optional)"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          placeholder="Expected outcome (optional)"
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
        />
      </div>
      <Button onClick={submit} variant="outline" className="gap-2">
        <Plus className="h-4 w-4" /> Log this decision
      </Button>
    </div>
  );
}

function FollowUpCard({
  decision,
  currency,
  onRecord,
}: {
  decision: Decision;
  currency: string;
  onRecord: (outcome: DecisionOutcome, note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [picking, setPicking] = useState(false);

  return (
    <div className="rounded-2xl bg-surface-elevated p-5 shadow-soft">
      <div className="text-sm font-medium">{decision.description}</div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span>{new Date(decision.date).toLocaleDateString()}</span>
        {decision.amount && <span className="num">{formatMoney(decision.amount, currency)}</span>}
        {decision.expectedOutcome && <span>Expected: {decision.expectedOutcome}</span>}
      </div>
      {!picking ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onRecord("good")}>
            <ThumbsUp className="h-3.5 w-3.5" /> Good call
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPicking(true)}>
            <Minus className="h-3.5 w-3.5" /> Mixed
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onRecord("bad")}>
            <ThumbsDown className="h-3.5 w-3.5" /> Not great
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="What made it mixed? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-9 text-xs"
          />
          <Button size="sm" onClick={() => onRecord("mixed", note.trim() || undefined)}>
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
