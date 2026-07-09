import type { ReactNode } from "react";
import type { Insight } from "@/lib/finance-utils";

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: "gold" | "sage" | "ocean";
}) {
  const bar =
    accent === "gold" ? "bg-gold" : accent === "sage" ? "bg-sage" : "bg-ocean";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-elevated p-6 shadow-soft">
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold num">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function InsightCard({ insight }: { insight: Insight }) {
  const dot =
    insight.tone === "positive"
      ? "bg-sage"
      : insight.tone === "attention"
        ? "bg-gold"
        : "bg-ocean/70";
  const label =
    insight.tone === "positive"
      ? "Positive signal"
      : insight.tone === "attention"
        ? "Worth attention"
        : "Observation";
  return (
    <div className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
      <p className="mt-3 font-display text-lg font-semibold leading-snug">
        {insight.observation}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {insight.explanation}
      </p>
      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          You could
        </div>
        {insight.options.map((o, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
          >
            {o}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] italic text-muted-foreground">
        FinanceOS observes and explains. You decide.
      </p>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
