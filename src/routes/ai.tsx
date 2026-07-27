import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { InsightCard, SectionHeader } from "@/components/finance-cards";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { computeMetrics, formatMoney, generateInsights } from "@/lib/finance-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "Decision Support — FinanceOS" },
      {
        name: "description",
        content: "Explainable financial intelligence. Observe, understand, decide.",
      },
    ],
  }),
  component: AiPage,
});

function AiPage() {
  const { state, addInboxItem } = useFinance();
  const m = computeMetrics(state);
  const insights = generateInsights(state, m);
  const currency = state.profile.currency;

  return (
    <>
      <OnboardingModal />
      <AppShell>
        <SectionHeader
          title="Decision support"
          description="Not a chatbot. A quiet assistant that observes, explains, and offers options — you decide."
        />

        <div className="mb-8 grid gap-4 rounded-2xl bg-ocean p-6 text-ocean-foreground shadow-soft md:grid-cols-4">
          <Stat label="Income (mo.)" value={formatMoney(m.monthIncome, currency)} />
          <Stat label="Expenses (mo.)" value={formatMoney(m.monthExpenses, currency)} />
          <Stat label="Kept" value={formatMoney(m.monthIncome - m.monthExpenses, currency)} />
          <Stat label="Savings rate" value={`${Math.round(m.savingsRate * 100)}%`} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {insights.map((i) => (
            <InsightCard
              key={i.id}
              insight={i}
              onSaveOption={(text) => {
                addInboxItem({ content: text, type: "reminder" });
                toast.success("Saved to Inbox");
              }}
            />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border/60 bg-surface p-6 text-sm text-muted-foreground">
          <div className="font-display text-base font-semibold text-foreground">How this works</div>
          <ul className="mt-3 space-y-2 leading-relaxed">
            <li>
              • Every observation is derived from your recorded activity — nothing is invented.
            </li>
            <li>
              • Save any suggestion to your Inbox to act on later — nothing changes automatically,
              and doing nothing is a valid choice.
            </li>
            <li>• FinanceOS avoids shame and never makes irreversible changes on your behalf.</li>
          </ul>
        </div>
      </AppShell>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold num">{value}</div>
    </div>
  );
}
