import { createFileRoute, Link } from '@tanstack/react-router';
import { PageShell } from '@/components/arch/page-shell';
import { Button } from '@/components/ui/button';
import { Plus, Play, Clock, ChevronRight, Zap } from 'lucide-react';

export const Route = createFileRoute('/workflows')({
  head: () => ({
    meta: [
      { title: "Workflows — Metrixcom" },
      { name: "description", content: "Design and execute automated AI-powered workflows to streamline your research and engineering tasks." },
      { property: "og:title", content: "Metrixcom AI Workflows" },
      { property: "og:description", content: "Automate complex engineering tasks with Metrixcom AI pipelines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowsDashboard,
});

function WorkflowsDashboard() {
  const workflows = [
    { id: '1', name: 'AI Security Scanner', status: 'active', lastRun: '2 hours ago', executions: 124 },
    { id: '2', name: 'GitHub Issue Reviewer', status: 'draft', lastRun: 'Never', executions: 0 },
  ];

  return (
    <PageShell title="Workflows" description="Manage your AI-powered automation pipelines.">
      <div className="mx-auto max-w-5xl px-4 py-8 min-h-0 -webkit-overflow-scrolling-touch pointer-events-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">My Workflows</h1>
            <p className="text-sm text-muted-foreground mt-1">Design and execute automated tasks across your services.</p>
          </div>
          <Link to="/workflows/$id" params={{ id: 'new' }}>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {workflows.map(wf => (
            <div key={wf.id} className="group flex items-center justify-between p-4 rounded-2xl border border-border bg-surface hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{wf.name}</h3>
                    <span className={wf.status === 'active' ? "text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold" : "text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-bold"}>
                      {wf.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {wf.lastRun}</span>
                    <span className="flex items-center gap-1"><Play className="h-3 w-3" /> {wf.executions} runs</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/workflows/$id" params={{ id: wf.id }}>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    View <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}

          <div className="p-8 rounded-2xl border border-dashed border-border bg-background/50 text-center">
            <h3 className="text-sm font-semibold mb-1 text-foreground/70">Need a starting point?</h3>
            <p className="text-xs text-muted-foreground mb-4">Choose from a professional template to get started instantly.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider">Security Audit</Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider">Email Assistant</Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider">Code Review</Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
