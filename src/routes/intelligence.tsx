import { createFileRoute, Link } from "@tanstack/react-router";
import { usePersonalOS } from "@/lib/personal-os-store";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { BrainCircuit, ChartNoAxesCombined, FileText, Lightbulb, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/intelligence")({ component: Intelligence });

const providers = [
  { id: "openai", name: "OpenAI", key: "OPENAI_API_KEY", docs: "https://platform.openai.com/api-keys" },
  { id: "anthropic", name: "Anthropic Claude", key: "ANTHROPIC_API_KEY", docs: "https://console.anthropic.com/settings/keys" },
  { id: "google", name: "Google Gemini", key: "GEMINI_API_KEY", docs: "https://aistudio.google.com/app/apikey" },
  { id: "openrouter", name: "OpenRouter", key: "OPENROUTER_API_KEY", docs: "https://openrouter.ai/keys" },
] as const;

function Intelligence() {
  const { data, setData, loaded } = usePersonalOS();
  const selected = providers.find((provider) => provider.id === data.ai.provider) ?? providers[0];
  if (!loaded) return <AppShell><SectionHeader title="Intelligence" description="Your AI and insight centre." /><p className="text-sm text-muted-foreground">Loading your preferences…</p></AppShell>;

  return (
    <AppShell>
      <SectionHeader title="Intelligence" description="Choose the AI provider you want MoreLifeOS to use and build towards evidence based personal insights." />
      <section className="mb-5 rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
        <div className="flex items-center gap-2 font-semibold"><BrainCircuit className="h-4 w-4 text-emerald" /> AI provider</div>
        <p className="mt-1 text-sm text-muted-foreground">Choose your preferred provider. Your choice is saved on this device. No API key is requested or stored in the browser.</p>
        <label className="mt-4 block max-w-xl text-xs font-semibold">Preferred AI provider
          <select className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" value={selected.id} onChange={(e) => setData((current) => ({ ...current, ai: { provider: e.target.value } }))}>
            {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
        </label>
        <div className="mt-4 rounded-xl bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-emerald" /> Connection setup required</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Provider selected: {selected.name}. The application does not yet have a secure server side AI connection. The selection alone does not mean the provider is connected.</p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
            <li>Create an API key in the provider console.</li>
            <li>Open the MoreLifeOS Vercel project and add the environment variable <code className="rounded bg-accent px-1.5 py-0.5 font-semibold text-foreground">{selected.key}</code>.</li>
            <li>Redeploy the preview after the key is added.</li>
            <li>Then add a server side AI endpoint that reads this secret and returns responses to the app. Never put provider secrets in frontend code or local storage.</li>
          </ol>
          <a href={selected.docs} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald">Open {selected.name} API console <ExternalLink className="h-3 w-3" /></a>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">For this personal system, I recommend starting with OpenAI or Gemini. Choose one provider first rather than maintaining multiple integrations before there is a clear need.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link to="/ai" className="interactive-card rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-emerald" /> Existing insights</div>
          <p className="mt-2 text-sm text-muted-foreground">Open the current deterministic financial insights. These are generated from recorded Money data and do not require an external AI provider.</p>
          <span className="mt-4 inline-block text-xs font-semibold text-emerald">Open financial insights →</span>
        </Link>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><ChartNoAxesCombined className="h-4 w-4 text-emerald" /> Personal analytics</div>
          <p className="mt-2 text-sm text-muted-foreground">Planned: analyse task completion, routines, focus, challenge check ins, Money and Growth trends once those records exist.</p>
          <span className="mt-4 inline-block text-xs font-semibold text-muted-foreground">Waiting for connected activity data</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-emerald" /> Reports</div>
          <p className="mt-2 text-sm text-muted-foreground">Planned: weekly and monthly summaries grounded in saved records, with a clear distinction between facts and estimates.</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-elevated p-5 shadow-soft">
          <div className="flex items-center gap-2 font-semibold"><Lightbulb className="h-4 w-4 text-emerald" /> Recommendations</div>
          <p className="mt-2 text-sm text-muted-foreground">Planned: actionable suggestions with the underlying data shown, and your approval required before anything changes.</p>
        </div>
      </section>
    </AppShell>
  );
}
