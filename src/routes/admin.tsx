import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/arch/page-shell";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PLAN_ORDER, planLabel } from "@/lib/plan-meta";
import { MODEL_REGISTRY } from "@/lib/model-registry";
import type { Database } from "@/integrations/supabase/types";
import { getAdminAnalytics } from "@/lib/admin-analytics.functions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];

import { runSecurityScan, listScanPhases, SCAN_PHASE_PLAN, fixSecurityFindings, generatePentestReport, runFixSubStep, getFixPlan, dryRunFixFinding, MANUAL_REMEDIATION, type FixPhase, type DryRunFinding, type ScanPhase } from "@/lib/security-scan.functions";
import { verifyMfa } from "@/lib/mfa.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, ShieldCheck, ShieldAlert, ShieldX, Loader2, RefreshCw, FileDown, CheckCircle2, XCircle, X, History, Download, Sparkles, FlaskConical, PlayCircle, Check, Copy, Wrench, Activity as ActivityIcon, Users as UsersIcon, Zap, TrendingUp, AlertCircle, Clock, Monitor } from "lucide-react";

const FOUNDER_EMAIL = "athulkrishna456727@gmail.com";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Metrixcom" }, { name: "description", content: "Metrixcom Admin Command Center for managing next-gen GPT-5 agents and system architecture." }] }),
  component: AdminGate,
});

const TABS = [
  "Overview",
  "Users",
  "Plans",
  "Limits",
  "Diagnostics",
  "System Diagnostics",
  "Overrides",
  "Promotions",
  "Features",
  "Models",
  "AI Keys",
  "Workflows",
  "Announcements",
  "Activity",
  "Support",
  "Agents",
  "Broadcasts",
  "Security",
  "System",
] as const;
type Tab = (typeof TABS)[number];


function AdminGate() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [mfaState, setMfaState] = useState<"loading" | "ok" | "enroll" | "challenge">("loading");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const verifyFn = useServerFn(verifyMfa);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/" });
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAdmin || !user) return;
      setMfaState("loading");
      const { data } = await supabase
        .from("security_prefs")
        .select("two_factor_enabled, mfa_verified_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const email = user.email?.toLowerCase() || "";
      if (!data?.two_factor_enabled && email !== FOUNDER_EMAIL) { setMfaState("enroll"); return; }
      const stamp = data?.mfa_verified_at ? new Date(data.mfa_verified_at).getTime() : 0;
      const isFounder = email === FOUNDER_EMAIL;
      const fresh = (stamp > Date.now() - 30 * 60 * 1000) || isFounder;
      setMfaState(fresh ? "ok" : "challenge");
    })();
    return () => { cancelled = true; };
  }, [isAdmin, user]);

  async function submitCode() {
    setBusy(true);
    try {
      const res = await verifyFn({ data: { code } });
      if (!res?.ok) { toast.error(res?.error ?? "Invalid code"); return; }
      setMfaState("ok");
      toast.success("Verified — admin unlocked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally { setBusy(false); }
  }

  if (loading || mfaState === "loading") return <div className="p-10 text-muted-foreground text-sm">Loading…</div>;
  if (!isAdmin) return null;

  if (mfaState === "enroll") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 text-amber-500 text-[12px] font-medium uppercase tracking-wide">
            <ShieldAlert className="h-4 w-4" /> Admin protection required
          </div>
          <h2 className="mt-2 text-[20px] font-semibold">Enable two-factor authentication</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Admin accounts must have TOTP 2FA enabled. Set it up in Settings → Security, then return here.
          </p>
          <div className="mt-5 flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => navigate({ to: "/" })}>Cancel</Button>
            <Button onClick={() => navigate({ to: "/settings", hash: "security" })}>
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Set up 2FA
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (mfaState === "challenge") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 text-primary text-[12px] font-medium uppercase tracking-wide">
            <ShieldCheck className="h-4 w-4" /> Admin verification
          </div>
          <h2 className="mt-2 text-[18px] font-semibold">Enter your 6-digit code</h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            From your authenticator app. Verified server-side; valid for 30 minutes.
          </p>
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            className="mt-4 tracking-widest text-center text-lg"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) submitCode(); }}
          />
          <div className="mt-4 flex justify-between gap-2">
            <Button variant="ghost" onClick={() => navigate({ to: "/" })}>Cancel</Button>
            <Button disabled={busy || code.length !== 6} onClick={submitCode}>
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <AdminPage />;
}

function AdminPage() {
  const [tab, setTab] = useState<Tab>("Overview");
  return (
    <PageShell title="Admin Dashboard" description="Operate Metrixcom at scale." stickyHeader>
      <div className="flex flex-col md:flex-row gap-6 min-h-0 pointer-events-auto relative items-start">
        <div className="w-full md:w-[200px] flex-none md:sticky md:top-28 self-start md:border-r md:border-border/50 md:pr-2">
          <nav className="space-y-0.5 md:max-h-[calc(100vh-250px)] md:overflow-y-auto -webkit-overflow-scrolling-touch">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors",
                  tab === t
                    ? "bg-secondary text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0 pr-2 relative z-10 pb-20">

          {tab === "Overview" && <Overview />}
          {tab === "Users" && <Users />}
          {tab === "Plans" && <Plans />}
          {tab === "Limits" && <Limits />}
          {tab === "Diagnostics" && <Diagnostics />}
          {tab === "System Diagnostics" && <SystemDiagnostics />}
          {tab === "Overrides" && <Overrides />}
          {tab === "Promotions" && <Promotions />}
          {tab === "Features" && <Features />}
          {tab === "Models" && <Models />}
          {tab === "AI Keys" && <AiKeys />}
          {tab === "Workflows" && <WorkflowsAdmin />}
          {tab === "Announcements" && <Announcements />}
          {tab === "Activity" && <Activity />}
          {tab === "Support" && <Support />}
          {tab === "Agents" && <Agents />}
          {tab === "Broadcasts" && <Broadcasts />}
          {tab === "Security" && <Security />}
          {tab === "System" && <System />}
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">{k}</div>
      <div className="mt-2 text-[20px] font-semibold tracking-tight">{v}</div>
    </div>
  );
}


/* ---------------- OVERVIEW ---------------- */

function Overview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const fetchAnalytics = useServerFn(getAdminAnalytics);

  const load = useCallback(async () => {
    try {
      const result = await fetchAnalytics();
      setData(result);
    } catch (err) {
      console.error("Failed to fetch admin analytics:", err);
      toast.error("Failed to load real-time analytics");
    } finally {
      setLoading(false);
    }
  }, [fetchAnalytics]);

  useEffect(() => {
    load();

    // Supabase Realtime for authoritative refresh
    const channel = supabase.channel("admin:analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "xcomm_model_usage" }, () => load())
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        <p className="text-[13.5px] text-muted-foreground">Aggregating real-time database metrics...</p>
      </div>
    );
  }

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SecurityAuditReminder />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium transition-colors",
          live ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500" : "border-amber-500/20 bg-amber-500/5 text-amber-500"
        )}>
          <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", live ? "bg-emerald-500" : "bg-amber-500")} />
          {live ? "Live data" : "Live connection unavailable"}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsStat 
          title="Total Users" 
          value={data?.users?.total.toLocaleString()} 
          icon={<UsersIcon className="h-4 w-4" />}
          trend={data?.users?.newToday > 0 ? `+${data.users.newToday} today` : null}
        />
        <AnalyticsStat 
          title="Active Now" 
          value={data?.users?.activeNow.toLocaleString()} 
          icon={<ActivityIcon className="h-4 w-4" />}
          description="Unique users (5m)"
          active
        />
        <AnalyticsStat 
          title="Active Today" 
          value={data?.users?.activeToday.toLocaleString()} 
          icon={<Zap className="h-4 w-4" />}
          description="Unique users"
        />
        <AnalyticsStat 
          title="AI Success Rate" 
          value={data?.usage?.total > 0 ? `${Math.round((data.usage.success / data.usage.total) * 100)}%` : "0%"} 
          icon={<TrendingUp className="h-4 w-4" />}
          description={`${data?.usage?.success} successful requests`}
        />
      </div>

      {/* Plans & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-semibold flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-primary" /> User Growth
            </h3>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Last 30 days</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.growth ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff40" 
                  fontSize={10} 
                  tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#ffffff40" fontSize={10} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#3B82F6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3B82F6" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Subscription Tiers
            </h3>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Current distribution</span>
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-1/2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.plans ?? []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="plan"
                  >
                    {(data?.plans ?? []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 pl-6 space-y-3">
              {(data?.plans ?? []).map((entry: any, index: number) => (
                <div key={entry.plan} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="capitalize text-muted-foreground">{entry.plan}</span>
                  </div>
                  <span className="font-semibold tabular-nums">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Usage & AI stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-5 min-h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Top AI Models
            </h3>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Requests last 7 days</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.models ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                <XAxis type="number" stroke="#ffffff40" fontSize={10} hide />
                <YAxis 
                  dataKey="model_key" 
                  type="category" 
                  stroke="#ffffff60" 
                  fontSize={10} 
                  width={150}
                  tickFormatter={(v) => v.split('/').pop()?.replace(':free', '') || v}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[14px] font-semibold flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-primary" /> Request Health
            </h3>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Successful</span>
                <span className="text-emerald-500 font-semibold">{data?.usage?.success}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${data?.usage?.total > 0 ? (data.usage.success / data.usage.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Errors</span>
                <span className="text-destructive font-semibold">{data?.usage?.error}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-destructive transition-all duration-500" 
                  style={{ width: `${data?.usage?.total > 0 ? (data.usage.error / data.usage.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Timeouts</span>
                <span className="text-amber-500 font-semibold">{data?.usage?.timeout}</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${data?.usage?.total > 0 ? (data.usage.timeout / data.usage.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-border space-y-4">
              <h4 className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Revenue Performance</h4>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col items-center justify-center text-center space-y-2">
                <AlertCircle className="h-5 w-5 text-amber-500/60" />
                <div className="text-[13px] font-medium text-amber-500/90">Revenue data unavailable</div>
                <div className="text-[11px] text-amber-500/60">Payment analytics will appear when payment transaction data is connected.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AgentHealthGrid />
    </div>
  );
}

function AnalyticsStat({ title, value, icon, trend, description, active }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend?: string | null; 
  description?: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 relative overflow-hidden group">
      {active && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50" />}
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[12px] text-muted-foreground font-medium">{title}</span>
          <div className="mt-2 text-[24px] font-bold tracking-tight tabular-nums">{value}</div>
          {trend && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
              <TrendingUp className="h-3 w-3" /> {trend}
            </div>
          )}
          {description && !trend && (
            <div className="mt-1 text-[11px] text-muted-foreground font-normal">
              {description}
            </div>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-white/5 text-muted-foreground group-hover:text-primary transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}


function SecurityAuditReminder() {
  const KEY = "arch:last-security-audit";
  const [last, setLast] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(KEY);
    return v ? Number(v) : null;
  });
  const daysSince = last ? Math.floor((Date.now() - last) / 86400000) : null;
  const overdue = daysSince === null || daysSince >= 30;
  function markDone() {
    const now = Date.now();
    window.localStorage.setItem(KEY, String(now));
    setLast(now);
  }
  return (
    <div className={`rounded-lg border p-3.5 flex items-center justify-between gap-3 ${overdue ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card/40"}`}>
      <div>
        <div className="text-[13px] font-medium flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${overdue ? "bg-amber-400" : "bg-emerald-400"}`} />
          Security audit
        </div>
        <div className="text-[11.5px] text-muted-foreground mt-0.5">
          {last
            ? overdue
              ? `Last audit ${daysSince} days ago — review recommended (every 30 days).`
              : `Last audit ${daysSince} days ago. Next due in ${30 - (daysSince ?? 0)} days.`
            : "No audit recorded yet. Run a full security review of RLS policies, secrets, and activity logs."}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => window.open("https://docs.lovable.dev/features/security", "_blank", "noopener")}>Checklist</Button>
        <Button size="sm" onClick={markDone}>{overdue ? "Mark reviewed" : "Re-mark"}</Button>
      </div>
    </div>
  );
}


function AgentHealthGrid() {
  const [rows, setRows] = useState<Array<{ id: string; name: string; enabled: boolean; maintenance: boolean; version: string; backend_model: string }>>([]);
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("agents_config").select("id, name, enabled, maintenance, version, backend_model").order("name");
      setRows((data as typeof rows) ?? []);
    }
    load();
    const ch = supabase.channel("adm-agents-health")
      .on("postgres_changes", { event: "*", schema: "public", table: "agents_config" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  if (rows.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {rows.map((a) => {
        const status = a.maintenance ? "Maintenance" : a.enabled ? "Healthy" : "Disabled";
        const tone = a.maintenance ? "text-amber-400 bg-amber-500/10" : a.enabled ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10";
        return (
          <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <div className="text-[13.5px] font-semibold">{a.name}</div>
              <span className={cn("text-[11px] px-2 py-0.5 rounded-full", tone)}>{status}</span>
            </div>
            <div className="mt-1 text-[11.5px] text-muted-foreground">v{a.version} · <span className="font-mono">{a.backend_model}</span></div>
            {a.maintenance && (
              <div className="mt-2 text-[10px] text-amber-500 font-medium uppercase tracking-tight">
                Admin-only access active
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- USERS ---------------- */

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  status: string;
  messages_used: number;
  created_at: string;
};

function Users() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,display_name,plan,status,messages_used,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data as UserRow[]) ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => {
      if (!q) return true;
      const s = q.toLowerCase();
      return (r.email ?? "").toLowerCase().includes(s)
        || (r.display_name ?? "").toLowerCase().includes(s)
        || r.id.toLowerCase().includes(s);
    }),
    [rows, q],
  );


  async function setPlan(id: string, plan: string) {
    const prev = rows.find((r) => r.id === id)?.plan ?? "free";
    if (prev === plan) return;
    const { error } = await supabase.from("profiles").update({ plan: plan as never }).eq("id", id);
    if (error) return toast.error(error.message);

    const upgraded = PLAN_ORDER.indexOf(plan as never) > PLAN_ORDER.indexOf(prev as never);
    // Best-effort in-app notification so the change is visible even if the
    // user isn't online when it happens.
    await supabase.from("notifications" as never).insert({
      user_id: id,
      title: upgraded ? `You've been upgraded to ${planLabel(plan)}` : `Your plan changed to ${planLabel(plan)}`,
      body: upgraded
        ? `Congratulations! Your Metrixcom account now has ${planLabel(plan)} access.`
        : `Your Metrixcom plan is now ${planLabel(plan)}.`,
      kind: "billing",
    } as never);
    toast.success(`Plan set to ${planLabel(plan)}`);
    load();
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("profiles").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(`User ${status}`);
  }

  return (
    <div>
      <Input placeholder="Search by email, name, or user ID…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 max-w-sm" />
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-4 py-2.5 font-normal">User</th>
              <th className="px-4 py-2.5 font-normal">User ID</th>
              <th className="px-4 py-2.5 font-normal">Email</th>
              <th className="px-4 py-2.5 font-normal">Plan</th>
              <th className="px-4 py-2.5 font-normal">Status</th>
              <th className="px-4 py-2.5 font-normal">Messages</th>
              <th className="px-4 py-2.5 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isApple = !!r.email && r.email.toLowerCase().endsWith("@privaterelay.appleid.com");
              const copyId = () => {
                navigator.clipboard?.writeText(r.id).then(
                  () => toast.success("User ID copied"),
                  () => toast.error("Copy failed"),
                );
              };
              return (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">{r.display_name ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={copyId}
                    title={`${r.id} — click to copy`}
                    className="font-mono text-[11.5px] text-muted-foreground hover:text-foreground"
                  >
                    {r.id.slice(0, 8)}…{r.id.slice(-4)}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {isApple ? <span className="text-[11.5px] italic">Apple ID (hidden)</span> : (r.email ?? "—")}
                </td>
                <td className="px-4 py-2.5">
                  <Select value={r.plan} onValueChange={(v) => setPlan(r.id, v)}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["free", "standard", "pro", "proplus"].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    "text-[11.5px] px-2 py-0.5 rounded-full",
                    r.status === "active" && "bg-emerald-500/10 text-emerald-400",
                    r.status === "suspended" && "bg-amber-500/10 text-amber-400",
                    r.status === "banned" && "bg-red-500/10 text-red-400",
                  )}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5">{r.messages_used}</td>
                <td className="px-4 py-2.5 space-x-1">
                  {r.status !== "suspended" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "suspended")}>Suspend</Button>}
                  {r.status !== "active" && <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "active")}>Reactivate</Button>}
                  {r.status !== "banned" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setStatus(r.id, "banned")}>Ban</Button>}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found.</td></tr>
            )}

          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- ACTIVITY ---------------- */

