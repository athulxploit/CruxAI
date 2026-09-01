import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AGENTS, type AgentId } from "@/lib/agents";
import { callAI, friendlyProviderError } from "@/lib/ai-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play } from "lucide-react";

export const Route = createFileRoute("/agent-test")({
  head: () => ({
    meta: [
      { title: "Agent Live Test — Metrixcom" },
      { name: "description", content: "Run a live prompt through Pulse-1, Forge-1, and Cipher-1 side by side." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentTestPage,
});

type AgentResult = {
  status: "idle" | "running" | "done" | "error";
  content: string;
  ms?: number;
};

const DEFAULT_PROMPT =
  "In one short paragraph, introduce yourself: your name, your specialty, and one thing you're best at.";

function AgentTestPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [results, setResults] = useState<Record<AgentId, AgentResult>>({
    "pulse-1": { status: "idle", content: "" },
    "forge-1": { status: "idle", content: "" },
    "cipher-1": { status: "idle", content: "" },
  });
  const anyRunning = Object.values(results).some((r) => r.status === "running");

  async function runOne(agent: AgentId) {
    const started = performance.now();
    setResults((r) => ({ ...r, [agent]: { status: "running", content: "" } }));
    try {
      const content = await callAI({
        messages: [{ role: "user", content: prompt }],
        effort: "medium",
        agent,
        mode: "advisor",
      });
      setResults((r) => ({
        ...r,
        [agent]: { status: "done", content: content || "_(empty)_", ms: Math.round(performance.now() - started) },
      }));
    } catch (err) {
      setResults((r) => ({
        ...r,
        [agent]: { status: "error", content: friendlyProviderError(err), ms: Math.round(performance.now() - started) },
      }));
    }
  }

  async function runAll() {
    if (!prompt.trim()) return;
    await Promise.all(AGENTS.map((a) => runOne(a.id)));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Agent Live Test</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Send one prompt to Pulse-1, Forge-1, and Cipher-1 in parallel and compare the real model responses.
        </p>
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type a prompt to send to all three agents…"
          rows={4}
          className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Effort: medium · Mode: advisor</span>
          <Button onClick={runAll} disabled={anyRunning || !prompt.trim()} className="gap-2">
            {anyRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {anyRunning ? "Running…" : "Run on all agents"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {AGENTS.map((a) => {
          const r = results[a.id];
          return (
            <div
              key={a.id}
              className="flex min-h-[280px] flex-col rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-lg text-sm"
                    style={{ background: `color-mix(in oklch, ${a.accent} 18%, transparent)`, color: a.accent }}
                  >
                    {a.glyph}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-[11px] text-muted-foreground">{a.tagline}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.ms != null && <span className="text-[10px] text-muted-foreground">{r.ms}ms</span>}
                  <Button size="sm" variant="ghost" onClick={() => runOne(a.id)} disabled={r.status === "running"}>
                    {r.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run"}
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto rounded-lg bg-background/40 p-3 text-xs leading-relaxed">
                {r.status === "idle" && <span className="text-muted-foreground">No response yet.</span>}
                {r.status === "running" && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Contacting model…
                  </span>
                )}
                {r.status === "error" && <span className="text-destructive whitespace-pre-wrap">{r.content}</span>}
                {r.status === "done" && <pre className="whitespace-pre-wrap font-sans">{r.content}</pre>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
