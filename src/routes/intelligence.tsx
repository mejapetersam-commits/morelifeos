import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { BrainCircuit, ChartNoAxesCombined, FileText, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/intelligence")({ component: Intelligence });

const areas = [
  { title: "AI assistant", description: "Explore the existing assistant experience and ask questions.", icon: BrainCircuit, to: "/ai", status: "Available" },
  { title: "Personal analytics", description: "Understand patterns in execution, habits, goals and progress.", icon: ChartNoAxesCombined, status: "Planned" },
  { title: "Reports", description: "Bring together weekly and monthly performance summaries.", icon: FileText, status: "Planned" },
  { title: "Recommendations", description: "Identify problems and suggest adjustments grounded in your recorded data.", icon: Lightbulb, status: "Planned" },
];

function Intelligence() {
  return (
    <AppShell>
      <SectionHeader title="Intelligence" description="Turn information from across MoreLifeOS into useful insights and better decisions." />
      <div className="mb-6 rounded-2xl border border-border/70 bg-surface-elevated p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">A non-negotiable standard</div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed">Intelligence must analyse real information from Plan, Money and Growth. It must distinguish recorded facts from estimates and never invent activity, progress or recommendations.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {areas.map((area) => {
          const Card = (
            <div className="h-full rounded-2xl border border-border/70 bg-surface-elevated p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-semibold"><area.icon className="h-4 w-4 text-muted-foreground" />{area.title}</div>
                <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{area.status}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{area.description}</p>
              {area.to && <span className="mt-4 inline-block text-xs font-medium text-ocean">Open assistant →</span>}
            </div>
          );
          return area.to ? <Link key={area.title} to={area.to} className="block">{Card}</Link> : <div key={area.title}>{Card}</div>;
        })}
      </div>
    </AppShell>
  );
}
