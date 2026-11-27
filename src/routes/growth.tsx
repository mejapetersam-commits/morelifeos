import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { usePersonalOS, makeId, type GrowthItem } from "@/lib/personal-os-store";
import { Target, BookOpen, Wrench, BriefcaseBusiness, Flag, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/growth")({ component: Growth });

const sections = [
  { key: "goals", title: "Goals", description: "Outcomes you want to achieve.", icon: Target },
  { key: "learning", title: "Learning", description: "Courses, books and structured study.", icon: BookOpen },
  { key: "skills", title: "Skills", description: "Capabilities you are deliberately developing.", icon: Wrench },
  { key: "projects", title: "Career and projects", description: "Professional milestones and active projects.", icon: BriefcaseBusiness },
  { key: "milestones", title: "Milestones", description: "Achievements and meaningful moments.", icon: Flag },
] as const;

type SectionKey = typeof sections[number]["key"];

function Growth() {
  const { data, setData, loaded } = usePersonalOS();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const updateItems = (key: SectionKey, items: GrowthItem[]) => setData((current) => ({ ...current, growth: { ...current.growth, [key]: items } }));
  function addItem(key: SectionKey) {
    const title = (drafts[key] ?? "").trim();
    if (!title) return;
    updateItems(key, [...data.growth[key], { id: makeId(), title, detail: "", status: "Not started", targetDate: "" }]);
    setDrafts((current) => ({ ...current, [key]: "" }));
  }
  function patchItem(key: SectionKey, id: string, patch: Partial<GrowthItem>) {
    updateItems(key, data.growth[key].map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  if (!loaded) return <AppShell><SectionHeader title="Growth" description="Your editable development workspace." /><p className="text-sm text-muted-foreground">Loading saved growth areas…</p></AppShell>;

  return (
    <AppShell>
      <SectionHeader title="Growth" description="A living workspace for your goals, learning, skills, projects and milestones." />
      <div className="mb-5 rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-wider text-emerald">How to use Growth</div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Add the outcomes and development activities that matter. Edit every title, description, status and target date as your priorities change. Growth is separate from today's task list.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const items = data.growth[section.key];
          return (
            <section key={section.key} className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
              <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-emerald" />{section.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
              <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder={`Add ${section.title.toLowerCase()}…`} value={drafts[section.key] ?? ""} onChange={(e) => setDrafts((current) => ({ ...current, [section.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addItem(section.key)} /><button onClick={() => addItem(section.key)} className="rounded-xl bg-emerald px-3 text-white" aria-label={`Add to ${section.title}`}><Plus className="h-4 w-4" /></button></div>
              <div className="mt-3 space-y-3">
                {items.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border/70 bg-background p-3">
                    <div className="flex items-start gap-2"><input aria-label={`Edit ${section.title} title`} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" value={item.title} onChange={(e) => patchItem(section.key, item.id, { title: e.target.value })} /><button aria-label={`Delete ${item.title}`} onClick={() => updateItems(section.key, items.filter((i) => i.id !== item.id))} className="text-muted-foreground hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>
                    <textarea aria-label={`Details for ${item.title}`} className="mt-2 min-h-14 w-full resize-y rounded-lg bg-surface px-2.5 py-2 text-xs outline-none" placeholder="Add notes, context or next steps…" value={item.detail} onChange={(e) => patchItem(section.key, item.id, { detail: e.target.value })} />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2"><select aria-label={`Status for ${item.title}`} className="rounded-lg border border-input bg-surface px-2 py-2 text-xs" value={item.status} onChange={(e) => patchItem(section.key, item.id, { status: e.target.value })}><option>Not started</option><option>In progress</option><option>On hold</option><option>Completed</option></select><input aria-label={`Target date for ${item.title}`} type="date" className="rounded-lg border border-input bg-surface px-2 py-2 text-xs" value={item.targetDate} onChange={(e) => patchItem(section.key, item.id, { targetDate: e.target.value })} /></div>
                  </article>
                ))}
                {items.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Nothing here yet. Add your first entry.</p>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">Growth changes save automatically in this browser. They are not yet synced to your account across devices.</p>
    </AppShell>
  );
}
