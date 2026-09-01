import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Plus,
  MessageSquare,
  Files,
  Bot,
  Settings,
  HelpCircle,
  Shield,
  MoreHorizontal,
  LogOut,
  Menu,
  Sparkles,
  ChevronRight,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  LayoutGrid,
} from "lucide-react";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { store, useApp } from "@/lib/app-store";
import { tryTogglePin } from "@/lib/pin-limit";
import { getAgent } from "@/lib/agents";
import { ArchLogo } from "./logo";
import { PlanBadge } from "./plan-badge";


import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@/lib/platform";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";


function UpgradePremium() {
  const { t } = useTranslation();
  const { flags } = usePlatform();
  const { profile } = useAuth();

  if (!flags.premium_button) return null;
  const currentPlan = (profile?.plan ?? "free").toLowerCase();
  if (currentPlan && currentPlan !== "free") return null;

  return (
    <Link
      to="/premium"
      className="w-full mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium bg-gradient-to-r from-primary/15 to-accent/15 border border-primary/30 text-foreground hover:from-primary/25 hover:to-accent/25 transition-colors"
    >
      <Sparkles className="h-4 w-4 text-primary" />
      {t("upgradePremium")}
    </Link>
  );
}

const nav = [
  { to: "/history", labelKey: "chatHistory", icon: MessageSquare },
  { to: "/workspaces", labelKey: "workspaces", icon: LayoutGrid },
  { to: "/files", labelKey: "files", icon: Files },
  { to: "/agents", labelKey: "agents", icon: Bot },
  { to: "/settings", labelKey: "settings", icon: Settings },
  { to: "/help", labelKey: "help", icon: HelpCircle },
] as const;

function ChatRow({
  c,
  active,
  onOpen,
}: {
  c: import("@/lib/app-store").Chat;
  active: boolean;
  onOpen: () => void;
}) {
  const agent = getAgent(c.agent);
  const { settings } = usePlatform();
  const pinLimit = Number(settings?.global_limits?.max_pinned_chats) || undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.title);

  const commit = () => {
    const t = draft.trim();
    if (t && t !== c.title) store.renameChat(c.id, t);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative w-full flex items-center gap-2 rounded-lg pl-2.5 pr-1 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      {editing ? (
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              else if (e.key === "Escape") {
                setDraft(c.title);
                setEditing(false);
              }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none border-b border-primary/40 text-[13px] text-foreground"
          />
        </div>
      ) : (
        <button
          onClick={onOpen}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setDraft(c.title);
            setEditing(true);
          }}
          title={c.title}
          className="flex-1 flex items-center gap-2.5 min-w-0 text-left"
        >
          {agent.id === "pulse-1" ? (
            <agent.icon
              aria-hidden
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: agent.accent }}
              strokeWidth={2}
            />
          ) : (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: agent.accent, boxShadow: `0 0 6px ${agent.accent}` }}
            />
          )}
          <span className="truncate flex-1">{c.title || "New chat"}</span>
          {c.pinned && (
            <Pin className="h-3 w-3 shrink-0 text-primary/80 fill-primary/40" />
          )}
        </button>
      )}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDraft(c.title);
              setEditing(true);
            }}
            title="Rename"
            className="p-1 rounded hover:bg-sidebar-border/60 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              tryTogglePin(c.id, pinLimit);
            }}
            title={c.pinned ? "Unsave (allow 7-day auto-delete)" : "Save (keep past 7 days)"}
            className="p-1 rounded hover:bg-sidebar-border/60 text-muted-foreground hover:text-foreground"
          >
            {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${c.title || "New chat"}"?`)) {
                store.deleteChat(c.id);
              }
            }}
            title="Delete"
            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}


