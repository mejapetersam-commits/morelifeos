import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { Insight } from "@/lib/finance-utils";
import { formatPct } from "@/lib/finance-utils";
import { cn } from "@/lib/utils";

type Accent = "ocean" | "sage" | "gold" | "emerald" | "coral" | "royal" | "amber" | "indigo";

const accentDot: Record<Accent, string> = {
  ocean: "bg-ocean",
  sage: "bg-sage",
  gold: "bg-gold",
  emerald: "bg-emerald",
  coral: "bg-coral",
  royal: "bg-royal",
  amber: "bg-amber",
  indigo: "bg-indigo",
};
const accentText: Record<Accent, string> = {
  ocean: "text-ocean",
  sage: "text-sage",
  gold: "text-gold",
  emerald: "text-emerald",
  coral: "text-coral",
  royal: "text-royal",
  amber: "text-amber",
  indigo: "text-indigo",
};
const accentVar: Record<Accent, string> = {
  ocean: "var(--ocean)",
  sage: "var(--sage)",
  gold: "var(--gold)",
  emerald: "var(--emerald)",
  coral: "var(--coral)",
  royal: "var(--royal)",
  amber: "var(--amber)",
  indigo: "var(--indigo)",
};

function useAnimatedNumber(value: number, duration = 900) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const startVal = from.current;
    const delta = value - startVal;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(startVal + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return v;
}

export function AnimatedMoney({
  value,
  currency,
  className,
}: {
  value: number;
  currency: string;
  className?: string;
}) {
  const v = useAnimatedNumber(value);
  const sign = v < 0 ? "−" : "";
  return (
    <span className={cn("num", className)}>
      {sign}
      {currency} {Math.abs(Math.round(v)).toLocaleString()}
    </span>
  );
}

export function Sparkline({
  data,
  accent = "ocean",
  height = 42,
}: {
  data: number[];
  accent?: Accent;
  height?: number;
}) {
  const shaped = data.map((y, i) => ({ i, y }));
  const gradId = `spark-${accent}-${Math.random().toString(36).slice(2, 7)}`;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={shaped} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentVar[accent]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={accentVar[accent]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke={accentVar[accent]}
            strokeWidth={1.75}
            fill={`url(#${gradId})`}
            isAnimationActive
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendPill({
  delta,
  invert = false,
}: {
  delta: number;
  /** If true, negative is good (e.g., spending down) */
  invert?: boolean;
}) {
  const flat = Math.abs(delta) < 0.005;
  const positive = flat ? false : invert ? delta < 0 : delta > 0;
  const tone = flat
    ? "text-muted-foreground bg-muted"
    : positive
      ? "text-sage bg-sage/10"
      : "text-coral bg-coral/10";
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium num",
        tone,
      )}
    >
      <Icon className="h-3 w-3" />
      {flat ? "0.0%" : formatPct(delta)}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  invert,
  spark,
  accent = "ocean",
  meaning,
  action,
}: {
  label: string;
  value: ReactNode;
  delta?: number;
  invert?: boolean;
  spark?: number[];
  accent?: Accent;
  meaning?: string;
  action?: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-surface-elevated p-6 shadow-soft transition-all duration-500 hover:shadow-lift hover:-translate-y-0.5">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentVar[accent]}, transparent)`,
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 rounded-full", accentDot[accent])} />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {typeof delta === "number" && <TrendPill delta={delta} invert={invert} />}
          {action}
        </div>
      </div>
      <div className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight">
        {value}
      </div>
      {spark && spark.length > 1 && (
        <div className="mt-3 -mx-2">
          <Sparkline data={spark} accent={accent} />
        </div>
      )}
      {meaning && (
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{meaning}</p>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: Accent;
}) {
  const a = accent ?? "ocean";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-elevated p-6 shadow-soft">
      <div className={cn("absolute left-0 top-0 h-full w-1", accentDot[a])} />
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold num">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function ProgressRing({
  progress,
  size = 120,
  stroke = 10,
  accent = "royal",
  label,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  accent?: Accent;
  label?: ReactNode;
}) {
  const p = Math.max(0, Math.min(1, progress));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - p);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={accentVar[accent]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn("font-display text-2xl font-semibold num", accentText[accent])}>
          {Math.round(p * 100)}%
        </div>
        {label && (
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

export function InsightCard({
  insight,
  onSaveOption,
}: {
  insight: Insight;
  onSaveOption?: (text: string) => void;
}) {
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
      <p className="mt-3 font-display text-lg font-semibold leading-snug">{insight.observation}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{insight.explanation}</p>
      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          You could
        </div>
        {insight.options.map((o, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
          >
            <span className="flex-1">{o}</span>
            {onSaveOption && (
              <button
                onClick={() => onSaveOption(o)}
                className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-ocean hover:bg-ocean/10"
                aria-label="Save to Inbox"
              >
                Save
              </button>
            )}
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

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}
