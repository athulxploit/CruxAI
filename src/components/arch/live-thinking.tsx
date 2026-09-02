import { useEffect, useState } from "react";
import { useApp } from "@/lib/app-store";
import { Brain, ChevronDown, Loader2, Check } from "lucide-react";

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms / 100) * 100) / 1000}s`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec - m * 60);
  return `${m}m ${s}s`;
}

/**
 * Floating "thinking" bar shown ABOVE the chat composer while the assistant
 * is streaming a reasoning trace. Mirrors Claude / DeepSeek behaviour: the
 * full thought process streams here, not inline in the transcript.
 * Once the reply is complete this component unmounts and the trace becomes
 * available as a collapsed panel next to the assistant reply.
 */
export function LiveThinkingBar() {
  const pending = useApp((s) => {
    const chat = s.chats.find((c) => c.id === s.activeChatId);
    if (!chat) return null;
    // Latest still-streaming assistant message with a reasoning trace.
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const m = chat.messages[i];
      if (m.role === "assistant" && m.pending && !m.reasoningDone) {
        if (typeof m.reasoning === "string" || m.reasoningStartedAt) return m;
      }
    }
    return null;
  });

  const [open, setOpen] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [pending]);

  if (!pending) return null;

  const startedAt = pending.reasoningStartedAt ?? now;
  const elapsed = now - startedAt;
  const text = pending.reasoning ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
      <div className="mb-2 rounded-2xl border border-border bg-surface/80 backdrop-blur-md shadow-elegant overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-foreground/90 hover:bg-surface-elevated/60 transition-colors"
        >
          {pending.pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <Brain className="h-3.5 w-3.5 text-primary" />
          )}
          <span className="font-semibold arch-shimmer tracking-tight">
            Metrixcom Engine: Orchestrating… {formatElapsed(elapsed)}
          </span>
          <ChevronDown
            className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
        {open && (
          <div className="px-3.5 pb-3.5 pt-1 border-t border-border/50">
            <div className="text-[12.5px] leading-relaxed text-muted-foreground/80 space-y-2 py-1 font-serif italic">
              <div className="flex items-center gap-2.5">
                <Check className="h-3 w-3 text-emerald-500/80" />
                <span>Analyzing request context and intent</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                <span>Selecting optimized model chain and specialized modules</span>
              </div>
              <div className="flex items-center gap-2.5 opacity-60 pl-5.5 text-[11.5px]">
                Processing via internal Metrixcom architecture...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
