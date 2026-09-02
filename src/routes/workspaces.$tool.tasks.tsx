import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Plus, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/workspaces/$tool/tasks")({
  head: () => ({
    meta: [
      { title: "Project Tasks — Metrixcom" },
      { name: "description", content: "Track implementation progress and task status for your project workspace." },
      { property: "og:title", content: "Metrixcom Workspace Tasks" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: WorkspaceTasks,
});

function WorkspaceTasks() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Project Tasks</h2>
          <p className="text-sm text-muted-foreground font-medium opacity-70">Implementation track for your blueprint.</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Task
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-3 pr-4">
          {[
            { id: 1, title: 'Initialize project repository', status: 'completed', date: 'Today' },
            { id: 2, title: 'Draft system architecture', status: 'in-progress', date: 'Today' },
            { id: 3, title: 'Configure database schema', status: 'pending', date: 'Tomorrow' },
          ].map((task) => (
            <div key={task.id} className="group flex items-center justify-between p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface transition-all">
              <div className="flex items-center gap-3">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : task.status === 'in-progress' ? (
                  <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                )}
                <span className={task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}>
                  {task.title}
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                {task.date}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
