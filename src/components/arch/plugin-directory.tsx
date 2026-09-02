import * as React from "react";
import { 
  Search, X, Check, Globe, Sparkles, Layout, 
  Settings, Info, Shield, ExternalLink, Loader2,
  Package, Box, Zap, ChevronRight, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConnectorLogo } from "@/components/arch/connector-logo";
import { PLUGINS, PLUGIN_CATEGORIES, type Plugin, type PluginCategory } from "@/lib/plugins/catalog";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { listUserConnections, startConnectorAuth, saveConnectorConnection, disconnectConnector } from "@/lib/connectors.functions";
import { toast } from "sonner";
import { PluginDetailView } from "./plugin-detail-view";

interface PluginDirectoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluginDirectory({ open, onOpenChange }: PluginDirectoryProps) {
  const { user } = useAuth();
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<PluginCategory>("Discover");
  const [connections, setConnections] = React.useState<Record<string, { status: string; accountName?: string }>>({});
  const [loading, setLoading] = React.useState(true);
  const [selectedPlugin, setSelectedPlugin] = React.useState<Plugin | null>(null);
  const [isInstalling, setIsInstalling] = React.useState<string | null>(null);

  const fetchConnections = useServerFn(listUserConnections);
  const startAuthFn = useServerFn(startConnectorAuth);
  const saveConnectionFn = useServerFn(saveConnectorConnection);
  const disconnectFn = useServerFn(disconnectConnector);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    try {
      const { connections: list } = await fetchConnections();
      const mapped: Record<string, { status: string; accountName?: string }> = {};
      list.forEach((c) => {
        mapped[c.connector_id] = {
          status: c.status || "connected",
          accountName: c.account_display_name || undefined
        };
      });
      setConnections(mapped);
    } catch (err) {
      console.error("Failed to load plugin connections", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchConnections]);

  React.useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  const filteredPlugins = React.useMemo(() => {
    let list = PLUGINS;
    const q = query.toLowerCase().trim();

    if (q) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q)
      );
    }

    if (activeTab === "Installed") {
      list = list.filter(p => !!connections[p.id]);
    } else if (activeTab === "My Plugins") {
      // Logic for developer's own plugins could go here
      list = list.filter(p => !!connections[p.id]); 
    } else if (activeTab !== "Discover") {
      list = list.filter(p => p.category === activeTab);
    }

    return list;
  }, [query, activeTab, connections]);

  const handleInstall = async (plugin: Plugin) => {
    if (!user) {
      toast.error("Please sign in to install plugins");
      return;
    }
    
    setIsInstalling(plugin.id);
    try {
      // "Installing" in the current system means initiating OAuth or adding a placeholder connection
      // For the UI simulation, we mark it as "installed" locally first
      // Real auth logic would be triggered in the detail view
      setSelectedPlugin(plugin);
    } finally {
      setIsInstalling(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-[1000px] h-[85vh] p-0 gap-0 border-border bg-surface overflow-hidden rounded-2xl flex flex-col shadow-2xl duration-150 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated/50">
          <div>
            <DialogTitle className="text-xl font-semibold tracking-tight">Plugins</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Extend Crux AI with powerful tools and capabilities.
            </DialogDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plugins..."
                className="h-9 pl-9 text-xs bg-surface border-border focus:ring-1 focus:ring-primary/20 rounded-xl"
              />
              {query && (
                <button 
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <div className="w-56 border-r border-border bg-surface/50 overflow-y-auto hidden md:block">
            <div className="p-3 space-y-1">
              <NavButton 
                active={activeTab === "Discover"} 
                onClick={() => setActiveTab("Discover")}
                icon={<Globe className="h-4 w-4" />}
                label="Discover"
              />
              <NavButton 
                active={activeTab === "Installed"} 
                onClick={() => setActiveTab("Installed")}
                icon={<Box className="h-4 w-4" />}
                label="Installed"
              />
              <NavButton 
                active={activeTab === "My Plugins"} 
                onClick={() => setActiveTab("My Plugins")}
                icon={<Package className="h-4 w-4" />}
                label="My Plugins"
              />
            </div>
            
            <div className="mt-4 px-6 mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Categories</span>
            </div>
            
            <div className="p-3 space-y-1">
              {PLUGIN_CATEGORIES.map(cat => (
                <NavButton 
                  key={cat}
                  active={activeTab === cat}
                  onClick={() => setActiveTab(cat as any)}
                  label={cat}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 overflow-y-auto bg-surface-elevated/20">
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin opacity-50" />
                  <span className="text-sm">Loading directory...</span>
                </div>
              ) : filteredPlugins.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground space-y-2">
                  <Search className="h-10 w-10 opacity-20" />
                  <span className="text-sm font-medium text-foreground/50">No plugins found</span>
                  <span className="text-xs">Try adjusting your search or category filters</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredPlugins.map(plugin => (
                    <PluginCard 
                      key={plugin.id}
                      plugin={plugin}
                      status={connections[plugin.id]?.status}
                      isInstalling={isInstalling === plugin.id}
                      onClick={() => setSelectedPlugin(plugin)}
                      onInstall={() => handleInstall(plugin)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Plugin Detail View */}
        {selectedPlugin && (
          <PluginDetailView 
            plugin={selectedPlugin}
            status={connections[selectedPlugin.id]?.status}
            accountName={connections[selectedPlugin.id]?.accountName}
            onClose={() => setSelectedPlugin(null)}
            onRefresh={loadData}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NavButton({ 
  active, 
  onClick, 
  label, 
  icon,
  compact = false 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string; 
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-[13px] rounded-xl transition-all duration-200 group",
        active 
          ? "bg-primary/10 text-primary font-medium" 
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        compact && "text-[12.5px] py-1.5"
      )}
    >
      {icon && <span className={cn("transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>{icon}</span>}
      <span className="flex-1 text-left">{label}</span>
      {active && <div className="h-1 w-1 rounded-full bg-primary" />}
    </button>
  );
}

function PluginCard({ 
  plugin, 
  status,
  isInstalling,
  onClick,
  onInstall
}: { 
  plugin: Plugin; 
  status?: string;
  isInstalling?: boolean;
  onClick: () => void;
  onInstall: () => void;
}) {
  const isInstalled = !!status;
  
  return (
    <div 
      onClick={onClick}
      className="group relative bg-surface border border-border/50 hover:border-border-strong hover:bg-surface-elevated rounded-[20px] p-5 transition-all duration-300 cursor-pointer flex flex-col h-full shadow-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl ring-1 ring-border/50 shadow-sm transition-transform group-hover:scale-105", plugin.tone)}>
          <ConnectorLogo connector={plugin as any} className="h-8 w-8 rounded-xl" />
        </div>
        {plugin.popular && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
            <Zap className="h-2.5 w-2.5 fill-current" />
            Popular
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{plugin.name}</h3>
        <p className="text-[12px] text-muted-foreground leading-snug mt-1.5 line-clamp-2">
          {plugin.description}
        </p>
      </div>
      
      <div className="mt-5 flex items-center justify-between">
        <div className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          {plugin.category}
        </div>
        
        {isInstalled ? (
          <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
            <Check className="h-3.5 w-3.5" />
            <span>Installed</span>
          </div>
        ) : (
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 px-3 text-[11px] font-semibold bg-white/5 hover:bg-primary hover:text-primary-foreground rounded-lg transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onInstall();
            }}
            disabled={isInstalling}
          >
            {isInstalling ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
          </Button>
        )}
      </div>
    </div>
  );
}
