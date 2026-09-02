import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { useState, useEffect } from "react";
import { 
  Monitor, 
  Cloud, 
  Download, 
  Link as LinkIcon, 
  ShieldCheck, 
  Settings, 
  RefreshCcw, 
  XCircle, 
  AlertCircle,
  Terminal,
  FileCode,
  Shield,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/computer")({
  head: () => ({ 
    meta: [
      { title: "Computer Control — Metrixcom" },
      { name: "description", content: "Manage local and cloud computer connections for Metrixcom Engine." }
    ] 
  }),
  component: ComputerPage,
});

type DeviceStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'pending_permission';

interface Device {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  os?: string;
  app_version?: string;
  status: DeviceStatus;
  last_seen_at: string;
}

function ComputerPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setDevices(data as Device[]);
      }
      setLoading(false);
    };

    fetchDevices();

    // Subscribe to status changes
    const channel = supabase
      .channel('device_status')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_devices',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const updated = payload.new as Device;
        setDevices(prev => {
          const exists = prev.some(d => d.id === updated.id);
          if (exists) return prev.map(d => d.id === updated.id ? updated : d);
          return [updated, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <PageShell title="Computer" description="Control and automate your computing environments.">
      <div className="min-h-0 -webkit-overflow-scrolling-touch pointer-events-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LocalComputerSection devices={devices.filter(d => d.type === 'local')} />
        <CloudComputerSection devices={devices.filter(d => d.type === 'cloud')} />
      </div>
      
      <div className="mt-10">
        <AuditLogSection />
      </div>
      </div>
    </PageShell>
  );
}

function LocalComputerSection({ devices }: { devices: Device[] }) {
  const connected = devices.find(d => d.status === 'connected');
  
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Monitor className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Local Computer</h2>
          <p className="text-xs text-muted-foreground">Work with files and tools on your authorized machine.</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 py-4">
        {connected ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-medium">Computer Connected</span>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                {connected.os || 'Unknown OS'}
              </Badge>
            </div>
            <div className="space-y-1.5 mb-4">
              <p className="text-xs font-medium">{connected.name}</p>
              <p className="text-[11px] text-muted-foreground">Version: {connected.app_version || '1.0.0'}</p>
              <p className="text-[11px] text-muted-foreground">Last seen: {new Date(connected.last_seen_at).toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-8">Manage Permissions</Button>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10">Disconnect</Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-6">
              Let Metrixcom work with your local files, applications, and terminal tools. 
              Requires the Crux Desktop Companion.
            </p>
            <div className="flex flex-col gap-2 max-w-[240px] mx-auto">
              <Button className="gap-2">
                <LinkIcon className="h-4 w-4" /> Connect Computer
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Download Companion
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Encrypted P2P connection</span>
        </div>
      </div>
    </div>
  );
}

function CloudComputerSection({ devices }: { devices: Device[] }) {
  const { user } = useAuth();
  const [provisioning, setProvisioning] = useState(false);
  const running = devices.find(d => d.status === 'connected');

  const handleSetup = async () => {
    if (!user) return;
    setProvisioning(true);
    try {
      const response = await fetch('/api/public/cloud-compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Cloud provisioning initiated", {
          description: "Metrixcom is spinning up your isolated workspace. This usually takes 45-60s."
        });
        
        // The subscription in useEffect will pick up the real DB changes
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to provision cloud computer");
      setProvisioning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
          <Cloud className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Cloud Computer</h2>
          <p className="text-xs text-muted-foreground">Isolated, persistent high-performance workspaces.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
        {running ? (
          <div className="w-full space-y-4">
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-left">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm font-medium">Instance Running</span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-accent border-accent/30">
                  Linux (Isolated)
                </Badge>
              </div>
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium">metrix-cloud-{running.id.slice(-4)}</p>
                <p className="text-[11px] text-muted-foreground">Region: us-east-1</p>
                <p className="text-[11px] text-muted-foreground">Last seen: Just now</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8">Access Terminal</Button>
                <Button variant="ghost" size="sm" className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10">Terminate</Button>
              </div>
            </div>
          </div>
        ) : provisioning ? (
          <>
            <div className="h-12 w-12 rounded-full border border-border flex items-center justify-center mb-4">
              <RefreshCcw className="h-5 w-5 text-accent animate-spin" />
            </div>
            <h3 className="text-sm font-medium mb-1">Provisioning Infrastructure</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Metrixcom Cloud Compute is being prepared for your account.
            </p>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-accent/5 border border-accent/10 flex items-center justify-center mb-4">
              <Cloud className="h-5 w-5 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Create an isolated, persistent workspace where Metrixcom can work without requiring local computer setup.
            </p>
            <Button onClick={handleSetup} className="gap-2 bg-accent hover:bg-accent/90">
              <RefreshCcw className="h-4 w-4" /> Set Up Cloud Computer
            </Button>
          </>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Regional availability: North America, Europe</span>
        </div>
      </div>
    </div>
  );
}

function AuditLogSection() {
  const [logs, setLogs] = useState<any[]>([]);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Computer Activity
        </h2>
        <Button variant="ghost" size="sm" className="text-[10px] uppercase tracking-wider h-6">Clear History</Button>
      </div>
      
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-10 w-10 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3">
                <Terminal className="h-5 w-5 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground">No recent computer activity.</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="p-3 flex items-start gap-4 hover:bg-sidebar-accent/30 transition-colors">
                {/* Log rows would go here */}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
