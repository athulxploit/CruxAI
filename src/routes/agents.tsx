import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { MODEL_REGISTRY } from "@/lib/model-registry";
import { loadIntelligence, saveIntelligence } from "@/lib/intelligence";
import { Check, Eye } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Models — Metrixcom" },
      { name: "description", content: "Browse every Metrixcom AI model: capabilities, providers, vision support and plan requirements." },
      { property: "og:title", content: "Metrixcom Models" },
      { property: "og:description", content: "Direct model routing — pick the exact model that powers your chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelsPage,
});

function ModelsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<string>(() => loadIntelligence().preferred_model || "auto");

  return (
    <PageShell title="Models" description="Direct model routing — the model you pick powers the response.">
      <div className="min-h-0 -webkit-overflow-scrolling-touch pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MODEL_REGISTRY.map((m) => {
            const isActive = m.id === active;
            return (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {m.provider}
                  </span>
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wider text-primary">Active</span>
                  )}
                </div>
                <h3 className="mt-3 text-[15px] font-semibold">{m.name}</h3>
                <p className="mt-1 text-[13px] text-foreground/80">{m.description}</p>
                <ul className="mt-4 space-y-1.5">
                  <li className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                    <Check className="h-3.5 w-3.5" />
                    Requires {m.minPlan} plan
                  </li>
                  {m.supportsVision && (
                    <li className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      Image input supported
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => {
                    saveIntelligence({ ...loadIntelligence(), preferred_model: m.id });
                    setActive(m.id);
                    navigate({ to: "/" });
                  }}
                  className="mt-5 w-full rounded-lg bg-secondary text-foreground text-[13px] py-2 hover:bg-surface-elevated transition-colors"
                >
                  {isActive ? "Continue chat" : `Use ${m.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}