type ActivityRow = { id: string; type: string; category: string; message: string | null; email: string | null; created_at: string };

function Activity() {
  const [rows, setRows] = useState<ActivityRow[]>([]);

  async function load() {
    const { data } = await supabase
      .from("activity_log")
      .select("id,type,category,message,email,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as ActivityRow[]) ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, (payload) => {
        setRows((prev) => [payload.new as ActivityRow, ...prev].slice(0, 100));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <th className="px-4 py-2.5 font-normal">Time</th>
            <th className="px-4 py-2.5 font-normal">Category</th>
            <th className="px-4 py-2.5 font-normal">Event</th>
            <th className="px-4 py-2.5 font-normal">User</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</td>
              <td className="px-4 py-2.5">{r.category}</td>
              <td className="px-4 py-2.5">{r.message ?? r.type}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{r.email ?? "—"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No activity yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- SUPPORT ---------------- */

type SupportRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  type: string;
  message: string | null;
  meta: { body?: string; url?: string; ua?: string; provider?: string } | null;
  status: string;
  created_at: string;
};

function Support() {
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "bug_report" | "support_request">("all");
  const [selected, setSelected] = useState<SupportRow | null>(null);

  async function load() {
    const { data } = await supabase
      .from("activity_log")
      .select("id,user_id,email,type,message,meta,status,created_at")
      .in("type", ["bug_report", "support_request"])
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as SupportRow[]) ?? []);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`admin-support-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function displayEmail(r: SupportRow): string {
    const e = r.email?.trim();
    const isRelay = !!e && e.toLowerCase().endsWith("@privaterelay.appleid.com");
    if (e && !isRelay) return e;
    const isApple = r.meta?.provider === "apple" || isRelay;
    if (isApple) {
      if (e) return e; // show the relay alias — it's Apple's forwarding address
      const short = r.user_id ? r.user_id.slice(0, 8) : "unknown";
      return `Apple ID · ${short}`;
    }
    return "—";
  }

  const visible = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open" || filter === "resolved") return r.status === filter;
    return r.type === filter;
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("activity_log").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    if (selected?.id === id) setSelected({ ...selected, status });
    toast.success(status === "resolved" ? "Marked resolved" : "Reopened");
  }

  async function remove(id: string) {
    if (!confirm("Delete this ticket?")) return;
    const { error } = await supabase.from("activity_log").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted");
  }

  const counts = {
    open: rows.filter((r) => r.status === "open").length,
    bugs: rows.filter((r) => r.type === "bug_report").length,
    support: rows.filter((r) => r.type === "support_request").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat k="Total tickets" v={rows.length} />
        <Stat k="Open" v={counts.open} />
        <Stat k="Bug reports" v={counts.bugs} />
        <Stat k="Support requests" v={counts.support} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "open", "resolved", "bug_report", "support_request"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[12.5px] border transition-colors",
              filter === f
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "bug_report" ? "Bugs" : f === "support_request" ? "Support" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-4 py-2.5 font-normal">Time</th>
              <th className="px-4 py-2.5 font-normal">Type</th>
              <th className="px-4 py-2.5 font-normal">Subject</th>
              <th className="px-4 py-2.5 font-normal">User</th>
              <th className="px-4 py-2.5 font-normal">Status</th>
              <th className="px-4 py-2.5 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border last:border-0 hover:bg-surface-elevated cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[11.5px]",
                    r.type === "bug_report" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400",
                  )}>
                    {r.type === "bug_report" ? "Bug" : "Support"}
                  </span>
                </td>
                <td className="px-4 py-2.5 truncate max-w-[280px]">{r.message ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{displayEmail(r)}</td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[11.5px]",
                    r.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400",
                  )}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(r.id, r.status === "resolved" ? "open" : "resolved")}
                    >
                      {r.status === "resolved" ? "Reopen" : "Resolve"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No tickets.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-2xl bg-surface border border-border rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">
                  {selected.type === "bug_report" ? "Bug report" : "Support request"}
                </div>
                <div className="text-[15px] font-medium mt-0.5">{selected.message ?? "—"}</div>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded text-[11.5px]",
                selected.status === "resolved" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400",
              )}>
                {selected.status}
              </span>
            </div>
            <div className="p-5 space-y-4 text-[13px] max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">User email</div>
                  <div className="mt-1">{displayEmail(selected)}</div>
                </div>
                <div>
                  <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">User ID</div>
                  <div className="mt-1 font-mono text-[12px] break-all">{selected.user_id ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Submitted</div>
                  <div className="mt-1">{new Date(selected.created_at).toLocaleString()}</div>
                </div>
                {selected.meta?.url && (
                  <div>
                    <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Page URL</div>
                    <div className="mt-1 text-[12px] break-all">{selected.meta.url}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">Message</div>
                <div className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-background p-3">
                  {selected.meta?.body ?? "—"}
                </div>
              </div>
              {selected.meta?.ua && (
                <div>
                  <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">User agent</div>
                  <div className="mt-1 font-mono text-[11.5px] text-muted-foreground break-all">{selected.meta.ua}</div>
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              <Button
                onClick={() => setStatus(selected.id, selected.status === "resolved" ? "open" : "resolved")}
              >
                {selected.status === "resolved" ? "Reopen" : "Mark resolved"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- AGENTS ---------------- */

type AgentCfg = {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  maintenance: boolean;
  system_prompt: string;
  backend_model: string;
  allowed_plans: string[];
};

function Agents() {
  const [rows, setRows] = useState<AgentCfg[]>([]);
  const [editing, setEditing] = useState<AgentCfg | null>(null);

  async function load() {
    const { data } = await supabase.from("agents_config").select("*").order("name");
    setRows((data as AgentCfg[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(a: AgentCfg) {
    const { error } = await supabase
      .from("agents_config")
      .update({
        name: a.name,
        description: a.description,
        version: a.version,
        enabled: a.enabled,
        maintenance: a.maintenance,
        system_prompt: a.system_prompt,
        backend_model: a.backend_model,
        allowed_plans: a.allowed_plans,
      })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Agent updated");
    setEditing(null);
    load();
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4 max-w-2xl">
        <h3 className="text-[15px] font-semibold">Edit {editing.name}</h3>
        <div>
          <Label className="text-[12px]">Name</Label>
          <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-[12px]">Description</Label>
          <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[12px]">Version</Label>
            <Input value={editing.version} onChange={(e) => setEditing({ ...editing, version: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label className="text-[12px]">Backend model</Label>
            <Input value={editing.backend_model} onChange={(e) => setEditing({ ...editing, backend_model: e.target.value })} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-[12px]">System prompt</Label>
          <Textarea value={editing.system_prompt} onChange={(e) => setEditing({ ...editing, system_prompt: e.target.value })} rows={6} className="mt-1" />
        </div>
        <div>
          <Label className="text-[12px]">Allowed plans (comma-separated)</Label>
          <Input
            value={editing.allowed_plans.join(",")}
            onChange={(e) => setEditing({ ...editing, allowed_plans: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="mt-1"
          />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} /> Enabled
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <Switch checked={editing.maintenance} onCheckedChange={(v) => setEditing({ ...editing, maintenance: v })} /> Maintenance mode
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={() => save(editing)}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
          <div>
            <div className="text-[14px] font-medium">{a.name}</div>
            <div className="text-[12px] text-muted-foreground">v{a.version} · {a.backend_model} · {a.description}</div>
            <div className="text-[11.5px] text-muted-foreground mt-1">
              Plans: {a.allowed_plans.join(", ")}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-[11.5px] px-2 py-0.5 rounded-full",
              a.maintenance ? "bg-amber-500/10 text-amber-400" :
              a.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400",
            )}>
              {a.maintenance ? "Maintenance" : a.enabled ? "Live" : "Disabled"}
            </span>
            <Button size="sm" variant="outline" onClick={() => setEditing(a)}>Edit</Button>
          </div>
        </div>
      ))}
      {rows.length === 0 && <div className="text-muted-foreground text-sm">No agents configured.</div>}
    </div>
  );
}

/* ---------------- BROADCASTS ---------------- */

function Broadcasts() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("info");
  const [rows, setRows] = useState<{ id: string; title: string; body: string; kind: string; created_at: string }[]>([]);

  async function load() {
    const { data } = await supabase.from("broadcasts").select("*").order("created_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    const { error } = await supabase.from("broadcasts").insert({
      title: title.trim(),
      body: body.trim(),
      kind,
      sent_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setBody("");
    toast.success("Broadcast sent");
    load();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">New broadcast</h3>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Message body…" value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="alert">Alert</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={send}>Send broadcast</Button>
      </div>
      <div>
        <h3 className="text-[13px] uppercase tracking-wider text-muted-foreground mb-2">Recent</h3>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="text-[13.5px] font-medium">{r.title}</div>
              <div className="text-[12px] text-muted-foreground">{r.kind} · {new Date(r.created_at).toLocaleString()}</div>
              <div className="text-[13px] mt-1">{r.body}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="text-muted-foreground text-sm">No broadcasts yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SECURITY ---------------- */

function Security() {
  const { user } = useAuth();
  const [ips, setIps] = useState<{ id: string; ip: string; reason: string | null; created_at: string }[]>([]);
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [logins, setLogins] = useState<{ id: string; event: string; email: string | null; ip: string | null; created_at: string }[]>([]);
  const [threats, setThreats] = useState({ day: 0, week: 0, open: 0, byCat: {} as Record<string, number> });
  const [honeytokens, setHoneytokens] = useState<{ id: string; label: string; token: string; active: boolean; hits: number; last_hit_at: string | null }[]>([]);
  const [allowlist, setAllowlist] = useState(0);
  const [htLabel, setHtLabel] = useState("");

  async function load() {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [b, l, tDay, tWeek, tOpen, tCat, ht, al] = await Promise.all([
      supabase.from("blocked_ips").select("*").order("created_at", { ascending: false }),
      supabase.from("login_history").select("id,event,email,ip,created_at").order("created_at", { ascending: false }).limit(50),
      supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").gte("created_at", dayAgo),
      supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").gte("created_at", weekAgo),
      supabase.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").eq("status", "open"),
      supabase.from("activity_log").select("type").eq("category", "security").gte("created_at", weekAgo).limit(500),
      supabase.from("honeytokens").select("*").order("created_at", { ascending: false }),
      supabase.from("ip_allowlist").select("id", { count: "exact", head: true }),
    ]);
    setIps(b.data ?? []);
    setLogins(l.data ?? []);
    const byCat: Record<string, number> = {};
    (tCat.data ?? []).forEach((r: { type: string }) => { byCat[r.type] = (byCat[r.type] ?? 0) + 1; });
    setThreats({ day: tDay.count ?? 0, week: tWeek.count ?? 0, open: tOpen.count ?? 0, byCat });
    setHoneytokens(ht.data ?? []);
    setAllowlist(al.count ?? 0);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-security")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "honeytokens" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function block() {
    if (!ip.trim()) return;
    const { error } = await supabase.from("blocked_ips").insert({ ip: ip.trim(), reason: reason.trim() || null, blocked_by: user?.id ?? null });
    if (error) return toast.error(error.message);
    setIp(""); setReason("");
    toast.success("IP blocked");
    load();
  }
  async function unblock(id: string) {
    await supabase.from("blocked_ips").delete().eq("id", id);
    load();
  }
  async function addHoneytoken() {
    if (!htLabel.trim()) return;
    const token = `ht_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const { error } = await supabase.from("honeytokens").insert({ label: htLabel.trim(), token });
    if (error) return toast.error(error.message);
    setHtLabel("");
    toast.success("Honeytoken seeded");
    load();
  }
  async function toggleHt(id: string, active: boolean) {
    await supabase.from("honeytokens").update({ active }).eq("id", id);
    load();
  }
  async function delHt(id: string) {
    await supabase.from("honeytokens").delete().eq("id", id);
    load();
  }

  const totalHits = honeytokens.reduce((a, b) => a + (b.hits ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat k="Threats 24h" v={threats.day.toLocaleString()} />
        <Stat k="Threats 7d" v={threats.week.toLocaleString()} />
        <Stat k="Open incidents" v={threats.open.toLocaleString()} />
        <Stat k="Blocked IPs" v={ips.length.toLocaleString()} />
        <Stat k="Honeytoken hits" v={totalHits.toLocaleString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-[15px] font-semibold mb-3">Threat breakdown (7d)</h3>
          <div className="space-y-2">
            {Object.entries(threats.byCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-[12.5px]">
                <span className="font-mono">{k}</span>
                <span className="text-muted-foreground">{v}</span>
              </div>
            ))}
            {Object.keys(threats.byCat).length === 0 && (
              <div className="text-[12.5px] text-muted-foreground">No security events in the last 7 days.</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-[15px] font-semibold mb-3">Defense layers</h3>
          <ul className="space-y-1.5 text-[12.5px]">
            <li className="flex justify-between"><span>Client E2E encryption</span><span className="text-emerald-500">Active</span></li>
            <li className="flex justify-between"><span>Rate limiting + tarpit</span><span className="text-emerald-500">Active</span></li>
            <li className="flex justify-between"><span>Behavioral biometrics</span><span className="text-emerald-500">Active</span></li>
            <li className="flex justify-between"><span>App integrity checks</span><span className="text-emerald-500">Active</span></li>
            <li className="flex justify-between"><span>Cloudflare WAF</span><span className="text-emerald-500">Active</span></li>
            <li className="flex justify-between"><span>7-day chat purge</span><span className="text-emerald-500">Active</span></li>
            <li className="flex justify-between"><span>Pro+ IP allowlists</span><span className="text-muted-foreground">{allowlist} rule{allowlist === 1 ? "" : "s"}</span></li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-[15px] font-semibold mb-3">Blocked IPs</h3>
          <div className="flex gap-2 mb-2">
            <Input placeholder="192.0.2.10" value={ip} onChange={(e) => setIp(e.target.value)} className="h-9" />
            <Button size="sm" onClick={block}>Block</Button>
          </div>
          <Input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} className="h-9 mb-2" />
          <div className="divide-y divide-border max-h-56 overflow-auto">
            {ips.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <div>
                  <div className="text-[12.5px] font-mono">{r.ip}</div>
                  <div className="text-[11px] text-muted-foreground">{r.reason ?? "—"}</div>
                </div>
                <button onClick={() => unblock(r.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {ips.length === 0 && <div className="text-[12px] text-muted-foreground py-2">None.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold">Honeytokens</h3>
          <div className="flex gap-2">
            <Input placeholder="Label (e.g. fake-admin-key)" value={htLabel} onChange={(e) => setHtLabel(e.target.value)} className="h-9 w-64" />
            <Button size="sm" onClick={addHoneytoken}>Seed</Button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {honeytokens.map((h) => (
            <div key={h.id} className="py-2 flex items-center justify-between text-[12.5px]">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{h.label}</div>
                <div className="text-[11px] font-mono text-muted-foreground truncate">{h.token}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn("text-[11.5px]", h.hits > 0 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                  {h.hits} hit{h.hits === 1 ? "" : "s"}
                </span>
                <span className="text-[11px] text-muted-foreground w-32 text-right">
                  {h.last_hit_at ? new Date(h.last_hit_at).toLocaleString() : "Never triggered"}
                </span>
                <Switch checked={h.active} onCheckedChange={(v) => toggleHt(h.id, v)} />
                <button onClick={() => delHt(h.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          {honeytokens.length === 0 && <div className="text-[12px] text-muted-foreground py-2">No honeytokens seeded. Add decoys to trip attackers.</div>}
        </div>
      </div>

      <SecurityScanPanel />


      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-[15px] font-semibold mb-3">Recent sign-in events</h3>
        <div className="divide-y divide-border max-h-72 overflow-auto">
          {logins.map((r) => (
            <div key={r.id} className="py-2 flex justify-between text-[12.5px]">
              <span>{r.event} · <span className="text-muted-foreground">{r.email ?? "—"}</span></span>
              <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
          ))}
          {logins.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No events yet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- SECURITY SCAN ---------------- */

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Finding = { id: string; severity: Severity; title: string; detail: string; count?: number; source?: string; vulnClass?: string; vulnLabel?: string };

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const SEV_STYLE: Record<Severity, { badge: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  critical: { badge: "bg-destructive/15 text-destructive border-destructive/30", icon: ShieldX, label: "Critical" },
  high:     { badge: "bg-orange-500/15 text-orange-500 border-orange-500/30", icon: ShieldAlert, label: "High" },
  medium:   { badge: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: ShieldAlert, label: "Medium" },
  low:      { badge: "bg-sky-500/15 text-sky-500 border-sky-500/30", icon: ShieldCheck, label: "Low" },
  info:     { badge: "bg-muted text-muted-foreground border-border", icon: ShieldCheck, label: "Info" },
};

const NON_FIXABLE = new Set([
  "pg-rls-disabled",
  "pg-no-policies",
  "pg-definer-exposure",
  "many-admins",
  "no-allowlist",
  "admin-inventory",
  "all-clear",
]);

type StepTrace = { kind: "scan" | "exec" | "verify"; op: string; target: string; sql: string; affected?: number; durationMs: number; ok: boolean; message?: string; status: "pending" | "running" | "ok" | "fail"; startedAt?: number };
type FixStep = { id: string; title: string; status: "pending" | "running" | "ok" | "fail"; message?: string; affected?: number; steps: StepTrace[] };
type ResolvedEntry = { id: string; title: string; severity: Severity; resolvedAt: string; affected: number; detail?: string; steps: StepTrace[] };

const RESOLVED_KEY = "arch:security-resolved";
const AUTOFIX_KEY = "arch:security-autofix";

// Per-issue remediation guidance used to build detailed professional reports.
const REMEDIATION_GUIDE: Record<string, { summary: string; impact: string; howFixed: string; recommendations: string[]; references?: string[] }> = {
  "expired-chats": {
    summary: "Chats past their 7-day retention window were still present in the database.",
    impact: "Excess data retention increases the blast radius of any credential compromise and violates the platform's 7-day auto-purge policy.",
    howFixed: "Invoked `purge_expired_chats()` (SECURITY DEFINER) which deletes rows from `public.chats` where `pinned = false AND expires_at < now()`.",
    recommendations: ["Ensure the scheduled purge cron runs at least daily.", "Monitor `chats` row counts for anomalies week-over-week."],
  },
  "old-activity": {
    summary: "Activity log rows older than the redaction window still contained IP addresses and user agents.",
    impact: "Retaining PII beyond the declared window breaks minimization commitments and grows the exposure window if the log is exfiltrated.",
    howFixed: "Called `redact_old_activity_log()` which nulls `ip_address` and `user_agent` for rows older than 30 days and deletes rows older than 180 days.",
    recommendations: ["Add a nightly cron for `redact_old_activity_log()`.", "Alert if the redaction backlog exceeds 10k rows."],
  },
  "stale-sessions": {
    summary: "Inactive user sessions were still marked active in `user_sessions`.",
    impact: "Stale sessions extend the window an attacker can hijack a forgotten device or leaked refresh token.",
    howFixed: "Marked all `user_sessions` rows inactive whose `last_active_at` is older than 30 days, forcing re-authentication.",
    recommendations: ["Enforce absolute session lifetime at the gateway.", "Show users a live device list in Settings → Sessions."],
  },
  "failed-login-burst": {
    summary: "One or more source IPs produced a burst of failed logins in the last 24 hours.",
    impact: "Credential stuffing and brute-force attempts against real accounts.",
    howFixed: "Inserted the offending IP(s) into `public.blocked_ips` with reason `auto_block_failed_login_burst`, which the auth gateway consults on every request.",
    recommendations: ["Consider CAPTCHA on the third failed attempt.", "Notify affected users of anomalous login activity."],
  },
  "honeytokens-tripped": {
    summary: "One or more honeytokens were accessed, indicating reconnaissance or credential probing.",
    impact: "A tripped honeytoken is a high-confidence signal that an attacker is inside the perimeter or scanning it.",
    howFixed: "Rotated all tripped honeytokens by regenerating their token values and resetting `tripped_at`; the previous values are now invalid.",
    recommendations: ["Review `activity_log` around the trip timestamp.", "Consider blocking the offending IPs and rotating any secrets they may have touched."],
  },
  "unblocked-abusers": {
    summary: "IPs with repeated security events were not present in the block list.",
    impact: "Known bad actors were free to continue probing the surface.",
    howFixed: "Upserted the offending IPs into `public.blocked_ips` with reason `auto_block_repeat_offender`.",
    recommendations: ["Review the block list weekly and expire stale entries.", "Feed the IPs into your upstream WAF/CDN if available."],
  },
  "pg-rls-disabled": {
    summary: "One or more `public` tables have Row-Level Security disabled.",
    impact: "Any authenticated user (and, if the anon role has SELECT, any visitor) can read or modify every row.",
    howFixed: "Not automated. Add a migration: `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` followed by scoped policies.",
    recommendations: ["Never ship a `public` table without RLS.", "Add a linter to CI that flags migrations creating tables without a matching ENABLE RLS statement."],
  },
  "pg-no-policies": {
    summary: "RLS is enabled but no policies exist, which locks every role out.",
    impact: "The table is effectively unusable to the application and may silently drop traffic.",
    howFixed: "Not automated. Add explicit `CREATE POLICY` statements matching the access model.",
    recommendations: ["At minimum add an `auth.uid() = user_id` policy for owner-scoped data."],
  },
  "pg-definer-exposure": {
    summary: "Unexpected SECURITY DEFINER functions are EXECUTE-able by `authenticated`.",
    impact: "Definer functions bypass RLS; broad EXECUTE grants can be pivoted into privilege escalation.",
    howFixed: "Not automated. `REVOKE EXECUTE ON FUNCTION public.<fn> FROM PUBLIC, authenticated;` and re-grant only where required.",
    recommendations: ["Audit definer functions quarterly.", "Prefer INVOKER wherever possible."],
  },
};

function buildFindingReport(entry: ResolvedEntry | { id: string; title: string; severity: Severity; detail?: string }, opts: { resolved?: ResolvedEntry } = {}): string {
  const guide = REMEDIATION_GUIDE[entry.id] ?? {
    summary: entry.title,
    impact: "See finding detail for context.",
    howFixed: "No automated remediation is available for this finding — manual review required.",
    recommendations: ["Assign an owner and track to closure in your incident tracker."],
  };
  const now = new Date();
  const reportId = `Metrixcom-SEC-${entry.id}-${now.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const resolved = opts.resolved ?? (("steps" in entry ? entry : undefined) as ResolvedEntry | undefined);
  const lines: string[] = [];
  lines.push(`# Security Finding Report`);
  lines.push(``);
  lines.push(`**Report ID:** ${reportId}`);
  lines.push(`**Generated:** ${now.toISOString()}`);
  lines.push(`**Finding ID:** \`${entry.id}\``);
  lines.push(`**Title:** ${entry.title}`);
  lines.push(`**Severity:** ${entry.severity.toUpperCase()}`);
  if (resolved) {
    lines.push(`**Status:** RESOLVED`);
    lines.push(`**Resolved at:** ${new Date(resolved.resolvedAt).toISOString()}`);
    lines.push(`**Rows affected:** ${resolved.affected}`);
  } else {
    lines.push(`**Status:** OPEN`);
  }
  lines.push(``);
  lines.push(`## 1. Summary`);
  lines.push(guide.summary);
  if (entry.detail) { lines.push(``); lines.push(`> ${entry.detail}`); }
  lines.push(``);
  lines.push(`## 2. Impact`);
  lines.push(guide.impact);
  lines.push(``);
  lines.push(`## 3. How it was fixed`);
  lines.push(guide.howFixed);
  if (resolved && resolved.steps.length > 0) {
    lines.push(``);
    lines.push(`### 3.1 Executed remediation plan`);
    lines.push(``);
    lines.push(`| # | Phase | Operation | Target | Duration | Rows | Result |`);
    lines.push(`|---|-------|-----------|--------|---------:|-----:|--------|`);
    resolved.steps.forEach((s, i) => {
      lines.push(`| ${i + 1} | ${s.kind} | ${s.op} | \`${s.target}\` | ${s.durationMs}ms | ${s.affected ?? "-"} | ${s.status.toUpperCase()} |`);
    });
    lines.push(``);
    lines.push(`### 3.2 SQL executed`);
    resolved.steps.forEach((s, i) => {
      lines.push(``);
      lines.push(`**Step ${i + 1} — ${s.kind.toUpperCase()} · ${s.op}**`);
      lines.push("```sql");
      lines.push(s.sql);
      lines.push("```");
      if (s.message) lines.push(`↳ ${s.message}`);
    });
  }
  lines.push(``);
  lines.push(`## 4. Recommendations`);
  guide.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  if (guide.references && guide.references.length) {
    lines.push(``);
    lines.push(`## 5. References`);
    guide.references.forEach((r) => lines.push(`- ${r}`));
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(`_Generated by Metrixcom Security Center._`);
  return lines.join("\n");
}

function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}


function SecurityScanPanel() {
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [phases, setPhases] = useState<ScanPhase[]>([]);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [autoRescan, setAutoRescan] = useState(true);
  const [fixLog, setFixLog] = useState<FixStep[] | null>(null);
  const [reporting, setReporting] = useState(false);
  const [tick, setTick] = useState(0); // drives live elapsed-time repaint
  const [resolved, setResolved] = useState<ResolvedEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RESOLVED_KEY) ?? "[]") as ResolvedEntry[]; } catch { return []; }
  });
  const [showResolved, setShowResolved] = useState(false);
  const [autoFix, setAutoFix] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTOFIX_KEY) === "1";
  });
  const runScanFn = useServerFn(runSecurityScan);
  const fixFn = useServerFn(fixSecurityFindings);
  const reportFn = useServerFn(generatePentestReport);
  const stepFn = useServerFn(runFixSubStep);
  const dryRunFn = useServerFn(dryRunFixFinding);

  const [dryRun, setDryRun] = useState<{ running: boolean; results: DryRunFinding[]; ids: string[]; progress: number } | null>(null);

  type ApprovalSource = "auto" | "manual" | "single";
  type Decision = "pending" | "approved" | "skipped";
  const [approval, setApproval] = useState<{
    source: ApprovalSource;
    ids: string[];
    results: DryRunFinding[];
    decisions: Record<string, Decision>;
    running: boolean;
    progress: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(AUTOFIX_KEY, autoFix ? "1" : "0");
  }, [autoFix]);

  function persistResolved(next: ResolvedEntry[]) {
    setResolved(next);
    if (typeof window !== "undefined") localStorage.setItem(RESOLVED_KEY, JSON.stringify(next.slice(0, 200)));
  }

  // Live tick while a step is running so ms counters advance in real time.
  useEffect(() => {
    if (!fixing) return;
    const t = setInterval(() => setTick((n) => n + 1), 50);
    return () => clearInterval(t);
  }, [fixing]);
  void tick;

  const [scanMode, setScanMode] = useState<"basic" | "deep">(() => {
    if (typeof window === "undefined") return "basic";
    return (localStorage.getItem("arch.security.scanMode") as "basic" | "deep") || "basic";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("arch.security.scanMode", scanMode);
  }, [scanMode]);

  // Live scan progress state — seeded from the static phase plan as soon as
  // the scan starts, then advanced by a wall-clock ticker while the server
  // executes phases sequentially. When the RPC resolves, authoritative
  // per-phase timings from the server overwrite the estimates.
  const [scanStartedAt, setScanStartedAt] = useState<number | null>(null);
  const [activePhaseKey, setActivePhaseKey] = useState<string | null>(null);

  const runScan = useCallback(async (silent = false, modeOverride?: "basic" | "deep") => {
    const mode = modeOverride ?? scanMode;
    setScanning(true);

    // Seed the UI with the full plan up front so every step across the
    // entire website surface is visible immediately, not after the scan
    // finishes. Each phase renders as pending until the server confirms.
    const plan = SCAN_PHASE_PLAN.filter((p) => p.mode === "basic" || mode === "deep");
    const seeded: ScanPhase[] = plan.map((p) => ({
      key: p.key, name: p.name, description: p.description,
      durationMs: 0, findingsAdded: 0, ok: true, pending: true, active: false,
    }));
    setPhases(seeded);
    setTotalMs(null);
    const startedAt = Date.now();
    setScanStartedAt(startedAt);
    setActivePhaseKey(plan[0]?.key ?? null);

    // Client-side ticker: advance the "current step" pointer using the
    // per-phase estMs weights so the user sees continuous motion. This is
    // an ETA cursor, not a lie — final timings snap to real values below.
    const cumulative: number[] = [];
    plan.reduce((acc, p, i) => (cumulative[i] = acc + p.estMs), 0);
    const totalEst = cumulative[cumulative.length - 1] ?? 1;
    const tickerHandle = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const capped = Math.min(elapsed, totalEst * 0.95);
      let idx = cumulative.findIndex((c) => c >= capped);
      if (idx < 0) idx = plan.length - 1;
      const currentKey = plan[idx]?.key ?? null;
      setActivePhaseKey(currentKey);
      setPhases((prev) => prev.map((ph, i) => ({
        ...ph,
        active: i === idx && ph.pending,
        durationMs: ph.pending
          ? (i < idx ? plan[i].estMs : i === idx ? Math.max(0, elapsed - (cumulative[i - 1] ?? 0)) : 0)
          : ph.durationMs,
      })));
    }, 120);

    try {
      const result = await runScanFn({ data: { mode } });
      const out = (result.findings ?? []) as Finding[];
      if (out.every((f) => f.severity === "info")) {
        out.unshift({
          id: "all-clear",
          severity: "info",
          title: "All defense layers healthy",
          detail: `No critical, high, or medium findings detected in the current ${mode} scan window.`,
        });
      }
      out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
      setFindings(out);
      setSelected((prev) => {
        const next = new Set<string>();
        const ids = new Set(out.map((f) => f.id));
        prev.forEach((id) => { if (ids.has(id)) next.add(id); });
        return next;
      });
      setLastRun(new Date(result.ranAt));
      // Merge server-authoritative phase results into the plan so any
      // phase the server didn't record (edge case) still renders.
      const byKey = new Map((result.phases ?? []).map((p) => [p.key, p]));
      setPhases(seeded.map((ph) => {
        const real = byKey.get(ph.key);
        return real
          ? { ...real, pending: false, active: false }
          : { ...ph, pending: false, active: false, durationMs: 0 };
      }));
      setTotalMs(typeof result.totalMs === "number" ? result.totalMs : null);
      setActivePhaseKey(null);
      if (!silent) toast.success(`${mode === "deep" ? "Deep" : "Basic"} scan complete in ${(((typeof result.totalMs === "number" ? result.totalMs : 0)) / 1000).toFixed(1)}s`);
    } catch (e) {
      setPhases((prev) => prev.map((ph) => ph.pending ? { ...ph, pending: false, active: false, ok: false, error: e instanceof Error ? e.message : "scan failed" } : ph));
      setActivePhaseKey(null);
      if (!silent) toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      window.clearInterval(tickerHandle);
      setScanStartedAt(null);
      setScanning(false);
    }
  }, [runScanFn, scanMode]);

  useEffect(() => { runScan(true); }, [runScan]);


  useEffect(() => {
    if (!autoRescan) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => { if (t) clearTimeout(t); t = setTimeout(() => runScan(true), 1500); };
    const ch = supabase
      .channel("admin-security-scan")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "honeytokens" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "login_history" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_ips" }, schedule)
      .subscribe();
    return () => { if (t) clearTimeout(t); supabase.removeChannel(ch); };
  }, [autoRescan, runScan]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach((f) => { c[f.severity]++; });
    return c;
  }, [findings]);

  const fixableFindings = useMemo(() => findings.filter((f) => !NON_FIXABLE.has(f.id)), [findings]);
  const allFixableSelected = fixableFindings.length > 0 && fixableFindings.every((f) => selected.has(f.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (allFixableSelected) setSelected(new Set());
    else setSelected(new Set(fixableFindings.map((f) => f.id)));
  }

  async function fixSelected(overrideIds?: string[]) {
    const source = overrideIds ?? [...selected];
    const ids = source.filter((id) => !NON_FIXABLE.has(id));
    if (ids.length === 0) { toast.error("Nothing selected to fix"); return; }
    setFixing(true);
    const idToTitle = new Map(findings.map((f) => [f.id, f.title]));
    // Build the plan up-front so all pending steps render immediately.
    const initial: FixStep[] = ids.map((id) => {
      const plan = getFixPlan(id);
      return {
        id, title: idToTitle.get(id) ?? id, status: "pending",
        steps: plan.length ? plan.map((p) => ({
          kind: p.phase, op: p.op, target: p.target, sql: p.sql,
          durationMs: 0, ok: false, status: "pending",
        })) : [{
          kind: "exec", op: "Manual review required", target: "-", sql: "-- no automated remediation",
          durationMs: 0, ok: false, status: "fail", message: "Requires manual review or migration",
        }],
      };
    });
    setFixLog(initial);
    let okCount = 0; let badCount = 0; let totalAffected = 0;
    const verifiedResolvedIds: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const plan = getFixPlan(id);
      if (!plan.length) {
        setFixLog((prev) => prev ? prev.map((s, idx) => idx === i ? { ...s, status: "fail", message: "No automated remediation" } : s) : prev);
        badCount++; continue;
      }
      setFixLog((prev) => prev ? prev.map((s, idx) => idx === i ? { ...s, status: "running" } : s) : prev);
      let findingOk = true; let affectedSum = 0; let lastMsg = "";
      let hasVerify = false; let verifyOk = false;
      for (let j = 0; j < plan.length; j++) {
        const startedAt = Date.now();
        setFixLog((prev) => prev ? prev.map((s, idx) => idx === i
          ? { ...s, steps: s.steps.map((st, k) => k === j ? { ...st, status: "running", startedAt } : st) }
          : s) : prev);
        try {
          const trace = await stepFn({ data: { id, phase: plan[j].phase as FixPhase } });
          affectedSum += trace.affected ?? 0;
          lastMsg = trace.message ?? lastMsg;
          if (!trace.ok) findingOk = false;
          if (plan[j].phase === "verify") { hasVerify = true; verifyOk = trace.ok; }
          setFixLog((prev) => prev ? prev.map((s, idx) => idx === i
            ? { ...s, steps: s.steps.map((st, k) => k === j ? { ...st, ...trace, status: trace.ok ? "ok" : "fail" } : st) }
            : s) : prev);
        } catch (e) {
          findingOk = false;
          const msg = e instanceof Error ? e.message : "step failed";
          setFixLog((prev) => prev ? prev.map((s, idx) => idx === i
            ? { ...s, steps: s.steps.map((st, k) => k === j ? { ...st, status: "fail", ok: false, message: msg, durationMs: Date.now() - startedAt } : st) }
            : s) : prev);
        }
      }
      totalAffected += affectedSum;
      // A fix only counts as resolved when the verify probe confirms zero
      // remaining. If a finding has no verify phase (edge case), fall back to
      // step success.
      const truly = hasVerify ? (findingOk && verifyOk) : findingOk;
      if (truly) { okCount++; verifiedResolvedIds.push(id); } else { badCount++; }
      setFixLog((prev) => prev ? prev.map((s, idx) => idx === i
        ? { ...s, status: truly ? "ok" : "fail", affected: affectedSum, message: lastMsg }
        : s) : prev);
    }

    void fixFn;

    // Persist resolved entries to history for later reporting AND immediately
    // remove them from the active findings list — scan will re-add them only
    // if the underlying condition truly re-appears.
    const idToFinding = new Map(findings.map((f) => [f.id, f]));
    setFixLog((prev) => {
      if (prev) {
        const okEntries: ResolvedEntry[] = prev
          .filter((s) => s.status === "ok" && verifiedResolvedIds.includes(s.id))
          .map((s) => {
            const f = idToFinding.get(s.id);
            return {
              id: s.id,
              title: s.title,
              severity: f?.severity ?? "medium",
              detail: f?.detail,
              resolvedAt: new Date().toISOString(),
              affected: s.affected ?? 0,
              steps: s.steps,
            };
          });
        if (okEntries.length) persistResolved([...okEntries, ...resolved]);
      }
      return prev;
    });
    if (verifiedResolvedIds.length) {
      setFindings((prev) => prev.filter((f) => !verifiedResolvedIds.includes(f.id)));
    }

    if (badCount === 0) toast.success(`Resolved ${okCount} issue(s) · ${totalAffected} row(s) affected`);
    else toast.warning(`${okCount} resolved, ${badCount} still open`);
    setSelected(new Set());
    setFixing(false);
    await runScan(true);
  }

  // Live-ticking previously-approved fingerprints so we don't re-prompt for the same set repeatedly.
  const lastAutoRef = useRef<string>("");

  // Approval flow: probes each finding live and shows a per-finding diff preview
  // that admin must confirm before ANY write happens.
  async function requestApproval(ids: string[], source: ApprovalSource) {
    const clean = ids.filter((id) => !NON_FIXABLE.has(id));
    if (clean.length === 0) { toast.error("Nothing fixable to approve"); return; }
    const initialDecisions: Record<string, Decision> = {};
    clean.forEach((id) => { initialDecisions[id] = "pending"; });
    setApproval({ source, ids: clean, results: [], decisions: initialDecisions, running: true, progress: 0 });
    const results: DryRunFinding[] = [];
    for (let i = 0; i < clean.length; i++) {
      try {
        const r = await dryRunFn({ data: { id: clean[i] } });
        results.push(r);
      } catch (e) {
        results.push({
          id: clean[i], ok: false, totalExpectedAffected: 0, steps: [],
          summary: e instanceof Error ? e.message : "probe failed",
        });
      }
      setApproval((prev) => prev ? { ...prev, results: [...results], progress: i + 1 } : prev);
    }
    setApproval((prev) => prev ? { ...prev, running: false } : prev);
  }

  function setDecision(id: string, d: Decision) {
    setApproval((prev) => prev ? { ...prev, decisions: { ...prev.decisions, [id]: d } } : prev);
  }
  function approveAll() {
    setApproval((prev) => {
      if (!prev) return prev;
      const next: Record<string, Decision> = { ...prev.decisions };
      prev.ids.forEach((id) => { next[id] = "approved"; });
      return { ...prev, decisions: next };
    });
  }
  async function applyApproved() {
    if (!approval) return;
    const approvedIds = approval.ids.filter((id) => approval.decisions[id] === "approved");
    setApproval(null);
    if (approvedIds.length === 0) { toast.info("No findings approved — nothing applied"); return; }
    await fixSelected(approvedIds);
  }

  // Auto-fix: whenever a scan surfaces fixable findings and the toggle is on,
  // route through the admin approval modal (never write silently).
  useEffect(() => {
    if (!autoFix || fixing || scanning || approval) return;
    const ids = findings.filter((f) => !NON_FIXABLE.has(f.id)).map((f) => f.id);
    if (ids.length === 0) return;
    const key = ids.sort().join("|");
    if (key === lastAutoRef.current) return;
    lastAutoRef.current = key;
    const t = setTimeout(() => { requestApproval(ids, "auto"); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFix, findings, fixing, scanning]);

  async function downloadReport() {
    setReporting(true);
    try {
      const res = await reportFn();
      const blob = new Blob([res.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${res.reportId}.md`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Penetration test report generated · Risk ${res.rating} (${res.risk}/100)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report failed");
    } finally {
      setReporting(false);
    }
  }

  async function simulateSelected() {
    const ids = [...selected].filter((id) => !NON_FIXABLE.has(id));
    if (ids.length === 0) { toast.error("Nothing selected to simulate"); return; }
    setDryRun({ running: true, results: [], ids, progress: 0 });
    const results: DryRunFinding[] = [];
    for (let i = 0; i < ids.length; i++) {
      try {
        const r = await dryRunFn({ data: { id: ids[i] } });
        results.push(r);
      } catch (e) {
        results.push({
          id: ids[i], ok: false, totalExpectedAffected: 0, steps: [],
          summary: e instanceof Error ? e.message : "simulation failed",
        });
      }
      setDryRun((prev) => prev ? { ...prev, results: [...results], progress: i + 1 } : prev);
    }
    setDryRun((prev) => prev ? { ...prev, running: false } : prev);
    const totalRows = results.reduce((a, r) => a + r.totalExpectedAffected, 0);
    toast.success(`Simulation complete · ${totalRows} row(s) would be written`);
  }

  async function applyFromDryRun() {
    if (!dryRun) return;
    setDryRun(null);
    await fixSelected();
  }


  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-semibold">Security scan</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {lastRun ? `Last run ${lastRun.toLocaleTimeString()}` : "Not run yet"} · Mode <span className="text-foreground">{scanMode === "deep" ? "Deep" : "Basic"}</span> · Findings ranked by severity
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11.5px]">
            {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
              <span key={s} className={cn("px-2 py-0.5 rounded-md border", SEV_STYLE[s].badge)}>
                {counts[s]} {SEV_STYLE[s].label}
              </span>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAutoRescan((v) => !v)} className="h-8 text-[11.5px]">
            Auto {autoRescan ? "on" : "off"}
          </Button>
          <Button
            size="sm"
            variant={autoFix ? "default" : "ghost"}
            onClick={() => setAutoFix((v) => !v)}
            className="h-8 text-[11.5px]"
            title="Automatically fix new fixable findings as they appear"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Auto-fix {autoFix ? "on" : "off"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowResolved(true)} className="h-8 text-[11.5px]">
            <History className="h-3.5 w-3.5 mr-1.5" />
            Resolved ({resolved.length})
          </Button>
          <Button size="sm" variant="outline" onClick={downloadReport} disabled={reporting} className="h-8">
            {reporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
            Pentest report
          </Button>
          <Button size="sm" variant="outline" onClick={simulateSelected} disabled={fixing || selected.size === 0 || !!dryRun?.running} className="h-8" title="Simulate the fix — show SQL, expected rows, and predicted status changes without touching data">
            {dryRun?.running ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5 mr-1.5" />}
            Dry-run ({selected.size})
          </Button>
          <Button size="sm" variant="outline" onClick={() => fixSelected()} disabled={fixing || selected.size === 0} className="h-8">
            {fixing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
            Fix selected ({selected.size})
          </Button>

          <div className="inline-flex rounded-md border border-border overflow-hidden h-8" role="group" aria-label="Scan mode">
            <button
              type="button"
              onClick={() => setScanMode("basic")}
              className={cn("px-2.5 text-[11.5px] font-medium transition-colors", scanMode === "basic" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/40")}
              title="Fast catalog + core runtime signals"
            >
              Basic
            </button>
            <button
              type="button"
              onClick={() => setScanMode("deep")}
              className={cn("px-2.5 text-[11.5px] font-medium border-l border-border transition-colors", scanMode === "deep" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/40")}
              title="Full audit — 2FA, brute-force targeting, session hijack, stale keys, orphaned data, coverage"
            >
              Deep
            </button>
          </div>
          <Button size="sm" onClick={() => runScan(false)} disabled={scanning} className="h-8">
            {scanning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {scanning ? "Scanning" : scanMode === "deep" ? "Deep rescan" : "Basic rescan"}
          </Button>

        </div>
      </div>

      {phases.length > 0 && (
        <div className="mb-2 rounded-lg border border-border bg-background/40 p-2.5">
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-medium text-foreground flex items-center gap-2">
                Scan phases
                {scanning && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    live
                  </span>
                )}
              </div>
              {scanning && activePhaseKey && (
                <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                  Current step: <span className="text-foreground">{phases.find((p) => p.key === activePhaseKey)?.name}</span>
                  {" · "}
                  {phases.filter((p) => !p.pending).length + 1}/{phases.length}
                </div>
              )}
            </div>
            <div className="text-[10.5px] tabular-nums text-muted-foreground shrink-0">
              {scanning && scanStartedAt
                ? `${((Date.now() - scanStartedAt) / 1000).toFixed(1)}s elapsed`
                : `${phases.length} phase${phases.length === 1 ? "" : "s"} · total ${((totalMs ?? phases.reduce((a, p) => a + p.durationMs, 0)) / 1000).toFixed(2)}s`}
            </div>
          </div>
          {scanning && (
            <div className="mb-2 h-1 w-full rounded-full bg-background/60 overflow-hidden">
              <div
                className="h-full bg-primary/70 transition-[width] duration-150 ease-linear"
                style={{ width: `${Math.min(100, (phases.filter((p) => !p.pending).length / Math.max(1, phases.length)) * 100 + (activePhaseKey ? (100 / phases.length) * 0.5 : 0))}%` }}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {phases.map((p) => {
              const isActive = p.active === true;
              const isPending = p.pending === true && !isActive;
              return (
                <div
                  key={p.key}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded border px-2 py-1 transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                      : isPending
                      ? "border-border/40 bg-background/20 opacity-60"
                      : "border-border/60 bg-background/30",
                  )}
                  title={p.description}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[11.5px] truncate flex items-center gap-1.5">
                      {isActive ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-primary shrink-0" />
                      ) : isPending ? (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                      ) : (
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", p.ok ? (p.findingsAdded > 0 ? "bg-amber-400" : "bg-emerald-400") : "bg-rose-500")} />
                      )}
                      <span className={cn(isActive && "text-foreground font-medium")}>{p.name}</span>
                      {!p.ok && !isPending && !isActive && <span className="text-rose-400 text-[10px]">error</span>}
                    </div>
                  </div>
                  <div className="text-[10.5px] tabular-nums text-muted-foreground shrink-0">
                    {isPending ? "queued" : isActive ? `${p.durationMs}ms…` : `${p.durationMs}ms${p.findingsAdded > 0 ? ` · +${p.findingsAdded}` : ""}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fixableFindings.length > 0 && (
        <label className="flex items-center gap-2 pb-2 mb-1 border-b border-border text-[12px] text-muted-foreground cursor-pointer select-none">
          <input type="checkbox" checked={allFixableSelected} onChange={toggleAll} className="accent-primary h-3.5 w-3.5" />
          Select all fixable ({fixableFindings.length})
        </label>
      )}

      <div className="divide-y divide-border">
        {findings.map((f) => {
          const Icon = SEV_STYLE[f.severity].icon;
          const fixable = !NON_FIXABLE.has(f.id);
          const checked = selected.has(f.id);
          return (
            <div key={f.id} className="py-3 flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-2 accent-primary h-3.5 w-3.5 disabled:opacity-30"
                checked={checked}
                disabled={!fixable}
                onChange={() => fixable && toggle(f.id)}
                aria-label={`Select ${f.title}`}
              />
              <div className={cn("shrink-0 mt-0.5 h-7 w-7 rounded-md border flex items-center justify-center", SEV_STYLE[f.severity].badge)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium">{f.title}</span>
                  <span className={cn("text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border", SEV_STYLE[f.severity].badge)}>
                    {SEV_STYLE[f.severity].label}
                  </span>
                  {f.vulnLabel && (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded border border-border bg-background/40 text-muted-foreground" title="Vulnerability class">
                      {f.vulnLabel}
                    </span>
                  )}
                  {typeof f.count === "number" && (
                    <span className="text-[11px] text-muted-foreground">· {f.count.toLocaleString()}</span>
                  )}
                  {!fixable && (
                    <span className="text-[10.5px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-500 bg-amber-500/5 inline-flex items-center gap-1">
                      <Wrench className="h-3 w-3" /> Manual remediation
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">{f.detail}</p>
                {!fixable && (() => {
                  const guide = MANUAL_REMEDIATION[f.id];
                  if (!guide) {
                    return (
                      <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
                        <div className="text-[11.5px] text-amber-500 font-medium">Why it cannot auto-fix</div>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">
                          No safe automated remediation for this finding class. Review manually — apply an app/policy change, then rescan.
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-2">
                      <div>
                        <div className="text-[11.5px] text-amber-500 font-medium">Why it cannot auto-fix</div>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">{guide.reason}</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-[11.5px] font-medium text-foreground">Apply manually as a migration</div>
                        {guide.steps.map((s, i) => (
                          <div key={i} className="rounded-md border border-border bg-background/60 p-2">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="min-w-0">
                                <div className="text-[11.5px] font-medium truncate">{s.op}</div>
                                <div className="text-[10.5px] text-muted-foreground truncate">Target: <span className="font-mono">{s.target}</span></div>
                              </div>
                              <button
                                type="button"
                                onClick={() => { navigator.clipboard?.writeText(s.sql); toast.success("SQL copied"); }}
                                className="shrink-0 h-6 px-1.5 rounded border border-border text-[10.5px] text-muted-foreground hover:text-foreground hover:bg-background inline-flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </button>
                            </div>
                            <pre className="text-[11px] font-mono text-foreground/90 whitespace-pre-wrap break-all bg-background/80 border border-border rounded p-2">{s.sql}</pre>
                            {s.note && <div className="text-[10.5px] text-muted-foreground mt-1">{s.note}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {fixable && (
                <button
                  type="button"
                  onClick={() => requestApproval([f.id], "single")}
                  disabled={fixing || !!approval}
                  className="shrink-0 mt-1 h-7 px-2 rounded-md border border-primary/40 text-[11px] text-primary hover:bg-primary/10 inline-flex items-center gap-1 disabled:opacity-40"
                  title="Preview the exact SQL diff and approve this fix"
                >
                  <ShieldCheck className="h-3 w-3" /> Approve & fix
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const match = resolved.find((r) => r.id === f.id);
                  const md = buildFindingReport(f, match ? { resolved: match } : {});
                  downloadMarkdown(`Metrixcom-SEC-${f.id}-${new Date().toISOString().slice(0, 10)}.md`, md);
                }}
                className="shrink-0 mt-1 h-7 px-2 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/60 inline-flex items-center gap-1"
                title="Download detailed report for this issue"
              >
                <Download className="h-3 w-3" /> Report
              </button>
            </div>
          );
        })}
        {findings.length === 0 && !scanning && (
          <div className="py-6 text-[12.5px] text-muted-foreground text-center">Click Rescan to run checks.</div>
        )}
        {scanning && findings.length === 0 && (
          <div className="py-6 text-[12.5px] text-muted-foreground text-center flex items-center justify-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running checks…
          </div>
        )}
      </div>

      {dryRun && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => !dryRun.running && setDryRun(null)}>
          <div className="bg-surface border border-border rounded-2xl max-w-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[16px] font-semibold flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-amber-500" /> Dry-run simulation
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {dryRun.running
                    ? `Probing live database… ${dryRun.progress}/${dryRun.ids.length}`
                    : `Simulated ${dryRun.results.length} finding(s) · read-only · no writes performed`}
                </div>
              </div>
              <button onClick={() => !dryRun.running && setDryRun(null)} disabled={dryRun.running} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {dryRun.results.map((r) => {
                const finding = findings.find((f) => f.id === r.id);
                return (
                  <div key={r.id} className="py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium">{finding?.title ?? r.id}</span>
                      {finding && (
                        <span className={cn("text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border", SEV_STYLE[finding.severity].badge)}>
                          {SEV_STYLE[finding.severity].label}
                        </span>
                      )}
                      <span className={cn(
                        "text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border",
                        r.ok ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-destructive/30 text-destructive bg-destructive/5",
                      )}>
                        {r.ok ? `${r.totalExpectedAffected} row(s) predicted` : "probe error"}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">{r.summary}</div>
                    {r.steps.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {r.steps.map((st, i) => (
                          <div key={i} className={cn(
                            "rounded-md border p-2",
                            st.willMutate ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-background/50",
                          )}>
                            <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wide">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded border",
                                st.phase === "scan" && "border-blue-500/30 text-blue-500 bg-blue-500/5",
                                st.phase === "exec" && "border-amber-500/30 text-amber-500 bg-amber-500/5",
                                st.phase === "verify" && "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
                              )}>{st.phase}</span>
                              <span className="text-foreground/80 normal-case tracking-normal text-[11.5px] font-medium">{st.op}</span>
                              <span className="text-muted-foreground normal-case tracking-normal text-[11px]">→ {st.target}</span>
                              <span className="ml-auto text-muted-foreground normal-case tracking-normal text-[10.5px] tabular-nums">
                                {st.willMutate ? "would write" : "read-only"} · {st.durationMs}ms
                              </span>
                            </div>
                            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">SQL that would run</div>
                                <pre className="text-[11px] font-mono text-foreground/90 whitespace-pre-wrap break-all leading-relaxed bg-background/60 rounded p-1.5 border border-border">{st.sql}</pre>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Probe executed now</div>
                                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed bg-background/60 rounded p-1.5 border border-border">{st.probedSql}</pre>
                              </div>
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                              <span className="text-muted-foreground">Expected affected:</span>
                              <span className="tabular-nums font-medium text-foreground">{st.expectedAffected.toLocaleString()}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-foreground/80">{st.predictedChange}</span>
                            </div>
                            {st.note && <div className="mt-1 text-[11px] text-destructive">↳ {st.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {dryRun.results.length === 0 && (
                <div className="py-6 text-[12.5px] text-muted-foreground text-center flex items-center justify-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Probing…
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <div className="text-[11.5px] text-muted-foreground">
                Total predicted writes:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {dryRun.results.reduce((a, r) => a + r.totalExpectedAffected, 0).toLocaleString()} row(s)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => !dryRun.running && setDryRun(null)}
                  disabled={dryRun.running}
                  className="rounded-md border border-border bg-background/60 px-4 py-2 text-[13px] hover:bg-background disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={applyFromDryRun}
                  disabled={dryRun.running || dryRun.results.every((r) => !r.ok)}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <PlayCircle className="h-4 w-4" /> Apply for real
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {approval && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => !approval.running && setApproval(null)}>
          <div className="bg-surface border border-border rounded-2xl max-w-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[16px] font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Approval required
                  {approval.source === "auto" && (
                    <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-500 bg-amber-500/5">Auto-fix</span>
                  )}
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {approval.running
                    ? `Building diff preview… ${approval.progress}/${approval.ids.length}`
                    : `Review each finding — nothing is written until you approve and apply.`}
                </div>
              </div>
              <button onClick={() => !approval.running && setApproval(null)} disabled={approval.running} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {approval.ids.map((id) => {
                const finding = findings.find((f) => f.id === id);
                const r = approval.results.find((x) => x.id === id);
                const decision = approval.decisions[id] ?? "pending";
                const loaded = !!r;
                return (
                  <div key={id} className="py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium">{finding?.title ?? id}</span>
                      {finding && (
                        <span className={cn("text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border", SEV_STYLE[finding.severity].badge)}>
                          {SEV_STYLE[finding.severity].label}
                        </span>
                      )}
                      {loaded ? (
                        <span className={cn(
                          "text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border",
                          r!.ok ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" : "border-destructive/30 text-destructive bg-destructive/5",
                        )}>
                          {r!.ok ? `${r!.totalExpectedAffected} row(s) will change` : "probe error"}
                        </span>
                      ) : (
                        <span className="text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-border text-muted-foreground inline-flex items-center gap-1">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" /> probing
                        </span>
                      )}
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => setDecision(id, "approved")}
                          disabled={!loaded || !r!.ok}
                          className={cn(
                            "h-7 px-2 rounded-md border text-[11px] inline-flex items-center gap-1 disabled:opacity-30",
                            decision === "approved"
                              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-background/60",
                          )}
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => setDecision(id, "skipped")}
                          className={cn(
                            "h-7 px-2 rounded-md border text-[11px] inline-flex items-center gap-1",
                            decision === "skipped"
                              ? "border-destructive/50 bg-destructive/10 text-destructive"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-background/60",
                          )}
                        >
                          <X className="h-3 w-3" /> Skip
                        </button>
                      </div>
                    </div>
                    {loaded && (
                      <>
                        <div className="text-[11.5px] text-muted-foreground mt-0.5">{r!.summary}</div>
                        {r!.steps.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {r!.steps.map((st, i) => (
                              <div key={i} className={cn(
                                "rounded-md border p-2",
                                st.willMutate ? "border-amber-500/20 bg-amber-500/5" : "border-border bg-background/50",
                              )}>
                                <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wide">
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded border",
                                    st.phase === "scan" && "border-blue-500/30 text-blue-500 bg-blue-500/5",
                                    st.phase === "exec" && "border-amber-500/30 text-amber-500 bg-amber-500/5",
                                    st.phase === "verify" && "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
                                  )}>{st.phase}</span>
                                  <span className="text-foreground/80 normal-case tracking-normal text-[11.5px] font-medium">{st.op}</span>
                                  <span className="text-muted-foreground normal-case tracking-normal text-[11px]">→ {st.target}</span>
                                  <span className="ml-auto text-muted-foreground normal-case tracking-normal text-[10.5px] tabular-nums">
                                    {st.willMutate ? "will write" : "read-only"} · probed in {st.durationMs}ms
                                  </span>
                                </div>
                                <div className="mt-1.5">
                                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Diff — SQL that will run on approval</div>
                                  <pre className="text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed bg-background/60 rounded p-1.5 border border-border">
                                    <span className="text-emerald-500">+ </span><span className="text-foreground/90">{st.sql}</span>
                                  </pre>
                                </div>
                                <div className="mt-1.5 flex items-center gap-3 text-[11px] flex-wrap">
                                  <span className="text-muted-foreground">Expected affected:</span>
                                  <span className="tabular-nums font-medium text-foreground">{st.expectedAffected.toLocaleString()}</span>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-foreground/80">{st.predictedChange}</span>
                                </div>
                                {st.note && <div className="mt-1 text-[11px] text-destructive">↳ {st.note}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[11.5px] text-muted-foreground">
                {Object.values(approval.decisions).filter((d) => d === "approved").length} approved ·{" "}
                {Object.values(approval.decisions).filter((d) => d === "skipped").length} skipped ·{" "}
                {approval.ids.length - Object.values(approval.decisions).filter((d) => d !== "pending").length} pending
              </div>
              <div className="flex gap-2">
                <button
                  onClick={approveAll}
                  disabled={approval.running}
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-[13px] hover:bg-background disabled:opacity-40 inline-flex items-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Approve all
                </button>
                <button
                  onClick={() => !approval.running && setApproval(null)}
                  disabled={approval.running}
                  className="rounded-md border border-border bg-background/60 px-3 py-2 text-[13px] hover:bg-background disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={applyApproved}
                  disabled={approval.running || Object.values(approval.decisions).every((d) => d !== "approved")}
                  className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <PlayCircle className="h-4 w-4" /> Apply approved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {fixLog && (

        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => !fixing && setFixLog(null)}>
          <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[16px] font-semibold">Remediation in progress</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {fixing ? "Executing live fixes against the database…" : "All actions completed."}
                </div>
              </div>
              <button onClick={() => !fixing && setFixLog(null)} disabled={fixing} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {fixLog.map((s) => (
                <div key={s.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {s.status === "pending" && <div className="h-4 w-4 rounded-full border border-border" />}
                      {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {s.status === "ok" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {s.status === "fail" && <XCircle className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{s.title}</div>
                      <div className="text-[11.5px] text-muted-foreground mt-0.5">
                        {s.status === "pending" && "Queued…"}
                        {s.status === "running" && "Executing live queries…"}
                        {s.status !== "running" && s.status !== "pending" && (
                          <>{s.message ?? (s.status === "ok" ? "Done" : "Failed")}{typeof s.affected === "number" && s.status === "ok" && ` · ${s.affected} row(s) affected`}</>
                        )}
                      </div>
                      {s.steps.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {s.steps.map((st, i) => {
                            const elapsed = st.status === "running" && st.startedAt
                              ? Date.now() - st.startedAt
                              : st.durationMs;
                            return (
                            <div key={i} className={cn(
                              "rounded-md border p-2 transition-colors",
                              st.status === "running" ? "border-primary/40 bg-primary/5" : "border-border bg-background/50",
                            )}>
                              <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wide">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded border",
                                  st.kind === "scan" && "border-blue-500/30 text-blue-500 bg-blue-500/5",
                                  st.kind === "exec" && "border-amber-500/30 text-amber-500 bg-amber-500/5",
                                  st.kind === "verify" && "border-emerald-500/30 text-emerald-500 bg-emerald-500/5",
                                )}>{st.kind}</span>
                                <span className="text-foreground/80 normal-case tracking-normal text-[11.5px] font-medium">{st.op}</span>
                                <span className="text-muted-foreground normal-case tracking-normal text-[11px]">→ {st.target}</span>
                                <span className="ml-auto text-muted-foreground normal-case tracking-normal text-[10.5px] tabular-nums">
                                  {st.status === "pending" ? "queued" : `${elapsed}ms`}
                                </span>
                                {st.status === "pending" && <div className="h-3 w-3 rounded-full border border-border" />}
                                {st.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                {st.status === "ok" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                {st.status === "fail" && <XCircle className="h-3 w-3 text-destructive" />}
                              </div>
                              <pre className="mt-1.5 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed">{st.sql}</pre>
                              {st.message && st.status !== "pending" && (
                                <div className="mt-1 text-[11px] text-foreground/70">
                                  <span className="text-muted-foreground">↳ </span>{st.message}
                                  {typeof st.affected === "number" && st.status === "ok" && ` · ${st.affected} row(s)`}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => !fixing && setFixLog(null)}
                disabled={fixing}
                className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-[13px] disabled:opacity-40"
              >
                {fixing ? "Working…" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolved && (
        <div className="fixed inset-0 z-50 bg-black/60 grid place-items-center p-4" onClick={() => setShowResolved(false)}>
          <div className="bg-surface border border-border rounded-2xl max-w-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[16px] font-semibold flex items-center gap-2"><History className="h-4 w-4" /> Resolved issues</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {resolved.length === 0 ? "No issues have been resolved yet." : `${resolved.length} issue(s) resolved · newest first`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {resolved.length > 0 && (
                  <button
                    onClick={() => { if (confirm("Clear resolved history?")) persistResolved([]); }}
                    className="text-[11.5px] text-muted-foreground hover:text-destructive px-2 py-1 rounded-md border border-border"
                  >
                    Clear history
                  </button>
                )}
                <button onClick={() => setShowResolved(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {resolved.map((r, i) => (
                <div key={`${r.id}-${i}`} className="py-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-medium">{r.title}</span>
                      <span className={cn("text-[10.5px] uppercase tracking-wide px-1.5 py-0.5 rounded border", SEV_STYLE[r.severity].badge)}>
                        {SEV_STYLE[r.severity].label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        · {new Date(r.resolvedAt).toLocaleString()} · {r.affected} row(s)
                      </span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground mt-0.5">
                      {r.steps.length} step(s) · total {r.steps.reduce((a, s) => a + s.durationMs, 0)}ms
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const md = buildFindingReport(r, { resolved: r });
                      downloadMarkdown(`Metrixcom-SEC-${r.id}-${r.resolvedAt.slice(0, 10)}.md`, md);
                    }}
                    className="shrink-0 h-7 px-2 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/60 inline-flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Report
                  </button>
                </div>
              ))}
              {resolved.length === 0 && (
                <div className="py-8 text-center text-[12.5px] text-muted-foreground">
                  Fixed issues will appear here with a downloadable detailed report.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



/* ---------------- SYSTEM ---------------- */

function System() {
  const [s, setS] = useState<AppSettings | null>(null);

  async function load() {
    const { data } = await supabase.from("app_settings").select("*").eq("id", 1).maybeSingle();
    setS(data as AppSettings | null);
  }
  useEffect(() => { load(); }, []);

  async function save(patch: Partial<AppSettings>) {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    const { error } = await supabase.from("app_settings").update(patch as never).eq("id", 1);
    if (error) toast.error(error.message);
  }

  if (!s) return <div className="text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h3 className="text-[15px] font-semibold">Platform</h3>
        <div>
          <Label className="text-[12px]">Site name</Label>
          <Input value={s.site_name} onChange={(e) => save({ site_name: e.target.value })} className="mt-1" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px]">Registration enabled</div>
            <div className="text-[12px] text-muted-foreground">Allow new sign-ups.</div>
          </div>
          <Switch checked={s.registration_enabled} onCheckedChange={(v) => save({ registration_enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px]">Google sign-in</div>
            <div className="text-[12px] text-muted-foreground">Show Google as a sign-in option.</div>
          </div>
          <Switch checked={s.google_auth_enabled} onCheckedChange={(v) => save({ google_auth_enabled: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13.5px]">Maintenance mode</div>
            <div className="text-[12px] text-muted-foreground">Show a maintenance banner to all users.</div>
          </div>
          <Switch checked={s.maintenance_mode} onCheckedChange={(v) => save({ maintenance_mode: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[12px]">Default theme</Label>
            <Select value={s.default_theme} onValueChange={(v) => save({ default_theme: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Max upload (MB)</Label>
            <Input type="number" value={s.max_upload_mb} onChange={(e) => save({ max_upload_mb: Number(e.target.value) })} className="mt-1" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h3 className="text-[15px] font-semibold">Feature status</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[12px]">Web search</Label>
            <Select value={s.web_search_status} onValueChange={(v) => save({ web_search_status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Deep research</Label>
            <Select value={s.deep_research_status} onValueChange={(v) => save({ deep_research_status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[12px]">Computer Engine (Local)</Label>
            <Select value={s.local_compute_status || "operational"} onValueChange={(v) => save({ local_compute_status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Computer Engine (Cloud)</Label>
            <Select value={s.cloud_compute_status || "operational"} onValueChange={(v) => save({ cloud_compute_status: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="degraded">Degraded</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PLANS ---------------- */
type Plan = { id: string; name: string; description: string | null; price_monthly: number; price_yearly: number; status: string; display_order: number; limits: Record<string, number>; features: Record<string, boolean> };
function Plans() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [edit, setEdit] = useState<Plan | null>(null);
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  async function load() { const { data } = await supabase.from("plans" as never).select("*").order("display_order"); setRows((data as Plan[]) ?? []); }
  async function loadFlag() {
    const { data } = await supabase.from("feature_flags" as never).select("enabled").eq("key", "premium_button").maybeSingle();
    setPremiumEnabled(!!(data as { enabled?: boolean } | null)?.enabled);
  }
  useEffect(() => {
    load(); loadFlag();
    const ch = supabase.channel("adm-plans")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, loadFlag)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  async function togglePremium(v: boolean) {
    setPremiumEnabled(v);
    const { error } = await supabase.from("feature_flags" as never).upsert({ key: "premium_button", enabled: v, description: "Show Upgrade to Premium button in sidebar" } as never, { onConflict: "key" } as never);
    if (error) { toast.error(error.message); setPremiumEnabled(!v); return; }
    toast.success(v ? "Premium button enabled" : "Premium button disabled");
  }
  async function save(p: Plan) {
    const payload = { name: p.name, description: p.description, price_monthly: p.price_monthly, price_yearly: p.price_yearly, status: p.status, display_order: p.display_order, limits: p.limits, features: p.features };
    const { error } = await supabase.from("plans" as never).update(payload as never).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Plan saved"); setEdit(null);
  }
  async function create() {
    const { error } = await supabase.from("plans" as never).insert({ name: "New plan", price_monthly: 0, price_yearly: 0, status: "draft", display_order: rows.length, limits: {}, features: {} } as never);
    if (error) toast.error(error.message);
  }
  async function del(id: string) { if (!confirm("Delete plan?")) return; await supabase.from("plans" as never).delete().eq("id", id); }

  if (edit) return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-3 max-w-2xl">
      <h3 className="text-[15px] font-semibold">Edit plan</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-[12px]">Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="mt-1" /></div>
        <div><Label className="text-[12px]">Status</Label>
          <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="hidden">Hidden</SelectItem></SelectContent></Select>
        </div>
        <div><Label className="text-[12px]">Price / month</Label><Input type="number" value={edit.price_monthly} onChange={(e) => setEdit({ ...edit, price_monthly: Number(e.target.value) })} className="mt-1" /></div>
        <div><Label className="text-[12px]">Price / year</Label><Input type="number" value={edit.price_yearly} onChange={(e) => setEdit({ ...edit, price_yearly: Number(e.target.value) })} className="mt-1" /></div>
      </div>
      <div><Label className="text-[12px]">Description</Label><Textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} rows={2} className="mt-1" /></div>
      <div><Label className="text-[12px]">Limits (JSON)</Label><Textarea value={JSON.stringify(edit.limits, null, 2)} onChange={(e) => { try { setEdit({ ...edit, limits: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} rows={5} className="mt-1 font-mono text-[12px]" /></div>
      <div><Label className="text-[12px]">Features (JSON)</Label><Textarea value={JSON.stringify(edit.features, null, 2)} onChange={(e) => { try { setEdit({ ...edit, features: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} rows={5} className="mt-1 font-mono text-[12px]" /></div>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => save(edit)}>Save</Button></div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between">
        <div>
          <div className="text-[14px] font-medium">Show &ldquo;Upgrade to Premium&rdquo; button</div>
          <div className="text-[12px] text-muted-foreground">When enabled, users see a purchase premium button in the sidebar.</div>
        </div>
        <Switch checked={premiumEnabled} onCheckedChange={togglePremium} />
      </div>
      <div className="flex justify-end"><Button onClick={create}>+ New plan</Button></div>
      {rows.map((p) => (
        <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
          <div><div className="text-[14px] font-medium">{p.name} <span className="text-[11.5px] text-muted-foreground ml-2">{p.status}</span></div><div className="text-[12px] text-muted-foreground">${p.price_monthly}/mo · ${p.price_yearly}/yr</div></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEdit(p)}>Edit</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(p.id)}>Delete</Button></div>
        </div>
      ))}
      {rows.length === 0 && <div className="text-muted-foreground text-sm">No plans yet.</div>}
    </div>
  );
}


/* ---------------- LIMITS ---------------- */
function Limits() {
  const [json, setJson] = useState("{}");
  const [rate, setRate] = useState("{}");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from("app_settings").select("global_limits,rate_limits").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) {
        setJson(JSON.stringify(data.global_limits ?? {}, null, 2));
        setRate(JSON.stringify((data as { rate_limits?: unknown }).rate_limits ?? {}, null, 2));
      }
      setLoaded(true);
    });
    const ch = supabase.channel("adm-limits").on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload) => {
      const row = (payload.new ?? payload.old) as { global_limits?: unknown; rate_limits?: unknown } | null;
      if (row) {
        setJson(JSON.stringify(row.global_limits ?? {}, null, 2));
        setRate(JSON.stringify(row.rate_limits ?? {}, null, 2));
      }
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  async function persist(nextGlobal: Record<string, unknown>) {
    const rl = (() => { try { return JSON.parse(rate); } catch { return {}; } })();
    setJson(JSON.stringify(nextGlobal, null, 2));
    const { error } = await supabase.from("app_settings").update({ global_limits: nextGlobal, rate_limits: rl } as never).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Saved");
  }
  async function saveJsonEditors() {
    try {
      const gl = JSON.parse(json); const rl = JSON.parse(rate);
      const { error } = await supabase.from("app_settings").update({ global_limits: gl, rate_limits: rl } as never).eq("id", 1);
      if (error) return toast.error(error.message);
      toast.success("Global limits saved");
    } catch { toast.error("Invalid JSON"); }
  }
  if (!loaded) return <div className="text-muted-foreground text-sm">Loading…</div>;
  const gl = (() => { try { return JSON.parse(json) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; } })();
  const effortCaps = (gl.effort_caps as Record<string, boolean> | undefined) ?? {};
  const limitsEnabled = (gl.limits_enabled as boolean | undefined) !== false;
  const dailyMsgLimit = Number(gl.daily_msg_limit ?? 0) || 0;
  const pinMax = Number(gl.max_pinned_chats ?? 0) || 0;

  const setLimitsEnabled = (v: boolean) => persist({ ...gl, limits_enabled: v });
  const setPinMax = (n: number) => persist({ ...gl, max_pinned_chats: n });
  const setDailyMsg = (n: number) => persist({ ...gl, daily_msg_limit: n });
  const setEffortCap = (effort: string, enabled: boolean) => persist({ ...gl, effort_caps: { ...effortCaps, [effort]: enabled } });

  const EFFORTS: Array<{ key: string; label: string; hint: string }> = [
    { key: "low",    label: "Low",    hint: "GPT-5.4 Nano · OpenAI · 2048 tokens" },
    { key: "medium", label: "Medium", hint: "GPT-5.4 Mini · OpenAI · 4096 tokens" },
    { key: "high",   label: "High",   hint: "GPT-5.4 · OpenAI · 8192 tokens" },
    { key: "ultra",  label: "Ultra",  hint: "GPT-5.5 Terra · OpenAI · 16384 tokens" },
    { key: "max",    label: "Max",    hint: "GPT-5.6 Sol · OpenAI · 32768 tokens" },
  ];
  return (
    <div className="space-y-4 max-w-2xl">
      <div className={`rounded-xl border p-5 space-y-3 ${limitsEnabled ? "border-border bg-surface" : "border-amber-500/40 bg-amber-500/5"}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-[15px] font-semibold">Master limits switch</h3>
            <p className="text-[12px] text-muted-foreground">Turn off to disable ALL limits platform-wide (output caps, pin cap, per-effort caps, daily message cap). Admins always bypass limits. Changes apply live across all connected sessions.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-muted-foreground">{limitsEnabled ? "Enforced" : "Disabled"}</span>
            <Switch checked={limitsEnabled} onCheckedChange={setLimitsEnabled} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">Daily message limit (per user)</h3>
        <p className="text-[12px] text-muted-foreground">Applied to every non-admin user unless a per-user override is set. 0 = unlimited. Updates the composer banner in real time.</p>
        <Input
          type="number"
          min={0}
          value={dailyMsgLimit}
          onChange={(e) => setDailyMsg(Number(e.target.value) || 0)}
          className="max-w-[160px]"
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">Pinned chats</h3>
        <p className="text-[12px] text-muted-foreground">Maximum number of chats a user can pin at once. 0 = unlimited.</p>
        <Input
          type="number"
          min={0}
          value={pinMax}
          onChange={(e) => setPinMax(Number(e.target.value) || 0)}
          className="max-w-[160px]"
        />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">Chat output limits per effort</h3>
        <p className="text-[12px] text-muted-foreground">Turn a switch off to lift the response-length cap for that effort level (unlimited output). On = enforce the default per-effort cap. Reflects the current model routing.</p>
        <div className="divide-y divide-border">
          {EFFORTS.map((e) => {
            const enabled = effortCaps[e.key] !== false;
            return (
              <div key={e.key} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-[13px] font-medium">{e.label}</div>
                  <div className="text-[11px] text-muted-foreground">{e.hint}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{enabled ? "Capped" : "Unlimited"}</span>
                  <Switch checked={enabled} onCheckedChange={(v) => setEffortCap(e.key, v)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">Global limits (advanced JSON)</h3>
        <p className="text-[12px] text-muted-foreground">Keys: daily_msg_limit, max_upload_size_mb, max_attachments, chat_length, storage_mb, max_pinned_chats, limits_enabled, effort_caps.</p>
        <Textarea rows={8} className="font-mono text-[12px]" value={json} onChange={(e) => setJson(e.target.value)} />
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">Rate limits (advanced JSON)</h3>
        <Textarea rows={6} className="font-mono text-[12px]" value={rate} onChange={(e) => setRate(e.target.value)} />
      </div>
      <div className="flex justify-end"><Button onClick={saveJsonEditors}>Save JSON editors</Button></div>
    </div>
  );
}

/* ---------------- OVERRIDES ---------------- */
type Override = { user_id: string; plan_override: string | null; msg_limit: number | null; storage_mb: number | null; lifetime_premium: boolean; trial_until: string | null; unlimited: boolean; notes: string | null };
function Overrides() {
  const [rows, setRows] = useState<(Override & { email?: string; is_admin?: boolean })[]>([]);
  const [email, setEmail] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  async function load() {
    const { data } = await supabase.from("user_overrides" as never).select("*");
    const list = (data as Override[]) ?? [];
    // Always show all current admins too — even if they have no override row yet.
    const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = new Set(((adminRoles as { user_id: string }[]) ?? []).map((r) => r.user_id));
    const allIds = Array.from(new Set([...list.map((r) => r.user_id), ...adminIds]));
    if (allIds.length === 0) { setRows([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,email").in("id", allIds);
    const emap = new Map((profs ?? []).map((p) => [p.id, p.email]));
    const byId = new Map(list.map((r) => [r.user_id, r]));
    setRows(allIds.map((uid) => {
      const base = byId.get(uid) ?? { user_id: uid, plan_override: null, msg_limit: null, storage_mb: null, lifetime_premium: false, trial_until: null, unlimited: false, notes: null };
      return { ...base, email: emap.get(uid) ?? undefined, is_admin: adminIds.has(uid) };
    }));
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("adm-ovr")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_overrides" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  async function add() {
    if (!email.trim()) return;
    const { data: p } = await supabase.from("profiles").select("id").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (!p) return toast.error("User not found");
    const { error } = await supabase.from("user_overrides" as never).upsert({ user_id: p.id, lifetime_premium: false, unlimited: false } as never);
    if (error) return toast.error(error.message);
    setEmail(""); toast.success("Override added");
  }
  async function grantAdmin(targetEmail: string) {
    if (!targetEmail.trim()) return;
    const { data: p } = await supabase.from("profiles").select("id").eq("email", targetEmail.trim().toLowerCase()).maybeSingle();
    if (!p) return toast.error("User not found");
    const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" } as never);
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    setAdminEmail(""); toast.success("Admin access granted");
    load();
  }
  async function setAdmin(uid: string, on: boolean) {
    if (on) {
      const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" } as never);
      if (error && !error.message.includes("duplicate")) return toast.error(error.message);
      toast.success("Admin granted");
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      if (error) return toast.error(error.message);
      toast.success("Admin revoked");
    }
    load();
  }
  async function update(uid: string, patch: Partial<Override>) {
    // Ensure a row exists (admins without an override row still edit inline).
    const { error } = await supabase.from("user_overrides" as never).upsert({ user_id: uid, lifetime_premium: false, unlimited: false, ...patch } as never, { onConflict: "user_id" } as never);
    if (error) toast.error(error.message);
  }
  async function del(uid: string) { await supabase.from("user_overrides" as never).delete().eq("user_id", uid); }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
          <div className="text-[13px] font-medium">Add access override</div>
          <div className="flex gap-2">
            <Input placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button onClick={add}>Add</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Sets per-user limits, plan, trial, or unlimited access.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
          <div className="text-[13px] font-medium">Grant admin access</div>
          <div className="flex gap-2">
            <Input placeholder="user@email.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            <Button onClick={() => grantAdmin(adminEmail)}>Make admin</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">New admins get full Admin Panel access and bypass all limits.</p>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.user_id} className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-[13.5px] font-medium flex items-center gap-2">
                {r.email ?? r.user_id}
                {r.is_admin && <span className="text-[10px] rounded-full bg-primary/15 text-primary px-2 py-0.5 uppercase tracking-wide">Admin</span>}
              </div>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(r.user_id)}>Remove override</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
              <div><Label className="text-[11px]">Plan override</Label><Input value={r.plan_override ?? ""} onChange={(e) => update(r.user_id, { plan_override: e.target.value || null })} className="mt-1 h-8" /></div>
              <div><Label className="text-[11px]">Msg limit</Label><Input type="number" value={r.msg_limit ?? ""} onChange={(e) => update(r.user_id, { msg_limit: e.target.value ? Number(e.target.value) : null })} className="mt-1 h-8" /></div>
              <div><Label className="text-[11px]">Storage MB</Label><Input type="number" value={r.storage_mb ?? ""} onChange={(e) => update(r.user_id, { storage_mb: e.target.value ? Number(e.target.value) : null })} className="mt-1 h-8" /></div>
              <div><Label className="text-[11px]">Trial until</Label><Input type="date" value={r.trial_until?.slice(0, 10) ?? ""} onChange={(e) => update(r.user_id, { trial_until: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-1 h-8" /></div>
              <label className="flex items-center gap-2"><Switch checked={r.lifetime_premium} onCheckedChange={(v) => update(r.user_id, { lifetime_premium: v })} />Lifetime premium</label>
              <label className="flex items-center gap-2"><Switch checked={r.unlimited} onCheckedChange={(v) => update(r.user_id, { unlimited: v })} />Unlimited</label>
              <label className="flex items-center gap-2"><Switch checked={!!r.is_admin} onCheckedChange={(v) => setAdmin(r.user_id, v)} />Admin access</label>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-muted-foreground text-sm">No overrides.</div>}
      </div>
    </div>
  );
}


/* ---------------- PROMOTIONS ---------------- */
type Promo = { id: string; code: string; kind: string; discount: number | null; duration_days: number | null; expires_at: string | null; usage_limit: number | null; used_count: number; active: boolean };
function Promotions() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [code, setCode] = useState(""); const [kind, setKind] = useState("coupon"); const [discount, setDiscount] = useState(""); const [limit, setLimit] = useState(""); const [expires, setExpires] = useState("");
  async function load() { const { data } = await supabase.from("promotions" as never).select("*").order("created_at", { ascending: false }); setRows((data as Promo[]) ?? []); }
  useEffect(() => { load(); const ch = supabase.channel("adm-promo").on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, load).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  async function create() {
    if (!code.trim()) return;
    const { error } = await supabase.from("promotions" as never).insert({ code: code.trim().toUpperCase(), kind, discount: discount ? Number(discount) : null, usage_limit: limit ? Number(limit) : null, expires_at: expires ? new Date(expires).toISOString() : null, active: true } as never);
    if (error) return toast.error(error.message);
    setCode(""); setDiscount(""); setLimit(""); setExpires(""); toast.success("Promotion created");
  }
  async function toggle(id: string, v: boolean) { await supabase.from("promotions" as never).update({ active: v } as never).eq("id", id); }
  async function del(id: string) { await supabase.from("promotions" as never).delete().eq("id", id); }
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-5 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
        <div><Label className="text-[11px]">Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 h-9" /></div>
        <div><Label className="text-[11px]">Kind</Label>
          <Select value={kind} onValueChange={setKind}><SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="coupon">Coupon</SelectItem><SelectItem value="lifetime">Lifetime</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="referral">Referral</SelectItem></SelectContent></Select>
        </div>
        <div><Label className="text-[11px]">Discount %</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 h-9" /></div>
        <div><Label className="text-[11px]">Usage limit</Label><Input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="mt-1 h-9" /></div>
        <div><Label className="text-[11px]">Expires</Label><Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="mt-1 h-9" /></div>
        <Button onClick={create}>Create</Button>
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-[13px]"><thead><tr className="text-left text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border"><th className="px-4 py-2.5 font-normal">Code</th><th className="px-4 py-2.5 font-normal">Kind</th><th className="px-4 py-2.5 font-normal">Discount</th><th className="px-4 py-2.5 font-normal">Usage</th><th className="px-4 py-2.5 font-normal">Expires</th><th className="px-4 py-2.5 font-normal">Status</th><th className="px-4 py-2.5 font-normal">Active</th><th></th></tr></thead><tbody>
          {rows.map((r) => {
            const expired = !!r.expires_at && new Date(r.expires_at) < new Date();
            const status = !r.active ? { label: "Disabled", cls: "text-muted-foreground bg-muted/40 border-border" }
              : expired ? { label: "Expired", cls: "text-destructive bg-destructive/10 border-destructive/30" }
              : { label: "Active", cls: "text-primary bg-primary/10 border-primary/30" };
            return (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-mono">{r.code}</td><td className="px-4 py-2.5">{r.kind}</td><td className="px-4 py-2.5">{r.discount ? `${r.discount}%` : "—"}</td><td className="px-4 py-2.5">{r.used_count}/{r.usage_limit ?? "∞"}</td><td className="px-4 py-2.5 text-muted-foreground">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${status.cls}`}>{status.label}</span></td>
                <td className="px-4 py-2.5"><Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} /></td>
                <td className="px-4 py-2.5"><Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No promotions.</td></tr>}
        </tbody></table>
      </div>

    </div>
  );
}

/* ---------------- FEATURES ---------------- */
type Flag = { key: string; label: string | null; enabled: boolean };
function Features() {
  const [rows, setRows] = useState<Flag[]>([]);
  async function load() { const { data } = await supabase.from("feature_flags" as never).select("*").order("key"); setRows((data as Flag[]) ?? []); }
  useEffect(() => { load(); const ch = supabase.channel("adm-flags").on("postgres_changes", { event: "*", schema: "public", table: "feature_flags" }, load).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  async function toggle(key: string, v: boolean) { const { error } = await supabase.from("feature_flags" as never).update({ enabled: v } as never).eq("key", key); if (error) toast.error(error.message); }
  return (
    <div className="rounded-xl border border-border bg-surface divide-y divide-border max-w-2xl">
      {rows.map((f) => (
        <div key={f.key} className="flex items-center justify-between p-4">
          <div><div className="text-[13.5px] capitalize">{f.label ?? f.key.replace(/_/g, " ")}</div><div className="text-[11.5px] text-muted-foreground font-mono">{f.key}</div></div>
          <Switch checked={f.enabled} onCheckedChange={(v) => toggle(f.key, v)} />
        </div>
      ))}
      {rows.length === 0 && <div className="p-6 text-muted-foreground text-sm">No feature flags.</div>}
    </div>
  );
}

/* ---------------- MODELS ---------------- */
type Assignment = { agent_id: string; model: string; provider: string };
const CHAIN_EFFORTS: Array<"low" | "medium" | "high" | "ultra" | "max"> = ["low", "medium", "high", "ultra", "max"];
const CHAIN_AGENTS: Array<{ id: string; label: string }> = [
  { id: "_global", label: "Global default" },
  { id: "pulse-1", label: "GPT-5.4 Nano (general)" },
  { id: "forge-1", label: "GPT-5.4 (engineering)" },
  { id: "cipher-1", label: "GPT-5.6 Sol (security)" },
];

function chainKey(agent: string, effort: string) {
  return agent === "_global" ? `chain:${effort}` : `chain:${agent}:${effort}`;
}

function Models() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [agent, setAgent] = useState<string>("_global");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("model_assignments" as never).select("*").order("agent_id");
    setRows((data as Assignment[]) ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("adm-models").on("postgres_changes", { event: "*", schema: "public", table: "model_assignments" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const chainRows = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rows) if (r.agent_id?.startsWith("chain:")) map[r.agent_id] = r.model;
    return map;
  }, [rows]);

  async function saveChain(effort: string) {
    const key = chainKey(agent, effort);
    const raw = drafts[key] ?? chainRows[key] ?? "";
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Chain must be a non-empty JSON array");
      for (const p of parsed) {
        if (!p || typeof p !== "object" || !("provider" in p) || !("model" in p)) throw new Error("Each item needs {provider, model}");
      }
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    const payload = { agent_id: key, provider: "chain", model: raw };
    const { error } = await supabase.from("model_assignments" as never).upsert(payload as never, { onConflict: "agent_id" } as never);
    if (error) toast.error(error.message); else toast.success(`Saved ${key}`);
  }

  async function resetChain(effort: string) {
    const key = chainKey(agent, effort);
    const { error } = await supabase.from("model_assignments" as never).delete().eq("agent_id", key);
    if (error) toast.error(error.message); else {
      toast.success(`Reset ${key} to baked default`);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-[15px] font-semibold">Provider failover chains</h3>
            <p className="text-[12px] text-muted-foreground">Each effort level tries providers top-to-bottom. Set a per-agent override or leave blank to inherit the baked default.</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {CHAIN_AGENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAgent(a.id)}
                className={cn(
                  "text-[12px] px-2.5 py-1 rounded-md transition-colors",
                  agent === a.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >{a.label}</button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {CHAIN_EFFORTS.map((eff) => {
            const key = chainKey(agent, eff);
            const stored = chainRows[key] ?? "";
            const value = drafts[key] ?? stored;
            const overridden = Boolean(stored);
            return (
              <div key={eff} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold capitalize">{eff}</span>
                    <span className={cn("text-[10.5px] px-1.5 py-0.5 rounded-full",
                      overridden ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}>{overridden ? "Custom" : "Default"}</span>
                  </div>
                  <div className="flex gap-2">
                    {overridden && <Button size="sm" variant="ghost" onClick={() => resetChain(eff)}>Reset</Button>}
                    <Button size="sm" onClick={() => saveChain(eff)}>Save</Button>
                  </div>
                </div>
                <Textarea
                  value={value}
                  placeholder={`[
  {"provider":"lovable","model":"openai/gpt-5.4-nano"},
  {"provider":"gemini","model":"gemini-2.5-flash"},
  {"provider":"groq","model":"llama-3.3-70b-versatile"}
]`}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                  rows={4}
                  className="font-mono text-[11.5px]"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="p-5 pb-3">
          <h3 className="text-[15px] font-semibold">Base Model Lineup</h3>
          <p className="text-[12px] text-muted-foreground">The 13-model tier-locked lineup defined in the registry. These are the models users see in the composer.</p>
        </div>
        <div className="divide-y divide-border">
          {MODEL_REGISTRY.map((m) => (
            <div key={m.id} className="p-3 grid grid-cols-[1.5fr_1fr_0.6fr_2fr] gap-2 items-center">
              <div className="text-[12.5px] font-medium truncate">{m.name}</div>
              <div className="text-[11.5px] font-mono text-muted-foreground truncate">{m.id}</div>
              <div className="flex">
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                  m.minPlan === "free" && "bg-emerald-500/10 text-emerald-500",
                  m.minPlan === "standard" && "bg-blue-500/10 text-blue-500",
                  m.minPlan === "pro" && "bg-amber-500/10 text-amber-500",
                  m.minPlan === "proplus" && "bg-purple-500/10 text-purple-500"
                )}>
                  {m.minPlan === "proplus" ? "Pro+" : m.minPlan}
                </span>
              </div>
              <div className="text-[11.5px] font-mono text-muted-foreground truncate" title={`openrouter/${m.openRouterId}`}>
                openrouter/{m.openRouterId}
              </div>
            </div>
          ))}

        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="p-5 pb-3">
          <h3 className="text-[15px] font-semibold">Live Overrides (model_assignments)</h3>
          <p className="text-[12px] text-muted-foreground">Active runtime overrides for agent-level and effort-level chains.</p>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div key={r.agent_id} className="p-3 grid grid-cols-[1.2fr_0.6fr_2fr] gap-2 items-center">
              <div className="text-[12.5px] font-mono truncate">{r.agent_id}</div>
              <div className="text-[12px] capitalize"><span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] bg-background/40">{r.provider}</span></div>
              <div className="text-[11.5px] font-mono text-muted-foreground truncate" title={r.model}>{r.model}</div>
            </div>
          ))}
          {rows.length === 0 && <div className="p-6 text-muted-foreground text-sm">No custom overrides active. Inheriting baked defaults.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ANNOUNCEMENTS ---------------- */
type Ann = { id: string; kind: string; title: string; body: string; active: boolean; created_at: string };
function Announcements() {
  const [rows, setRows] = useState<Ann[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [kind, setKind] = useState("banner");
  async function load() { const { data } = await supabase.from("announcements" as never).select("*").order("created_at", { ascending: false }); setRows((data as Ann[]) ?? []); }
  useEffect(() => { load(); const ch = supabase.channel("adm-ann").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, load).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  async function create() {
    if (!title.trim()) return;
    if (kind === "notification") {
      const { error } = await supabase.from("notifications").insert({ title, body: body || null, kind: "announcement", user_id: null });
      if (error) return toast.error(error.message);
      setTitle(""); setBody(""); toast.success("Notification sent to all users");
      return;
    }
    const { error } = await supabase.from("announcements" as never).insert({ kind, title, body, active: true } as never);
    if (error) return toast.error(error.message);
    setTitle(""); setBody(""); toast.success("Published");
  }
  async function toggle(id: string, v: boolean) { await supabase.from("announcements" as never).update({ active: v } as never).eq("id", id); }
  async function del(id: string) { await supabase.from("announcements" as never).delete().eq("id", id); }
  const previewTitle = title.trim() || "Untitled announcement";
  const previewBody = body.trim() || "Body text will appear here…";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h3 className="text-[15px] font-semibold">New announcement</h3>
        <Select value={kind} onValueChange={setKind}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="banner">Banner</SelectItem><SelectItem value="popup">Popup</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="release">Release notes</SelectItem><SelectItem value="notification">Notification</SelectItem></SelectContent></Select>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Body…" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />

        <div className="pt-2">
          <div className="text-[11.5px] uppercase tracking-wide text-muted-foreground mb-2">Live preview</div>
          <div className="rounded-lg border border-border bg-background/60 p-3 min-h-24">
            {kind === "banner" && (
              <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-[13px]">
                <span className="font-medium">{previewTitle}</span>
                <span className="text-muted-foreground truncate">{previewBody}</span>
                <button className="ml-auto text-muted-foreground">✕</button>
              </div>
            )}
            {kind === "release" && (
              <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-[13px]">
                <span className="font-medium">{previewTitle}</span>
                <span className="text-muted-foreground truncate">{previewBody}</span>
                <button className="ml-auto text-muted-foreground">✕</button>
              </div>
            )}
            {kind === "maintenance" && (
              <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 px-3 py-2 text-[13px] text-center">
                {previewTitle}
                {body.trim() && <div className="text-[12px] mt-1 opacity-80">{previewBody}</div>}
              </div>
            )}
            {kind === "popup" && (
              <div className="relative rounded-md bg-black/40 p-4 grid place-items-center min-h-40">
                <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-lg">
                  <div className="text-[15px] font-semibold">{previewTitle}</div>
                  <div className="mt-2 text-[13px] text-muted-foreground whitespace-pre-wrap">{previewBody}</div>
                  <div className="mt-4 flex justify-end">
                    <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-[12.5px]">Got it</button>
                  </div>
                </div>
              </div>
            )}
            {kind === "notification" && (
              <div className="rounded-md border border-border bg-surface px-3 py-2">
                <div className="text-[13px] font-medium">{previewTitle}</div>
                <div className="text-[12px] text-muted-foreground mt-0.5">{previewBody}</div>
                <div className="text-[10.5px] text-muted-foreground mt-1">just now · appears in every user's bell</div>
              </div>
            )}
          </div>
        </div>

        <Button onClick={create}>{kind === "notification" ? "Send notification" : "Publish"}</Button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex justify-between items-start">
              <div><div className="text-[13.5px] font-medium">{r.title}</div><div className="text-[11.5px] text-muted-foreground">{r.kind} · {new Date(r.created_at).toLocaleString()}</div></div>
              <div className="flex items-center gap-2"><Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} /><button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </div>
            <div className="text-[13px] mt-1">{r.body}</div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-muted-foreground text-sm">None.</div>}
      </div>
    </div>
  );
}

function Diagnostics() {
  const [gl, setGl] = useState<Record<string, unknown>>({});
  const [rl, setRl] = useState<Record<string, unknown>>({});
  const [overrides, setOverrides] = useState<Array<Record<string, unknown>>>([]);
  const [log, setLog] = useState<import("@/lib/rate-limit").RateLimitObservation[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const loadSettings = () => supabase.from("app_settings").select("global_limits,rate_limits").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data) {
        setGl((data.global_limits as Record<string, unknown>) ?? {});
        setRl(((data as { rate_limits?: Record<string, unknown> }).rate_limits) ?? {});
      }
    });
    const loadOverrides = () => supabase.from("user_overrides" as never).select("*").then(({ data }) => setOverrides((data as Array<Record<string, unknown>>) ?? []));
    loadSettings(); loadOverrides();
    const ch1 = supabase.channel("adm-diag-settings").on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, loadSettings).subscribe();
    const ch2 = supabase.channel("adm-diag-ovr").on("postgres_changes", { event: "*", schema: "public", table: "user_overrides" }, loadOverrides).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  useEffect(() => {
    const refresh = () => import("@/lib/rate-limit").then((m) => setLog(m.readRateLimitLog()));
    refresh();
    window.addEventListener("arch:rl_diag", refresh);
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => { window.removeEventListener("arch:rl_diag", refresh); clearInterval(tick); };
  }, []);

  const limitsEnabled = (gl.limits_enabled as boolean | undefined) !== false;
  const effortCaps = (gl.effort_caps as Record<string, boolean> | undefined) ?? {};
  const dailyMsg = Number(gl.daily_msg_limit ?? 0) || 0;
  const pinMax = Number(gl.max_pinned_chats ?? 0) || 0;
  const active = log.find((o) => o.untilMs > now);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold">Global limits (live)</h3>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${limitsEnabled ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"}`}>
            {limitsEnabled ? "Enforced" : "Master switch OFF"}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12.5px]">
          <Stat k="Daily msg cap" v={dailyMsg === 0 ? "Unlimited" : dailyMsg} />
          <Stat k="Pinned chats" v={pinMax === 0 ? "Unlimited" : pinMax} />
          <Stat k="Per-user overrides" v={overrides.length} />
          <Stat k="Effort caps on" v={`${Object.values(effortCaps).filter((v) => v !== false).length}/5`} />
        </div>
        <div className="mt-4">
          <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground mb-2">Effort caps</div>
          <div className="grid grid-cols-5 gap-2">
            {(["low","medium","high","ultra","max"] as const).map((k) => {
              const on = effortCaps[k] !== false;
              return (
                <div key={k} className={`rounded-lg border p-2 text-center text-[12px] ${on ? "border-border bg-surface" : "border-amber-500/40 bg-amber-500/5 text-amber-400"}`}>
                  <div className="font-medium capitalize">{k}</div>
                  <div className="text-[10.5px] text-muted-foreground">{on ? "capped" : "lifted"}</div>
                </div>
              );
            })}
          </div>
        </div>
        {Object.keys(rl).length > 0 && (
          <div className="mt-4">
            <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground mb-1">Rate limit config</div>
            <pre className="text-[11.5px] font-mono bg-background/50 border border-border rounded-md p-2 overflow-auto max-h-48">{JSON.stringify(rl, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h3 className="text-[15px] font-semibold mb-3">Per-user caps ({overrides.length})</h3>
        {overrides.length === 0 ? (
          <div className="text-muted-foreground text-sm">No per-user overrides configured. All users inherit the global limits above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-muted-foreground text-[11px] uppercase tracking-wider">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3">User ID</th>
                  <th className="text-left py-2 pr-3">Daily msgs</th>
                  <th className="text-left py-2 pr-3">Unlimited</th>
                  <th className="text-left py-2 pr-3">Lifetime premium</th>
                  <th className="text-left py-2 pr-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-[11px]">{String(o.user_id).slice(0, 8)}…</td>
                    <td className="py-2 pr-3">{(o.daily_msg_limit as number | null) ?? "—"}</td>
                    <td className="py-2 pr-3">{o.unlimited ? "yes" : "—"}</td>
                    <td className="py-2 pr-3">{o.lifetime_premium ? "yes" : "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{(o.notes as string | null) ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold">Cooldown source headers (this session)</h3>
            <p className="text-[11.5px] text-muted-foreground">Every 429 from a provider is logged with the exact header or body fragment used to compute the reset time.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => import("@/lib/rate-limit").then((m) => m.clearRateLimitLog())}>Clear</Button>
        </div>
        {active && (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-[12.5px]">
            <div className="font-medium text-amber-400">Active cooldown · {active.provider}</div>
            <div className="text-muted-foreground mt-1">
              Ready in {Math.max(0, Math.ceil((active.untilMs - now) / 1000))}s · source <code className="font-mono">{active.source}</code>
              {active.raw && <> · raw <code className="font-mono">{active.raw}</code></>}
            </div>
          </div>
        )}
        {log.length === 0 ? (
          <div className="text-muted-foreground text-sm">No rate-limit events observed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-muted-foreground text-[11px] uppercase tracking-wider">
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3">When</th>
                  <th className="text-left py-2 pr-3">Provider</th>
                  <th className="text-left py-2 pr-3">Source</th>
                  <th className="text-left py-2 pr-3">Raw</th>
                  <th className="text-left py-2 pr-3">Computed</th>
                  <th className="text-left py-2 pr-3">Ready at</th>
                </tr>
              </thead>
              <tbody>
                {log.map((o, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(o.ts).toLocaleTimeString()}</td>
                    <td className="py-2 pr-3">{o.provider}</td>
                    <td className="py-2 pr-3"><code className="font-mono text-[11px]">{o.source}</code></td>
                    <td className="py-2 pr-3 max-w-[260px] truncate"><code className="font-mono text-[11px]">{o.raw ?? "—"}</code></td>
                    <td className="py-2 pr-3">{(o.computedMs / 1000).toFixed(2)}s</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{new Date(o.untilMs).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- WORKFLOWS ---------------- */
function WorkflowsAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("workflows").select("*").order("updated_at", { ascending: false });
    setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("adm-workflows").on("postgres_changes", { event: "*", schema: "public", table: "workflows" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("workflows").update({ status: active ? 'active' : 'inactive' } as never).eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat k="Total workflows" v={rows.length} />
        <Stat k="Active" v={rows.filter(r => r.status === 'active').length} />
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-4 py-2.5 font-normal">Name</th>
              <th className="px-4 py-2.5 font-normal">User ID</th>
              <th className="px-4 py-2.5 font-normal">Status</th>
              <th className="px-4 py-2.5 font-normal">Updated</th>
              <th className="px-4 py-2.5 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-elevated">
                <td className="px-4 py-2.5 font-medium">{r.name}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.user_id.slice(0, 8)}…</td>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px]",
                    r.status === 'active' ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                  )}>{r.status.toUpperCase()}</span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">
                   <Switch checked={r.status === 'active'} onCheckedChange={(v) => toggle(r.id, v)} />
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No workflows created yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


type PoolKeyStatus = {
  idx: number;
  healthy: boolean;
  cooldownSec: number;
  calls: number;
  fails: number;
  lastStatus?: number;
  lastUsedAt: number;
};
type PoolPayload = {
  sizes: Record<string, number>;
  keys: Record<string, PoolKeyStatus[]>;
  at: string;
};


/* ---------------- SYSTEM DIAGNOSTICS ---------------- */

function SystemDiagnostics() {
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const { user } = useAuth();
  const fetchAnalytics = useServerFn(getAdminAnalytics);

  const runTests = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/public/test-models", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.ok) {
        toast.success("Tests complete");
        const updated = await fetchAnalytics();
        setData(updated);
      } else {
        toast.error("Tests failed");
      }
    } catch (e) {
      toast.error("Error running tests");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchAnalytics().then(setData);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-semibold">System Diagnostics</h2>
          <p className="text-[13px] text-muted-foreground">Run health checks across the model fleet.</p>
        </div>
        <button 
          onClick={runTests} 
          disabled={busy}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          Run All Model Tests
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" /> Live Test Logs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground font-medium">
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3 px-4">Model</th>
                <th className="pb-3 px-4 text-center">Latency</th>
                <th className="pb-3 px-4 text-center">Status</th>
                <th className="pb-3 pl-4">Response Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {(data?.testLogs ?? []).map((log: any) => (
                <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4 font-medium">{log.model_id}</td>
                  <td className="py-3 px-4 text-center tabular-nums">{log.latency_ms}ms</td>
                  <td className="py-3 px-4 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      log.status === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    )}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 pl-4 max-w-[300px] truncate italic text-muted-foreground">
                    {log.error_message || log.response}
                  </td>
                </tr>
              ))}
              {(!data?.testLogs || data.testLogs.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground italic">
                    No tests have been run yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AiKeys() {
  const [data, setData] = useState<PoolPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/ai-pool-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      setData((await res.json()) as PoolPayload);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const providers = data ? (Object.keys(data.keys) as Array<keyof typeof data.keys>) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">AI Key Pool</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live health of every upstream API key. Failed keys auto-cool down and rotate; the pool
            picks the least-recently-used healthy key on each request.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {err && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {err}
        </div>
      )}

      {!data && !err && (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          Loading pool status…
        </div>
      )}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["groq", "gemini", "openrouter"] as const).map((p) => {
              const rows = data.keys[p] ?? [];
              const healthy = rows.filter((k) => k.healthy).length;
              return (
                <div key={p} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="text-[11.5px] uppercase tracking-wider text-muted-foreground">{p}</div>
                  <div className="mt-2 text-[20px] font-semibold tracking-tight">
                    {healthy}/{data.sizes[p] ?? 0} healthy
                  </div>
                </div>
              );
            })}
          </div>

          {providers.map((p) => {
            const rows = data.keys[p] ?? [];
            if (rows.length === 0) {
              return (
                <div key={String(p)} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="font-medium capitalize">{String(p)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    No keys configured for this provider.
                  </div>
                </div>
              );
            }
            return (
              <div key={String(p)} className="rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-border font-medium capitalize">{String(p)}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[11.5px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2">Key</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2">Calls</th>
                        <th className="px-4 py-2">Fails</th>
                        <th className="px-4 py-2">Last status</th>
                        <th className="px-4 py-2">Last used</th>
                        <th className="px-4 py-2">Cooldown</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((k) => (
                        <tr key={k.idx} className="border-t border-border">
                          <td className="px-4 py-2 font-mono">#{k.idx + 1}</td>
                          <td className="px-4 py-2">
                            <span
                              className={
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
                                (k.healthy
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-amber-500/15 text-amber-400")
                              }
                            >
                              {k.healthy ? "Healthy" : "Quarantined"}
                            </span>
                          </td>
                          <td className="px-4 py-2">{k.calls}</td>
                          <td className="px-4 py-2">{k.fails}</td>
                          <td className="px-4 py-2 text-muted-foreground">{k.lastStatus ?? "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleTimeString() : "—"}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {k.cooldownSec > 0 ? `${k.cooldownSec}s` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground">
            State is per-worker isolate and refreshes every 15s. Cooldowns: 401/403 → 30 min · 429 → 5 min · 5xx → 60 s.
          </p>
        </>
      )}
    </div>
  );
}


