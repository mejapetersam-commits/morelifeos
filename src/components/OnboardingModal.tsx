import { useState } from "react";
import { useFinance } from "@/lib/finance-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const visionOptions = [
  "Building savings",
  "Investing",
  "Increasing income",
  "Reducing debt",
  "Buying assets",
  "Starting a business",
  "Lifestyle balance",
];

export function OnboardingModal() {
  const { state, setProfile, addAccount } = useFinance();
  const [step, setStep] = useState(0);
  const [vision, setVision] = useState<string[]>([]);
  const [form, setForm] = useState({
    currency: state.profile.currency || "KSh",
    monthlyIncome: "",
    fixedExpenses: "",
    variableExpenses: "",
    savings: "",
    investments: "",
    debt: "",
  });

  if (state.profile.onboarded) return null;

  const toggle = (v: string) =>
    setVision((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));

  const n = (v: string) => (v === "" ? 0 : Number(v));

  const finish = () => {
    setProfile({
      currency: form.currency,
      monthlyIncome: n(form.monthlyIncome),
      fixedExpenses: n(form.fixedExpenses),
      variableExpenses: n(form.variableExpenses),
      savings: n(form.savings),
      investments: n(form.investments),
      debt: n(form.debt),
      vision,
      onboarded: true,
    });
    if (n(form.savings) > 0) {
      addAccount({
        name: "Primary Savings",
        type: "bank",
        balance: n(form.savings),
        currency: form.currency,
      });
    }
    if (n(form.investments) > 0) {
      addAccount({
        name: "Investments",
        type: "investment",
        balance: n(form.investments),
        currency: form.currency,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-surface-elevated p-8 shadow-lift">
        <div className="mb-6 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-gold" : "bg-border"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h2 className="font-display text-2xl font-semibold">Welcome to FinanceOS</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Before numbers, purpose. A personal financial system starts with what you're
              building towards.
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium">What financial areas matter most right now?</p>
              <div className="flex flex-wrap gap-2">
                {visionOptions.map((v) => (
                  <button
                    key={v}
                    onClick={() => toggle(v)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      vision.includes(v)
                        ? "border-ocean bg-ocean text-ocean-foreground"
                        : "border-border hover:border-ocean/40"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => setStep(1)}
                disabled={vision.length === 0}
                className="bg-ocean text-ocean-foreground hover:bg-ocean/90"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-display text-2xl font-semibold">Your financial snapshot</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A rough picture is enough. You can refine anything later.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Field label="Currency">
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </Field>
              <Field label="Monthly income">
                <Input
                  inputMode="numeric"
                  value={form.monthlyIncome}
                  onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                />
              </Field>
              <Field label="Fixed expenses">
                <Input
                  inputMode="numeric"
                  value={form.fixedExpenses}
                  onChange={(e) => setForm({ ...form, fixedExpenses: e.target.value })}
                />
              </Field>
              <Field label="Variable expenses">
                <Input
                  inputMode="numeric"
                  value={form.variableExpenses}
                  onChange={(e) => setForm({ ...form, variableExpenses: e.target.value })}
                />
              </Field>
              <Field label="Current savings">
                <Input
                  inputMode="numeric"
                  value={form.savings}
                  onChange={(e) => setForm({ ...form, savings: e.target.value })}
                />
              </Field>
              <Field label="Investments">
                <Input
                  inputMode="numeric"
                  value={form.investments}
                  onChange={(e) => setForm({ ...form, investments: e.target.value })}
                />
              </Field>
              <Field label="Debt">
                <Input
                  inputMode="numeric"
                  value={form.debt}
                  onChange={(e) => setForm({ ...form, debt: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="bg-ocean text-ocean-foreground hover:bg-ocean/90"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-2xl font-semibold">You're the decision-maker</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              FinanceOS will observe, explain, and offer options — never decide for you. Your
              autonomy is the point. Privacy stays local; nothing leaves this device unless you
              choose to sync later.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-gold" />
                Track money movement across accounts and categories.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-sage" />
                Define goals and see the monthly effort they require.
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-ocean" />
                Reflect weekly — because learning compounds like wealth.
              </li>
            </ul>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={finish} className="bg-gold text-gold-foreground hover:bg-gold/90">
                Enter FinanceOS
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