function RecentChats({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const chats = useApp((s) => s.chats);
  const activeId = useApp((s) => s.activeChatId);
  const navigate = useNavigate();

  const pinned = [...chats]
    .filter((c) => c.pinned)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const unpinned = [...chats]
    .filter((c) => !c.pinned)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 10);

  const total = pinned.length + unpinned.length;
  if (total === 0) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7 = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const startOf30 = startOfToday - 30 * 24 * 60 * 60 * 1000;

  const groups: { label: string; items: typeof unpinned }[] = [
    { label: t("today"), items: [] },
    { label: t("yesterday"), items: [] },
    { label: t("previous"), items: [] },
    { label: t("previous"), items: [] },
    { label: t("older"), items: [] },
  ];
  for (const c of unpinned) {
    if (c.updatedAt >= startOfToday) groups[0].items.push(c);
    else if (c.updatedAt >= startOfYesterday) groups[1].items.push(c);
    else if (c.updatedAt >= startOf7) groups[2].items.push(c);
    else if (c.updatedAt >= startOf30) groups[3].items.push(c);
    else groups[4].items.push(c);
  }
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const openChat = (id: string) => {
    store.openChat(id);
    navigate({ to: "/" });
    onNavigate?.();
  };

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-90",
          )}
        />
        {t("recent")}
        <span className="ml-auto normal-case tracking-normal text-[10.5px] text-muted-foreground/70">
          {total}
        </span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-2">
          {pinned.length > 0 && (
            <div>
              <div className="px-2.5 pt-1 pb-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground/60">
                {t("pinned")}
              </div>
              <div className="space-y-0.5">
                {pinned.map((c) => (
                  <ChatRow
                    key={c.id}
                    c={c}
                    active={activeId === c.id}
                    onOpen={() => openChat(c.id)}
                  />
                ))}
              </div>
            </div>
          )}
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2.5 pt-1 pb-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((c) => (
                  <ChatRow
                    key={c.id}
                    c={c}
                    active={activeId === c.id}
                    onOpen={() => openChat(c.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { profile, user, isAdmin, signOut } = useAuth();

  const provider =
    (user?.app_metadata?.provider as string | undefined) ??
    (user?.identities?.[0]?.provider as string | undefined);
  const isApple = provider === "apple";
  const rawEmail = profile?.email ?? user?.email ?? "";
  // Apple Hide-My-Email returns a `@privaterelay.appleid.com` alias, and if
  // the user unchecked "Share Email" there's no email at all. Show a friendly
  // label instead of a blank line so the account row never looks broken.
  const isPrivateRelay = rawEmail.endsWith("@privaterelay.appleid.com");
  const email = isApple && (!rawEmail || isPrivateRelay) ? "Apple ID" : rawEmail;
  const displayName =
    profile?.display_name ??
    (rawEmail ? rawEmail.split("@")[0] : null) ??
    (isApple ? "Apple user" : "User");
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        <ArchLogo />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <button
          onClick={() => {
            store.newChat();
            navigate({ to: "/" });
            onNavigate?.();
          }}
          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-1"
        >
          <Plus className="h-4 w-4" />
          {t("newChat")}
          <span className="ml-auto text-[11px] text-muted-foreground border border-sidebar-border rounded px-1.5 py-0.5">
            ⌘K
          </span>
        </button>

        <div className="mt-2 space-y-0.5">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="mt-4 mb-1 px-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("admin")}
              </div>
              <Link
                to="/admin"
                onClick={() => onNavigate?.()}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Shield className="h-4 w-4" />
                {t("adminDashboard")}
              </Link>
            </>
          )}
        </div>

        <RecentChats onNavigate={onNavigate} />
      </nav>


      <div className="border-t border-sidebar-border p-2">
        <UpgradePremium />

        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-secondary to-muted grid place-items-center text-[12px] font-medium overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[13px] font-medium truncate">{displayName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{email}</div>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-[13px] font-medium">{displayName}</div>
              <div className="text-[11px] text-muted-foreground">{email}</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {t("plan")}: <PlanBadge plan={profile?.plan} />
              </div>

            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" onClick={() => onNavigate?.()}>{t("settings")}</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" onClick={() => onNavigate?.()}>{t("adminDashboard")}</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              {t("logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="arch-sidebar-desktop hidden lg:flex w-[248px] shrink-0 flex-col border-r border-border">
      <SidebarBody />
    </aside>
  );
}

export function MobileSidebarTrigger() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 lg:hidden text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SidebarBody onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
