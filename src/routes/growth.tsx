import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { Target, BookOpen, Wrench, BriefcaseBusiness, Flag } from "lucide-react";

export const Route = createFileRoute("/growth")({ component: Growth });

const areas = [
  { title: "Goals", description: "Define outcomes and track progress towards them.", icon: Target, to: "/goals", status: "Available" },
  { title: "Learning", description: "Organise courses, books, study programmes and learning plans.", icon: BookOpen, status: "Planned" },
  { title: "Skills", description: "Track the capabilities you are deliberately developing.", icon: Wrench, status: "Planned" },
  { title: "Career & projects", description: "Connect professional milestones and active projects to your bigger direction.", icon: BriefcaseBusiness, status: "Planned" },
  { title: "Milestones", description: "Record meaningful achievements and progress over time.", icon: Flag, status: "Planned" },
];

function Growth() {
  return (
    <AppShell>
      <SectionHeader title="Growth" description="Develop your skills, knowledge, career and ambitions with intention." />
      <div className="mb-6 rounded-2xl border border-border/70 bg-surface-elevated p-5">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">The distinction</div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed">Plan manages what you do today. Growth tracks whether those actions are moving you towards the person, professional and life you intend to build.</p>
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
              {area.to && <span className="mt-4 inline-block text-xs font-medium text-ocean">Open goals →</span>}
            </div>
          );
          return area.to ? <Link key={area.title} to={area.to} className="block">{Card}</Link> : <div key={area.title}>{Card}</div>;
        })}
      </div>
    </AppShell>
  );
}
