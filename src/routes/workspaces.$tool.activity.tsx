import { createFileRoute } from "@tanstack/react-router";
import { History, User, Bot, Zap } from "lucide-react";

export const Route = createFileRoute("/workspaces/$tool/activity")({
  head: () => ({
    meta: [
      { title: "Workspace Activity — Metrixcom" },
      { name: "description", content: "View a detailed timeline of events, updates, and AI interactions within your project workspace." },
      { property: "og:title", content: "Metrixcom Workspace Activity" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: WorkspaceActivity,
});

function WorkspaceActivity() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Activity Timeline</h2>
        <p className="text-sm text-muted-foreground font-medium opacity-70">Major events and blueprint changes.</p>
      </div>

      <div className="relative space-y-8 pl-4 border-l border-border/60">
        {[
          { time: '09:42', type: 'blueprint', message: 'Architecture updated to include PostgreSQL primary node.', icon: Zap },
          { time: '09:31', type: 'user', message: 'Athul Krishna PT added a new milestone: "Security Scanner".', icon: User },
          { time: 'Yesterday', type: 'bot', message: 'Metrixcom suggested 4 new requirements based on vision.', icon: Bot },
        ].map((event, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-background border border-border flex items-center justify-center">
               <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                <event.icon className="h-3 w-3" />
                {event.time} • {event.type}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed max-w-xl">{event.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
