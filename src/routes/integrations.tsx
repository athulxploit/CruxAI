import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { ConnectorLogo } from "@/components/arch/connector-logo";
import { AutomationLabTool } from "./workspaces.$tool";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CONNECTORS, CONNECTOR_CATEGORIES, type Connector, type ConnectorCategory } from "@/lib/connectors-catalog";
import { Search, Plus, Check, BadgeCheck, TrendingUp, Sparkles, Loader2, ChevronDown, Shield, Info, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { startConnectorAuth, saveConnectorConnection, disconnectConnector, listUserConnections } from "@/lib/connectors.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations & Connectors — Metrixcom" },
      { name: "description", content: "Connect your favorite services like GitHub, Google Drive, and Slack to the Metrixcom AI Engine for a unified, automated workflow." },
      { property: "og:title", content: "Metrixcom Integrations" },
      { property: "og:description", content: "Seamlessly connect your tools to Metrixcom AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IntegrationsPage,
});

type Conn = { connected: boolean; connected_at?: string; account_name?: string };
type Filter = "discover" | "all" | "connected" | "available" | "workflow";

function IntegrationsPage() {
  const { user } = useAuth();
  // Removed useNavigate as it's not used in the new flow
  const [loaded, setLoaded] = useState(false);
  const [connections, setConnections] = useState<Record<string, Conn>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("discover");
  const [category, setCategory] = useState<ConnectorCategory | "all">("all");
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const listConnectionsFn = useServerFn(listUserConnections);
  const startAuthFn = useServerFn(startConnectorAuth);
  const saveConnectionFn = useServerFn(saveConnectorConnection);
  const disconnectFn = useServerFn(disconnectConnector);

  const fetchConnections = async () => {
    if (!user) return;
    try {
      const { connections: list } = await listConnectionsFn();
      const mapped: Record<string, Conn> = {};
      list.forEach((c) => {
        mapped[c.connector_id] = {
          connected: c.status === "connected",
          connected_at: c.updated_at,
          account_name: c.account_display_name || undefined
        };
      });
      setConnections(mapped);
    } catch (err) {
      console.error("Failed to fetch connections", err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [user]);

  async function handleAction(c: Connector) {
    if (!user) {
      toast.error("Sign in to connect services");
      return;
    }

    if (connections[c.id]?.connected) {
      setSelectedConnector(c);
      setShowDetailsDialog(true);
      return;
    }

    if (!c.ready) {
      toast.info(`${c.name} connector setup is required on the server.`);
      return;
    }

    setSelectedConnector(c);
    setShowAuthDialog(true);
  }

  async function handleConnect() {
    if (!selectedConnector || !user) return;
    setBusy(selectedConnector.id);
    setShowAuthDialog(false);

    try {
      const { authorizationUrl } = await startAuthFn({
        data: {
          connectorId: selectedConnector.id,
          origin: window.location.origin
        }
      });

      // Simple web message listener for OAuth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === "lovable-connector-auth" && event.data?.connectorId === selectedConnector.id) {
          window.removeEventListener("message", handleMessage);
          if (event.data.status === "success") {
            await saveConnectionFn({
              data: {
                connectorId: selectedConnector.id,
                connectionAPIKey: event.data.connectionAPIKey,
                accountName: event.data.accountName
              }
            });
            toast.success(`${selectedConnector.name} connected successfully`);
            fetchConnections();
          } else {
            toast.error(event.data.error || "Connection failed");
          }
          setBusy(null);
        }
      };

      window.addEventListener("message", handleMessage);
      
      const authWindow = window.open(authorizationUrl, "MetrixcomConnectorAuth", "width=600,height=700");
      if (!authWindow) {
        window.removeEventListener("message", handleMessage);
        toast.error("Popup blocked. Please allow popups to connect.");
        setBusy(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start connection");
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!selectedConnector || !user) return;
    setBusy(selectedConnector.id);
    setShowDetailsDialog(false);

    try {
      await disconnectFn({
        data: { connectorId: selectedConnector.id }
      });
      toast.success(`${selectedConnector.name} disconnected`);
      fetchConnections();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setBusy(null);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CONNECTORS.filter((c) => {
      if (q && !(`${c.name} ${c.description}`.toLowerCase().includes(q))) return false;
      if (category !== "all" && c.category !== category) return false;
      const isConnected = !!connections[c.id]?.connected;
      if (filter === "connected" && !isConnected) return false;
      if (filter === "available" && isConnected) return false;
      return true;
    });
  }, [query, category, filter, connections]);

  const grouped = useMemo(() => {
    const sections: { category: ConnectorCategory; items: Connector[] }[] = [];
    for (const cat of CONNECTOR_CATEGORIES) {
      const items = visible.filter((c) => c.category === cat);
      if (items.length) sections.push({ category: cat, items });
    }
    return sections;
  }, [visible]);

  return (
    <PageShell title="Integrations" description="Connectors">
      <div className="mx-auto w-full max-w-[1200px] px-1 pt-4 min-h-0 pointer-events-auto">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[26px] font-semibold tracking-tight">Connectors</h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              Connect services so Metrixcom can access and act on your data
            </p>
          </div>
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all connectors"
              className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13px] outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-2">
          {(["discover", "all", "connected", "available", "workflow"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "h-9 rounded-full border px-4 text-[13px] capitalize transition-colors",
                filter === f
                  ? "border-transparent bg-foreground/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-[13px] text-muted-foreground hover:text-foreground">
                {category === "all" ? "All categories" : category}
                <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-border bg-surface">
                <DropdownMenuItem onClick={() => setCategory("all")}>All categories</DropdownMenuItem>
                {CONNECTOR_CATEGORIES.map((c) => (
                  <DropdownMenuItem key={c} onClick={() => setCategory(c)}>
                    {c}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {filter === "workflow" ? (
          <div className="pb-20">
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-foreground mb-1">Automation Engine</h3>
              <p className="text-[13px] text-muted-foreground">Visual node-based workflow builder to orchestrate tasks, APIs, and AI actions.</p>
            </div>
            <div className="rounded-[24px] border border-border bg-[#f8f9fa] dark:bg-[#0f1115] overflow-hidden">
              <AutomationLabTool />
            </div>

          </div>
        ) : !loaded ? (
          <div className="text-[13px] text-muted-foreground">Loading connectors…</div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-muted-foreground">
            No connectors match your search.
          </div>
        ) : (
          <div className="space-y-12 pb-20">
            {grouped.map((section) => (
              <section key={section.category}>
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {section.category === "Popular" ? (
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    ) : section.category === "New" ? (
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                    <h3 className="text-[15px] font-semibold text-foreground">{section.category}</h3>
                  </div>
                  <button className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                    View all
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((c) => (
                    <ConnectorCard
                      key={c.id}
                      connector={c}
                      connected={!!connections[c.id]?.connected}
                      busy={busy === c.id}
                      onToggle={() => handleAction(c)}
                    />
                  ))}
      </div>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="rounded-[24px] border-border bg-surface p-0 overflow-hidden sm:max-w-[420px]">
          <div className="p-6">
            <DialogHeader className="flex flex-col items-center text-center space-y-4">
              {selectedConnector && (
                <div className="p-4 rounded-[20px] bg-surface ring-1 ring-border">
                  <ConnectorLogo connector={selectedConnector} className="h-16 w-16 rounded-[16px] ring-0" />
                </div>
              )}
              <DialogTitle className="text-xl">Connect {selectedConnector?.name}</DialogTitle>
              <DialogDescription className="text-[14px]">
                Metrixcom AI is requesting access to:
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-3">
              {selectedConnector?.permissions?.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background/30 ring-1 ring-border/50">
                  <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="text-[13px]">{p}</span>
                </div>
              ))}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/10">
                <Shield className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                <span className="text-[13px] text-blue-100/80">Metrixcom will never know your account password.</span>
              </div>
            </div>

            <DialogFooter className="mt-8 grid grid-cols-2 gap-3 sm:flex-none">
              <Button 
                variant="outline" 
                onClick={() => setShowAuthDialog(false)}
                className="rounded-xl h-11 border-border bg-transparent hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnect}
                className="rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Connect
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="rounded-[24px] border-border bg-surface p-0 overflow-hidden sm:max-w-[420px]">
          <div className="p-6">
            <DialogHeader className="flex flex-col items-center text-center space-y-4">
              {selectedConnector && (
                <div className="p-4 rounded-[20px] bg-surface ring-1 ring-border">
                  <ConnectorLogo connector={selectedConnector} className="h-16 w-16 rounded-[16px] ring-0" />
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">{selectedConnector?.name}</DialogTitle>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-primary">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-[13px] font-medium">Connected</span>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground ml-1">Connected Account</label>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-background/50 ring-1 ring-border">
                  <span className="text-[14px] font-medium">{connections[selectedConnector?.id || ""]?.account_name || "Primary Account"}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground ml-1">Permissions Granted</label>
                <div className="space-y-2">
                  {selectedConnector?.permissions?.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                Last synced {connections[selectedConnector?.id || ""]?.connected_at ? new Date(connections[selectedConnector?.id || ""].connected_at!).toLocaleDateString() : "just now"}
              </div>
            </div>

            <DialogFooter className="mt-8 grid grid-cols-2 gap-3 sm:flex-none">
              <Button 
                variant="outline" 
                onClick={handleConnect}
                className="rounded-xl h-11 border-border bg-transparent hover:bg-white/5"
              >
                Reconnect
              </Button>
              <Button 
                variant="destructive"
                onClick={handleDisconnect}
                className="rounded-xl h-11 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
              >
                Disconnect
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
              </section>
            ))}
          </div>

        )}
      </div>
    </PageShell>
  );
}

function ConnectorCard({
  connector,
  connected,
  busy,
  onToggle,
}: {
  connector: Connector;
  connected: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      className="group relative flex items-center gap-4 rounded-[20px] border border-border bg-surface p-4 text-left transition-all hover:border-primary/30 hover:bg-white/[0.02] disabled:opacity-60"
    >
      <div className="shrink-0">
        <ConnectorLogo connector={connector} className="h-12 w-12 rounded-[14px] ring-0" />
      </div>

      <div className="min-w-0 flex-1 pr-6">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14.5px] font-medium text-foreground">
            {connector.name}
          </span>
          {connector.verified && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 fill-blue-500 text-[#1A1A1A]" />
          )}
          {connector.popular && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground">Popular</span>
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
          {connector.description}
        </p>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : connected ? (
          <Check className="h-4 w-4 text-primary" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </div>
    </button>

  );
}
