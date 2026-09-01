import { Bell, Plus, Search, LogOut, Ghost } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { store, useApp } from "@/lib/app-store";
import { useIncognito } from "@/lib/incognito";
import { getAgent } from "@/lib/agents";
import { useAuth } from "@/lib/auth-context";
import { MobileSidebarTrigger } from "./sidebar";
import { PlanBadge } from "./plan-badge";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { playNotifSound, showDesktopNotification, loadNotifPrefs } from "@/lib/notif-prefs";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  kind: string | null;
  read: boolean;
  created_at: string;
}

export function TopBar() {
  const navigate = useNavigate();
  const agent = getAgent(useApp((s) => s.agent));
  const { profile, user, signOut } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const chats = useApp((s) => s.chats);
  const incognito = useIncognito();

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function loadNotifs() {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifs((data as Notification[]) ?? []);
  }

  useEffect(() => {
    if (!user) return;
    loadNotifs();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        (payload: any) => {
          loadNotifs();
          if (payload.eventType === "INSERT") {
            const n = payload.new as Notification & { kind?: string | null };
            const prefs = loadNotifPrefs();
            if (n.kind === "billing" && !prefs.billing) return;
            if (prefs.push_replies) {
              playNotifSound();
              showDesktopNotification(n.title ?? "Metrixcom", n.body ?? undefined);
            }
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "broadcasts" },
        (payload: any) => {
          const prefs = loadNotifPrefs();
          toast(payload.new.title ?? "Announcement", { description: payload.new.body });
          if (prefs.push_replies) {
            playNotifSound();
            showDesktopNotification(payload.new.title ?? "Announcement", payload.new.body);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    loadNotifs();
  }

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground min-w-0">
        <MobileSidebarTrigger />
        <span className="text-foreground/90 font-medium truncate">{agent.name}</span>
        {incognito && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-foreground/80">
            <Ghost className="h-3 w-3" /> Incognito
          </span>
        )}
        <span className="text-border hidden sm:inline">·</span>
        <span className="hidden sm:inline truncate">{agent.tagline}</span>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu open={searchOpen} onOpenChange={setSearchOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline text-[12.5px]">Search</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-2">
            <input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] focus:outline-none focus:border-border-strong"
            />
            <div className="mt-2 max-h-64 overflow-y-auto">
              {chats
                .filter((c) => c.title.toLowerCase().includes(searchQ.toLowerCase()))
                .slice(0, 10)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      store.openChat(c.id);
                      navigate({ to: "/" });
                      setSearchOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-[13px] rounded hover:bg-secondary truncate"
                  >
                    {c.title}
                  </button>
                ))}
              {chats.length === 0 && (
                <div className="text-[12px] text-muted-foreground px-2 py-3 text-center">
                  No conversations yet.
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          aria-label={incognito ? "Turn off incognito mode" : "Turn on incognito mode"}
          title={incognito ? "Incognito on — this chat isn't saved" : "Incognito mode"}
          className={`h-8 w-8 ${incognito ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => {
            const next = !incognito;
            store.setIncognito(next);
            toast(next ? "Incognito on — this chat won't be saved" : "Incognito off — session chats discarded");
            navigate({ to: "/" });
          }}
        >
          <Ghost className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => {
            store.newChat();
            navigate({ to: "/" });
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline text-[12.5px]">New</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Mark all read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-72 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-[12.5px] text-muted-foreground px-3 py-6 text-center">
                  You're all caught up.
                </div>
              ) : (
                notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`px-3 py-2 border-b border-border last:border-0 ${!n.read ? "bg-secondary/40" : ""}`}
                  >
                    <div className="text-[13px] font-medium">{n.title}</div>
                    {n.body && <div className="text-[12px] text-muted-foreground mt-0.5">{n.body}</div>}
                    <div className="text-[10.5px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <PlanBadge plan={profile?.plan} className="ml-1 hidden sm:inline-flex" />

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 h-8 w-8 rounded-full bg-gradient-to-br from-secondary to-muted grid place-items-center text-[11px] font-medium hover:ring-2 hover:ring-border-strong transition overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="text-[13px] font-medium truncate">{displayName}</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                Plan <PlanBadge plan={profile?.plan} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
