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
  Plug,
  Zap,
  PanelLeftOpen,
  Monitor,
  ExternalLink,
  BookOpen,
  Flag,
  Keyboard,
  UserPlus,
  ArrowUpCircle,
  Download,
  Globe,
  LifeBuoy,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { store, useApp } from "@/lib/app-store";
import { tryTogglePin } from "@/lib/pin-limit";

import { ArchLogo } from "./logo";
import { PlanBadge } from "./plan-badge";
import { useAppearance } from "@/lib/appearance";


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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
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
  { to: "/computer", labelKey: "computer", icon: Monitor },
  { to: "/workflows", labelKey: "workflows", icon: Zap },
  { to: "/workspaces", labelKey: "workspaces", icon: LayoutGrid },
  { to: "/integrations", labelKey: "integrations", icon: Plug },
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
  // Legacy agent reference removed. Unified intelligence used.
  const { settings } = usePlatform();
  const pinLimit = Number(settings?.global_limits?.max_pinned_chats) || undefined;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.title || "New Chat");

  const commit = () => {
    const t = draft.trim();
    if (t && t !== c.title) store.renameChat(c.id, t);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative w-full flex items-center gap-2 rounded-lg pl-2.5 pr-1 py-1.5 text-[13px] transition-all duration-150 ease-out",
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
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full shrink-0 bg-primary shadow-[0_0_6px_var(--primary)]"
          />
          <span className="truncate flex-1">{c.title || "New chat"}</span>
          {c.pinned && (
            <Pin className="h-3 w-3 shrink-0 text-primary/80 fill-primary/40" />
          )}
        </button>
      )}
      {!editing && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 transform translate-x-1 group-hover:translate-x-0">
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






function SidebarBody({ onNavigate, collapsed, onToggle }: { onNavigate?: () => void; collapsed: boolean; onToggle?: () => void }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { profile, user, isAdmin, signOut } = useAuth();

  const provider =
    (user?.app_metadata?.provider as string | undefined) ??
    (user?.identities?.[0]?.provider as string | undefined);
  const isApple = provider === "apple";
  const rawEmail = profile?.email ?? user?.email ?? "";
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

  const NavItem = ({ 
    item, 
    active, 
    collapsed, 
    onClick 
  }: { 
    item: typeof nav[number] | { to: string; labelKey: string; icon: any }; 
    active: boolean; 
    collapsed?: boolean;
    onClick?: () => void;
  }) => {
    const content = (
      <Link
        to={item.to}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] transition-all w-full",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-0 w-10 mx-auto"
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
      </Link>
    );

    if (!collapsed) return content;

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {t(item.labelKey)}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn(
        "h-14 flex items-center px-4 border-b border-sidebar-border overflow-hidden", 
        collapsed && "justify-center px-0"
      )}>
        {collapsed ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button 
                onClick={onToggle}
                className="group/logo relative h-10 w-10 flex items-center justify-center rounded-lg hover:bg-sidebar-accent transition-all duration-200"
              >
                <div className="transition-all duration-150 group-hover/logo:opacity-0 group-hover/logo:scale-90">
                  <ArchLogo iconOnly />
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-150 group-hover/logo:opacity-100 group-hover/logo:scale-100">
                  <PanelLeftOpen className="h-[18px] w-[18px] text-primary" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {t("expandSidebar")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-2 group/logo w-full">
            <ArchLogo iconOnly={false} />
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggle}
                  className="ml-auto h-8 w-8 flex items-center justify-center rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground opacity-0 group-hover/logo:opacity-100 transition-all duration-150"
                  aria-label={t("collapseSidebar")}
                >
                  <PanelLeftOpen className="h-4 w-4 rotate-180" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {t("collapseSidebar")}
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 -webkit-overflow-scrolling-touch">
        {collapsed ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  store.setActiveChat(null);
                  navigate({ to: "/" });
                  onNavigate?.();
                }}
                className="w-10 mx-auto flex items-center justify-center rounded-lg py-2 text-sidebar-foreground hover:bg-sidebar-accent transition-all mb-2"
              >
                <Plus className="h-[18px] w-[18px] shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {t("newChat")}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => {
              store.setActiveChat(null);
              navigate({ to: "/" });
              onNavigate?.();
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] text-sidebar-foreground hover:bg-sidebar-accent transition-all mb-2 border border-sidebar-border shadow-sm"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("newChat")}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/50 font-mono">
              ⌘K
            </span>
          </button>
        )}

        <div className="mt-2 space-y-0.5">
          {nav.map((item) => (
            <NavItem 
              key={item.to} 
              item={item} 
              active={pathname.startsWith(item.to)} 
              collapsed={collapsed}
              onClick={onNavigate}
            />
          ))}

          {isAdmin && (
            <>
              {!collapsed && (
                <div className="mt-4 mb-1 px-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("admin")}
                </div>
              )}
              <NavItem 
                item={{ to: "/admin", labelKey: "adminDashboard", icon: Shield }}
                active={pathname.startsWith("/admin")}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            </>
          )}
        </div>

        {!collapsed && <RecentChats onNavigate={onNavigate} />}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && <UpgradePremium />}
        
        {collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/premium"
                className="w-full flex justify-center py-2 rounded-lg hover:bg-sidebar-accent text-primary transition-colors"
              >
                <Sparkles className="h-4 w-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              {t("upgradePremium")}
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(
            "w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-all",
            collapsed && "justify-center px-0 w-10 mx-auto"
          )}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-secondary to-muted grid place-items-center text-[12px] font-medium overflow-hidden shrink-0 border border-sidebar-border shadow-sm">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[13px] font-medium truncate leading-none">{displayName}</div>
                  <div className="text-[11px] text-muted-foreground truncate mt-1">{email}</div>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? "start" : "end"} side={collapsed ? "right" : "top"} className="w-64 ml-2 duration-150 ease-out">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3 py-1">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-secondary to-muted grid place-items-center text-[12px] font-medium overflow-hidden shrink-0 border border-sidebar-border">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{displayName}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{email}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <button className="w-full flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Add account</span>
              </button>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link to="/settings" onClick={() => onNavigate?.()} className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{t("settings")}</span>
                </div>
                <DropdownMenuShortcut>↑^,</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Link to="/premium" onClick={() => onNavigate?.()} className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4" />
                <span>Upgrade plan</span>
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <button className="w-full flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span>Install apps</span>
              </button>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Appearance</span>
                <span className="ml-auto text-[11px] text-muted-foreground">Light</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Light</DropdownMenuItem>
                <DropdownMenuItem>Dark</DropdownMenuItem>
                <DropdownMenuItem>System</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>Language</span>
                <span className="ml-auto text-[11px] text-muted-foreground">Default</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="duration-150 ease-out">
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>Spanish</DropdownMenuItem>
                <DropdownMenuItem>French</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/help" onClick={() => onNavigate?.()} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <LifeBuoy className="h-4 w-4" />
                      <span>Get started</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/help" onClick={() => onNavigate?.()} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>Help center</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={"/changelog" as any} onClick={() => onNavigate?.()} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4" />
                      <span>Changelog</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={"/blog" as any} onClick={() => onNavigate?.()} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Pencil className="h-4 w-4" />
                      <span>Blog</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-4 w-4" />
                    <span>Keyboard shortcuts</span>
                  </div>
                  <DropdownMenuShortcut>^/</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Contact Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="#" target="_blank" className="flex items-center justify-between w-full">
                    <span>Careers</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/terms">Terms of service</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/privacy">Privacy policy</Link>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" onClick={() => onNavigate?.()} className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>{t("adminDashboard")}</span>
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>{t("logOut")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const { appearance, update } = useAppearance();
  const isCollapsed = appearance.sidebarDefault === "collapsed";
  const { t } = useTranslation();

  return (
    <aside 
      className={cn(
        "arch-sidebar-desktop flex shrink-0 flex-col border-r border-border transition-all duration-150 ease-out relative group z-30 bg-sidebar",
        isCollapsed ? "w-[68px]" : "w-[248px]"
      )}
      style={{ display: 'flex' }}
    >
      <SidebarBody 
        collapsed={isCollapsed} 
        onToggle={() => update({ sidebarDefault: isCollapsed ? "expanded" : "collapsed" })}
      />
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
          className="h-8 w-8 md:hidden text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SidebarBody onNavigate={() => setOpen(false)} collapsed={false} onToggle={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
