import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { AGENTS } from "@/lib/agents";
import { store, useApp } from "@/lib/app-store";
import { Check } from "lucide-react";

export const Route = createFileRoute("/agents")({
  head: () => ({ meta: [{ title: "Agents — Metrixcom" }] }),
  component: AgentsPage,
});

function AgentsPage() {
  const active = useApp((s) => s.agent);
  const navigate = useNavigate();
  return (
    <PageShell title="Agents" description="Specialized assistants tuned for your workflow.">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENTS.map((a) => {
          const isActive = a.id === active;
          return (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-colors flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="text-[22px]">{a.glyph}</span>
                {isActive && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Active
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{a.name}</h3>
              <p className="text-[12.5px] text-muted-foreground">{a.tagline}</p>
              <p className="mt-3 text-[13px] text-foreground/80">{a.description}</p>
              <ul className="mt-4 space-y-1.5">
                {a.capabilities.map((c) => (
                  <li key={c} className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    <Check className="h-3.5 w-3.5" />
                    {c}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  store.setAgent(a.id);
                  navigate({ to: "/" });
                }}
                className="mt-5 w-full rounded-lg bg-secondary text-foreground text-[13px] py-2 hover:bg-surface-elevated transition-colors"
              >
                {isActive ? "Continue chat" : `Use ${a.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
