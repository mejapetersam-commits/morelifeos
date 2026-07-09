import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Weekly Review — FinanceOS" },
      {
        name: "description",
        content: "Reflect weekly. Learning compounds like wealth.",
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

function Reviews() {
  const { state, addReview } = useFinance();
  const [form, setForm] = useState({ wentWell: "", challenged: "", learned: "", focus: "" });

  const submit = () => {
    if (!Object.values(form).some((v) => v.trim())) return;
    addReview({ weekOf: mondayOf().toISOString(), ...form });
    setForm({ wentWell: "", challenged: "", learned: "", focus: "" });
  };

  return (
    <>
      <OnboardingModal />
      <AppShell>
        <SectionHeader
          title="Weekly review"
          description="This is not judgment. It's practice — a short pause to notice, learn, and choose."
        />

        <div className="rounded-2xl bg-surface-elevated p-6 shadow-soft md:p-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Week of {mondayOf().toLocaleDateString()}
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
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

        {state.reviews.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-xl font-semibold">Previous reflections</h2>
            <div className="space-y-4">
              {state.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Week of {new Date(r.weekOf).toLocaleDateString()}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
                    {r.wentWell && <Entry label="Went well">{r.wentWell}</Entry>}
                    {r.challenged && <Entry label="Challenged">{r.challenged}</Entry>}
                    {r.learned && <Entry label="Learned">{r.learned}</Entry>}
                    {r.focus && <Entry label="Next focus">{r.focus}</Entry>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AppShell>
    </>
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
