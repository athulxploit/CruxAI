import * as React from "react";
import { 
  X, Check, Shield, Info, ExternalLink, Loader2, 
  Settings, Puzzle, LogOut, RefreshCw, AlertCircle, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConnectorLogo } from "@/components/arch/connector-logo";
import { type Plugin } from "@/lib/plugins/catalog";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { startConnectorAuth, saveConnectorConnection, disconnectConnector } from "@/lib/connectors.functions";
import { toast } from "sonner";

interface PluginDetailViewProps {
  plugin: Plugin;
  status?: string;
  accountName?: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function PluginDetailView({ 
  plugin, 
  status, 
  accountName, 
  onClose, 
  onRefresh 
}: PluginDetailViewProps) {
  const { user } = useAuth();
  const [busy, setBusy] = React.useState(false);
  const isConnected = status === "connected";
  const isInstalled = !!status;

  const startAuthFn = useServerFn(startConnectorAuth);
  const saveConnectionFn = useServerFn(saveConnectorConnection);
  const disconnectFn = useServerFn(disconnectConnector);

  async function handleConnect() {
    if (!user) {
      toast.error("Please sign in to connect");
      return;
    }

    if (!plugin.ready) {
      toast.info(`${plugin.name} integration is currently in preview.`);
      return;
    }

    setBusy(true);
    try {
      const { authorizationUrl } = await startAuthFn({
        data: {
          connectorId: plugin.id,
          origin: window.location.origin
        }
      });

      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        // The callback logic should match the connector ID
        if (
            (event.data?.type === "lovable-connector-auth" || event.data?.type === `metrixcom_${plugin.id}_oauth`) && 
            (event.data?.connectorId === plugin.id || plugin.id === 'github')
        ) {
          window.removeEventListener("message", handleMessage);
          if (event.data.status === "success" || event.data.success) {
            await saveConnectionFn({
              data: {
                connectorId: plugin.id,
                connectionAPIKey: event.data.connectionAPIKey || "connected",
                accountName: event.data.accountName
              }
            });
            toast.success(`${plugin.name} connected successfully`);
            onRefresh();
          } else {
            toast.error(event.data.error || "Connection failed");
          }
          setBusy(false);
        }
      };

      window.addEventListener("message", handleMessage);
      
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      
      const authWindow = window.open(
        authorizationUrl, 
        `MetrixcomPluginAuth_${plugin.id}`, 
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        window.removeEventListener("message", handleMessage);
        toast.error("Popup blocked. Please allow popups to connect.");
        setBusy(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start connection");
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectFn({
        data: { connectorId: plugin.id }
      });
      toast.success(`${plugin.name} disconnected`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 bg-surface flex flex-col animate-in fade-in slide-in-from-right-4 duration-150 ease-out">
      {/* Detail Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated/30">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
          Back to Directory
        </button>
        <div className="flex items-center gap-2">
          {isInstalled && (
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-8 text-[11px] font-medium border border-border/50 hover:bg-white/5"
               onClick={onRefresh}
               disabled={busy}
             >
               <RefreshCw className={cn("h-3 w-3 mr-1.5", busy && "animate-spin")} />
               Refresh
             </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Left Column: Plugin Info */}
          <div className="flex-1 space-y-8">
            <div className="flex items-start gap-6">
              <div className={cn("p-6 rounded-[28px] ring-1 ring-border shadow-md", plugin.tone)}>
                <ConnectorLogo connector={plugin as any} className="h-16 w-16 rounded-2xl" />
              </div>
              <div className="pt-2">
                <h2 className="text-3xl font-bold tracking-tight">{plugin.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <span className="text-sm font-medium text-muted-foreground">by {plugin.provider}</span>
                   {plugin.ready && (
                     <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                       Verified
                     </span>
                   )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" /> About
              </h3>
              <p className="text-[15px] text-foreground/80 leading-relaxed">
                {plugin.description}
              </p>
            </div>

            {plugin.capabilities && plugin.capabilities.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Capabilities
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plugin.capabilities.map((cap, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-surface-elevated/50 border border-border/50">
                      <div className="font-semibold text-[13px]">{cap.name}</div>
                      <div className="text-[12px] text-muted-foreground mt-1">{cap.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Privacy & Security
              </h3>
              <div className="p-5 rounded-2xl bg-surface-elevated/30 border border-border/50 space-y-4">
                <div className="text-[13px] leading-relaxed">
                  Metrixcom access is limited to the permissions explicitly granted. We never store your credentials.
                </div>
                {plugin.permissions && plugin.permissions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase">Requested Permissions</div>
                    <ul className="space-y-1.5">
                      {plugin.permissions.map((p, i) => (
                        <li key={i} className="flex items-center gap-2 text-[12.5px]">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Connection Status */}
          <div className="w-full md:w-80 space-y-6">
            <div className="p-6 rounded-[24px] border border-border bg-surface-elevated shadow-sm space-y-6">
              <div className="space-y-1.5 text-center">
                <div className="text-sm font-semibold">Connection Status</div>
                {isConnected ? (
                  <div className="flex items-center justify-center gap-1.5 text-primary">
                    <Check className="h-4 w-4" />
                    <span className="text-[13px] font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-[13px]">Disconnected</span>
                  </div>
                )}
              </div>

              {isConnected && accountName && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Account</label>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 ring-1 ring-border">
                    <span className="text-[13px] font-medium truncate">{accountName}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-3">
                {isConnected ? (
                  <>
                    <Button 
                      onClick={handleConnect}
                      disabled={busy || !plugin.ready}
                      className="w-full rounded-xl h-11 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                      variant="outline"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Reconnect"}
                    </Button>
                    <Button 
                      onClick={handleDisconnect}
                      disabled={busy}
                      variant="destructive"
                      className="w-full rounded-xl h-11 bg-red-500/10 text-red-500 border border-red-500/10 hover:bg-red-500/20"
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <><LogOut className="h-4 w-4 mr-2" /> Disconnect</>}
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={handleConnect}
                    disabled={busy || !plugin.ready}
                    className="w-full rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : plugin.ready ? `Connect ${plugin.name}` : "Coming Soon"}
                  </Button>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
              <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[12px] text-blue-100/70 leading-relaxed">
                All connections are secured via bank-grade OAuth2 encryption. We never see or store your passwords.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
