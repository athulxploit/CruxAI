import { useEffect, useRef } from "react";
import { store, useApp } from "@/lib/app-store";
import { WORKSPACE_MODES, type WorkspaceMode } from "@/lib/workspace-mode";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export function ModeSwitch({ className }: { className?: string }) {
  const mode = useApp((s) => s.workspaceMode);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => { store.hydrateWorkspaceMode(); }, []);

  function select(next: WorkspaceMode) {
    if (next === mode) return;
    store.setWorkspaceMode(next);
    haptic("light");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = WORKSPACE_MODES.length - 1;
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") nextIndex = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") nextIndex = index === 0 ? last : index - 1;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = last;
    if (nextIndex === null) return;
    e.preventDefault();
    const target = WORKSPACE_MODES[nextIndex];
    select(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div className={cn("flex w-full justify-center px-4 pt-3 pb-2", className)}>
      <div
        role="tablist"
        aria-label="Workspace mode"
        aria-orientation="horizontal"
        className="inline-flex items-center gap-0.5 rounded-2xl border border-border bg-surface/80 p-1 backdrop-blur shadow-sm"
      >
        {WORKSPACE_MODES.map((m, i) => {
          const active = m.id === mode;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              ref={(el) => { refs.current[m.id] = el; }}
              role="tab"
              type="button"
              id={`mode-tab-${m.id}`}
              aria-selected={active}
              aria-label={`${m.label} — ${m.hint}`}
              title={m.hint}
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={() => select(m.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-medium",
                "transition-colors duration-150 ease-out outline-none",
                "focus-visible:ring-2 focus-visible:ring-primary/50",
                active
                  ? "bg-secondary text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
              <span className="hidden sm:inline">{m.label}</span>
              <span className="sm:hidden">{m.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
