import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { store, useApp } from "@/lib/app-store";
import { getAgent } from "@/lib/agents";

import { MessageSquare, Trash2, Pin, PinOff, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { usePlatform } from "@/lib/platform";
import { tryTogglePin } from "@/lib/pin-limit";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Chat History — Metrixcom" }] }),
  component: History,
});

function History() {
  const chats = useApp((s) => s.chats);
  const navigate = useNavigate();
  const { settings } = usePlatform();
  const pinLimit = Number(settings?.global_limits?.max_pinned_chats) || undefined;

  const sorted = [...chats].sort((a, b) => {
    if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
    return b.updatedAt - a.updatedAt;
  });

  return (
    <PageShell title="Chat History" description="Your recent conversations across all agents.">
      {chats.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <MessageSquare className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="mt-3 text-[13.5px] text-muted-foreground">No conversations yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden">
          {sorted.map((c) => (
            <HistoryRow
              key={c.id}
              c={c}
              pinLimit={pinLimit}
              onOpen={() => {
                store.openChat(c.id);
                navigate({ to: "/" });
              }}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function HistoryRow({
  c,
  pinLimit,
  onOpen,
}: {
  c: import("@/lib/app-store").Chat;
  pinLimit: number | undefined;
  onOpen: () => void;
}) {
  const agent = getAgent(c.agent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.title);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== c.title) store.renameChat(c.id, t);
    setEditing(false);
  };

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors cursor-pointer"
      onClick={() => !editing && onOpen()}
    >
      
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              else if (e.key === "Escape") {
                setDraft(c.title);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent outline-none border-b border-primary/40 text-[13.5px] text-foreground"
          />
        ) : (
          <div className="text-[13.5px] truncate flex items-center gap-1.5">
            {c.title}
            {c.pinned && <Pin className="h-3 w-3 text-primary/80 fill-primary/40" />}
          </div>
        )}
        <div className="text-[11.5px] text-muted-foreground">
          {agent.name} · {formatDistanceToNow(c.updatedAt, { addSuffix: true })}
        </div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDraft(c.title);
            setEditing(true);
          }}
          title="Rename"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            tryTogglePin(c.id, pinLimit);
          }}
          title={c.pinned ? "Unpin" : "Pin"}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
        >
          {c.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${c.title || "New chat"}"?`)) {
              store.deleteChat(c.id);
            }
          }}
          title="Delete"
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
