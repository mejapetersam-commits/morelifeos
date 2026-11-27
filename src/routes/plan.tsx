import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { usePersonalOS, makeId, type PlanTask, type Routine } from "@/lib/personal-os-store";
import { CalendarDays, CheckSquare, Repeat2, Timer, ShieldCheck, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({ component: Plan });

function Plan() {
  const { data, setData, loaded } = usePersonalOS();
  const [taskTitle, setTaskTitle] = useState("");
  const [routineTitle, setRoutineTitle] = useState("");
  const [commitmentTitle, setCommitmentTitle] = useState("");
  const [focusDone, setFocusDone] = useState(0);
  const update = (patch: Partial<typeof data>) => setData((current) => ({ ...current, ...patch }));

  function addTask() {
    if (!taskTitle.trim()) return;
    const task: PlanTask = { id: makeId(), title: taskTitle.trim(), dueDate: "", priority: "Normal", done: false };
    update({ tasks: [...data.tasks, task] });
    setTaskTitle("");
  }
  function addRoutine() {
    if (!routineTitle.trim()) return;
    const routine: Routine = { id: makeId(), title: routineTitle.trim(), cadence: "Daily", time: "" };
    update({ routines: [...data.routines, routine] });
    setRoutineTitle("");
  }
  function addCommitment() {
    if (!commitmentTitle.trim()) return;
    update({ challenge: { ...data.challenge, commitments: [...data.challenge.commitments, { id: makeId(), title: commitmentTitle.trim() }] } });
    setCommitmentTitle("");
  }

  if (!loaded) return <AppShell><SectionHeader title="Plan" description="Your planning workspace." /><p className="text-sm text-muted-foreground">Loading your saved plan…</p></AppShell>;

  return (
    <AppShell>
      <SectionHeader title="Plan" description="Your editable workspace for tasks, routines, focus and consistency." />
      <section className="mb-5 rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
        <div className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-emerald" /> Calendar setup</div>
        <p className="mt-1 text-sm text-muted-foreground">Add your Google Calendar embed link to view your schedule inside MoreLifeOS. This is a view only connection. It does not sync edits or create events.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium">Calendar name<input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" value={data.calendar.label} onChange={(e) => update({ calendar: { ...data.calendar, label: e.target.value } })} /></label>
          <label className="text-xs font-medium">Time zone<input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" value={data.calendar.timezone} onChange={(e) => update({ calendar: { ...data.calendar, timezone: e.target.value } })} placeholder="Africa/Nairobi" /></label>
        </div>
        <label className="mt-3 block text-xs font-medium">Google Calendar embed URL<input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm" value={data.calendar.embedUrl} onChange={(e) => update({ calendar: { ...data.calendar, embedUrl: e.target.value } })} placeholder="https://calendar.google.com/calendar/embed?..." /></label>
        <div className="mt-3 flex flex-wrap items-center gap-3"><a href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald">Find your embed link <ExternalLink className="h-3 w-3" /></a><span className="text-xs text-muted-foreground">Google Calendar settings → your calendar → Integrate calendar → Embed code.</span></div>
        {data.calendar.embedUrl && (
          data.calendar.embedUrl.startsWith("https://calendar.google.com/calendar/embed") ?
            <div className="mt-4 overflow-hidden rounded-xl border border-border"><iframe title={data.calendar.label || "Google Calendar"} src={data.calendar.embedUrl} className="h-[520px] w-full" loading="lazy" /></div> :
            <p className="mt-3 text-xs text-coral">Please use the Google Calendar embed URL beginning with https://calendar.google.com/calendar/embed.</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><CheckSquare className="h-4 w-4 text-emerald" /> Tasks</div>
          <p className="mt-1 text-xs text-muted-foreground">Add, edit and complete your actions. Saved on this device.</p>
          <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Add a task…" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} /><button onClick={addTask} className="rounded-xl bg-emerald px-3 text-white"><Plus className="h-4 w-4" /></button></div>
          <div className="mt-3 space-y-2">
            {data.tasks.map((task) => <div key={task.id} className="flex items-center gap-2 rounded-xl bg-background p-2.5"><input type="checkbox" checked={task.done} onChange={(e) => update({ tasks: data.tasks.map((t) => t.id === task.id ? { ...t, done: e.target.checked } : t) })} /><input aria-label="Edit task" className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${task.done ? "text-muted-foreground line-through" : ""}`} value={task.title} onChange={(e) => update({ tasks: data.tasks.map((t) => t.id === task.id ? { ...t, title: e.target.value } : t) })} /><button aria-label="Delete task" onClick={() => update({ tasks: data.tasks.filter((t) => t.id !== task.id) })} className="text-muted-foreground hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>)}
            {data.tasks.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No tasks yet. Add your first action above.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><Repeat2 className="h-4 w-4 text-emerald" /> Routines</div>
          <p className="mt-1 text-xs text-muted-foreground">Create repeatable routines and adjust their cadence or time.</p>
          <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="e.g. Morning walk" value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRoutine()} /><button onClick={addRoutine} className="rounded-xl bg-emerald px-3 text-white"><Plus className="h-4 w-4" /></button></div>
          <div className="mt-3 space-y-2">
            {data.routines.map((routine) => <div key={routine.id} className="grid grid-cols-[1fr_90px_105px_auto] items-center gap-2 rounded-xl bg-background p-2"><input aria-label="Edit routine" className="min-w-0 bg-transparent text-sm outline-none" value={routine.title} onChange={(e) => update({ routines: data.routines.map((r) => r.id === routine.id ? { ...r, title: e.target.value } : r) })} /><select aria-label="Routine cadence" className="rounded-lg border border-input bg-surface p-1 text-xs" value={routine.cadence} onChange={(e) => update({ routines: data.routines.map((r) => r.id === routine.id ? { ...r, cadence: e.target.value } : r) })}><option>Daily</option><option>Weekdays</option><option>Weekly</option><option>Custom</option></select><input aria-label="Routine time" type="time" className="min-w-0 rounded-lg border border-input bg-surface p-1 text-xs" value={routine.time} onChange={(e) => update({ routines: data.routines.map((r) => r.id === routine.id ? { ...r, time: e.target.value } : r) })} /><button aria-label="Delete routine" onClick={() => update({ routines: data.routines.filter((r) => r.id !== routine.id) })} className="text-muted-foreground hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>)}
            {data.routines.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No routines yet. Add the habits you want to repeat.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><Timer className="h-4 w-4 text-emerald" /> Focus sessions</div>
          <p className="mt-1 text-xs text-muted-foreground">Set the number of focused sessions you aim for each day.</p>
          <label className="mt-4 block text-xs font-medium">Daily focus target<input type="number" min="1" max="12" className="mt-1 w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm" value={data.focusTarget} onChange={(e) => update({ focusTarget: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} /></label>
          <p className="mt-2 text-xs text-muted-foreground">This sets your target only. Actual focus time tracking is a separate feature and is not yet enabled.</p>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-emerald" /> Consistency Challenge</div>
          <p className="mt-1 text-xs text-muted-foreground">Choose your own duration and the commitments that define success for you.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium">Challenge name<input className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={data.challenge.name} onChange={(e) => update({ challenge: { ...data.challenge, name: e.target.value } })} /></label>
            <label className="text-xs font-medium">Duration in days<input type="number" min="1" max="365" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={data.challenge.duration} onChange={(e) => update({ challenge: { ...data.challenge, duration: Math.max(1, Math.min(365, Number(e.target.value) || 1)) } })} /></label>
            <label className="text-xs font-medium sm:col-span-2">Start date<input type="date" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={data.challenge.startDate} onChange={(e) => update({ challenge: { ...data.challenge, startDate: e.target.value } })} /></label>
          </div>
          <div className="mt-4 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="Add a daily commitment…" value={commitmentTitle} onChange={(e) => setCommitmentTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCommitment()} /><button onClick={addCommitment} className="rounded-xl bg-emerald px-3 text-white"><Plus className="h-4 w-4" /></button></div>
          <div className="mt-3 space-y-2">{data.challenge.commitments.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl bg-background px-3 py-2"><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" value={item.title} onChange={(e) => update({ challenge: { ...data.challenge, commitments: data.challenge.commitments.map((c) => c.id === item.id ? { ...c, title: e.target.value } : c) } })} /><button aria-label="Delete commitment" onClick={() => update({ challenge: { ...data.challenge, commitments: data.challenge.commitments.filter((c) => c.id !== item.id) } })} className="text-muted-foreground hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{data.challenge.commitments.length} commitments added</span><button disabled={data.challenge.commitments.length === 0} onClick={() => { update({ challenge: { ...data.challenge, active: !data.challenge.active } }); toast.success(data.challenge.active ? "Challenge paused" : "Challenge configured. Execution tracking will be enabled in a later step."); }} className="rounded-xl bg-emerald px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{data.challenge.active ? "Pause challenge" : "Save and activate setup"}</button></div>
          <p className="mt-2 text-[11px] text-muted-foreground">Activation saves your configuration. Daily check ins, streak calculations, missed day rules and completion evidence are not yet implemented. This setup does not claim progress.</p>
        </section>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">Your Plan changes are saved automatically in this browser. Calendar events are not duplicated here.</p>
    </AppShell>
  );
}
