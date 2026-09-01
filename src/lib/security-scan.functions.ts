import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type VulnClass =
  | "privilege_escalation"
  | "data_exposure"
  | "injection"          // SQLi / XSS / prompt / command
  | "brute_force"        // credential stuffing / password spray
  | "ddos"               // volumetric / scanning
  | "session_hijacking"
  | "recon"              // honeytoken / decoy hits
  | "data_retention"
  | "incident_response"
  | "detection_gap"
  | "config_hygiene"
  | "info";

export const VULN_CLASS_LABEL: Record<VulnClass, string> = {
  privilege_escalation: "Privilege Escalation",
  data_exposure: "Data Exposure",
  injection: "Injection (SQLi / XSS)",
  brute_force: "Brute Force",
  ddos: "DDoS / Abuse",
  session_hijacking: "Session Hijacking",
  recon: "Reconnaissance",
  data_retention: "Data Retention",
  incident_response: "Incident Response",
  detection_gap: "Detection Gap",
  config_hygiene: "Config Hygiene",
  info: "Informational",
};

// Single source of truth so scan + report + admin UI stay in sync.
export const FINDING_VULN_CLASS: Record<string, VulnClass> = {
  "pg-rls-disabled": "data_exposure",
  "pg-no-policies": "data_exposure",
  "pg-definer-exposure": "privilege_escalation",
  "honeytoken-hit": "recon",
  "injection-attempts": "injection",
  "unresolved-alerts": "incident_response",
  "open-incidents": "incident_response",
  "threat-burst-24h": "ddos",
  "failed-login-burst": "brute_force",
  "tarpit-burst": "ddos",
  "expired-chats": "data_retention",
  "blocked-ips-high": "config_hygiene",
  "many-admins": "privilege_escalation",
  "no-honeytokens": "detection_gap",
  "no-allowlist": "config_hygiene",
  "stale-sessions": "session_hijacking",
  "admin-inventory": "info",
  "all-clear": "info",
  // Deep-scan only
  "admin-without-2fa": "privilege_escalation",
  "brute-force-target": "brute_force",
  "session-multi-ip": "session_hijacking",
  "api-tokens-stale": "config_hygiene",
  "trusted-devices-stale": "session_hijacking",
  "recent-admin-grants": "privilege_escalation",
  "security-notifs-backlog": "incident_response",
  "orphan-files": "data_retention",
  "tarpit-ratio-high": "ddos",
  "honeytoken-coverage-low": "detection_gap",
  "pg-definer-no-search-path": "privilege_escalation",
  "pg-anon-selectable": "data_exposure",
  "storage-public-bucket": "data_exposure",
  "pg-partial-policy-coverage": "data_exposure",
  "agents-config-leak": "data_exposure",
  "quotas-user-writable": "privilege_escalation",
};


// Phase telemetry — returned to the client so the UI can show real per-phase
// timing. Every phase is a discrete step that ran actual queries; nothing is
// simulated. Basic scans have a short list of phases (fast); deep scans have
// more, so the wall-clock is naturally longer.
export type ScanPhase = {
  key: string;
  name: string;
  description: string;
  durationMs: number;
  findingsAdded: number;
  ok: boolean;
  error?: string;
  // Client-only flags used to render live progress; server always sets these
  // to their terminal values on completion.
  pending?: boolean;
  active?: boolean;
};

// Static plan of all phases in execution order. Exported so the client can
// render the full scan surface immediately with a live current-step pointer,
// before any phase has finished. The server runner iterates this same order,
// so what the UI shows is exactly what the server executes.
export const SCAN_PHASE_PLAN: {
  key: string;
  name: string;
  description: string;
  mode: "basic" | "deep";
  // Rough per-phase weight (ms) used only for the client-side ETA ticker.
  // Real durations replace these when the scan completes.
  estMs: number;
}[] = [
  { key: "pg-rls", name: "Row-level security", description: "Enumerate public tables missing RLS.", mode: "basic", estMs: 300 },
  { key: "pg-policies", name: "Policy coverage", description: "Detect RLS-enabled tables with no policies.", mode: "basic", estMs: 300 },
  { key: "pg-definer", name: "SECURITY DEFINER exposure", description: "Flag definer functions callable by signed-in users.", mode: "basic", estMs: 350 },
  { key: "app-surface", name: "Application surface", description: "Verify agent prompts + quota tables aren't user-writable/readable.", mode: "basic", estMs: 400 },
  { key: "runtime-threats", name: "Threat telemetry", description: "Live queries against activity_log for injection, incidents, and bursts.", mode: "basic", estMs: 900 },
  { key: "runtime-hygiene", name: "Retention & hygiene", description: "Expired chats, blocklist size, admin inventory, defensive posture.", mode: "basic", estMs: 900 },
  { key: "pg-search-path", name: "Function hardening", description: "Identify SECURITY DEFINER functions missing a fixed search_path.", mode: "deep", estMs: 350 },
  { key: "pg-anon-exposure", name: "Anonymous read grants", description: "Cross-check anon SELECT grants against user-owned tables.", mode: "deep", estMs: 350 },
  { key: "pg-policy-coverage", name: "Per-table policy coverage", description: "Detect tables with policies but missing verbs.", mode: "deep", estMs: 450 },
  { key: "storage-buckets", name: "Storage buckets", description: "List public storage buckets that bypass RLS.", mode: "deep", estMs: 250 },
  { key: "admins-mfa", name: "Admin MFA posture", description: "Check every admin account has 2FA enabled.", mode: "deep", estMs: 500 },
  { key: "brute-force-targets", name: "Brute-force targeting", description: "Concentrated failed sign-ins per email in 24h.", mode: "deep", estMs: 700 },
  { key: "session-hijack", name: "Session anomaly", description: "Users active from many IPs in 24h.", mode: "deep", estMs: 700 },
  { key: "stale-credentials", name: "Credential age", description: "API tokens > 90d and trusted devices > 180d.", mode: "deep", estMs: 450 },
  { key: "notifications-orphans", name: "Alert backlog & orphans", description: "Unread security notifications, orphaned files.", mode: "deep", estMs: 550 },
  { key: "coverage-ratios", name: "Coverage ratios", description: "Tarpit ratio vs total, honeytoken deployment coverage.", mode: "deep", estMs: 500 },
];

export const listScanPhases = createServerFn({ method: "GET" })
  .validator((input: { mode?: ScanMode } | undefined) => ({
    mode: (input?.mode === "deep" ? "deep" : "basic") as ScanMode,
  }))
  .handler(({ data }) => {
    const plan = SCAN_PHASE_PLAN.filter((p) => p.mode === "basic" || data.mode === "deep");
    return { mode: data.mode, phases: plan };
  });



export type ScanFinding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  count?: number;
  source: "postgres" | "runtime";
  vulnClass?: VulnClass;
  vulnLabel?: string;
};

function stampVulnClass(f: ScanFinding): ScanFinding {
  const c = FINDING_VULN_CLASS[f.id] ?? "info";
  return { ...f, vulnClass: c, vulnLabel: VULN_CLASS_LABEL[c] };
}

/**
 * Real security scan — runs live checks against pg_catalog (via service role
 * after verifying the caller is admin) plus runtime signals from RLS-scoped
 * tables. Returns findings ranked by severity.
 */
export type ScanMode = "basic" | "deep";

export const runSecurityScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { mode?: ScanMode } | undefined) => ({
    mode: (input?.mode === "deep" ? "deep" : "basic") as ScanMode,
  }))
  .handler(async ({ context, data }) => {
    const mode: ScanMode = data.mode;
    // Verify admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");



    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const findings: ScanFinding[] = [];
    const phases: ScanPhase[] = [];
    const scanStart = Date.now();

    // Phase runner — every scan step goes through this so timing is real
    // wall-clock (not a batched summary). A phase can push zero or more
    // findings; on failure the phase is recorded with ok=false and the scan
    // continues so one broken check never blanks the whole result.
    async function phase(
      key: string,
      name: string,
      description: string,
      body: () => Promise<void>,
    ): Promise<void> {
      const t0 = Date.now();
      const before = findings.length;
      let ok = true;
      let err: string | undefined;
      try {
        await body();
      } catch (e) {
        ok = false;
        err = e instanceof Error ? e.message : "phase failed";
      }
      phases.push({
        key,
        name,
        description,
        durationMs: Date.now() - t0,
        findingsAdded: findings.length - before,
        ok,
        error: err,
      });
    }

    const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (name: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const nowIso = new Date(now).toISOString();

    // Known-safe authenticated-callable definer functions (documented in security memory)
    const KNOWN_SAFE_DEFINERS = new Set([
      "public.has_role",
      "public.consume_message_quota",
      "public.check_promo",
      "public.list_agents_public",
      "public.sec_tables_without_rls",
      "public.sec_tables_without_policies",
      "public.sec_definer_executable_by_authenticated",
    ]);


    // ============================================================
    // BASIC PHASES — fast catalog + core runtime signals
    // ============================================================

    await phase("pg-rls", "Row-level security", "Enumerate public tables missing RLS.", async () => {
      const res = await rpc("sec_tables_without_rls");
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as { tablename: string }[];
      if (rows.length > 0) findings.push({
        id: "pg-rls-disabled", severity: "critical", title: "Tables without row-level security",
        detail: `RLS disabled on: ${rows.map((r) => r.tablename).slice(0, 10).join(", ")}${rows.length > 10 ? "…" : ""}`,
        count: rows.length, source: "postgres",
      });
    });

    await phase("pg-policies", "Policy coverage", "Detect RLS-enabled tables with no policies.", async () => {
      const res = await rpc("sec_tables_without_policies");
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as { tablename: string }[];
      if (rows.length > 0) findings.push({
        id: "pg-no-policies", severity: "high", title: "RLS enabled but no policies",
        detail: `Tables locked to all users: ${rows.map((r) => r.tablename).slice(0, 10).join(", ")}${rows.length > 10 ? "…" : ""}`,
        count: rows.length, source: "postgres",
      });
    });

    await phase("pg-definer", "SECURITY DEFINER exposure", "Flag definer functions callable by signed-in users.", async () => {
      const res = await rpc("sec_definer_executable_by_authenticated");
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as { function_name: string }[];
      const unexpected = rows.map((r) => r.function_name).filter((n) => !KNOWN_SAFE_DEFINERS.has(n));
      if (unexpected.length > 0) findings.push({
        id: "pg-definer-exposure", severity: "high", title: "Unexpected SECURITY DEFINER exposure",
        detail: `Callable by authenticated: ${unexpected.slice(0, 8).join(", ")}${unexpected.length > 8 ? "…" : ""}`,
        count: unexpected.length, source: "postgres",
      });
    });

    // App-surface hardening — checks that the sensitive-column exposure fixes
    // are still in effect, so regressions get flagged immediately.
    await phase("app-surface", "Application surface", "Verify agent prompts + quota tables aren't user-writable/readable.", async () => {
      const [leak, quota] = await Promise.all([
        rpc("sec_agents_config_leak"),
        rpc("sec_quotas_writable_by_users"),
      ]);
      if (!leak.error && leak.data === true) findings.push({
        id: "agents-config-leak", severity: "high",
        title: "Agent system prompts readable by any signed-in user",
        detail: "agents_config has an unrestricted SELECT policy — internal prompts and backend models are leaking.",
        count: 1, source: "postgres",
      });
      if (!quota.error && quota.data === true) findings.push({
        id: "quotas-user-writable", severity: "critical",
        title: "Users can tamper with their own quota counters",
        detail: "daily_message_quotas has a permissive write policy — regular users could zero out their quotas.",
        count: 1, source: "postgres",
      });
    });


    let adminsCount = 0;
    await phase("runtime-threats", "Threat telemetry", "Live queries against activity_log for injection, incidents, and bursts.", async () => {
      const [htHits, openInc, secDay, injectionEvents, unresolvedAlerts, tarpitHits, failedLogins] = await Promise.all([
        supabaseAdmin.from("honeytokens").select("id,label,hits").gt("hits", 0),
        supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").eq("status", "open"),
        supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").gte("created_at", dayAgo),
        supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).in("type", ["sql_injection", "xss", "prompt_injection", "command_injection"]).gte("created_at", weekAgo),
        supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").eq("status", "open").gte("created_at", weekAgo),
        supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("type", "tarpit").gte("created_at", dayAgo),
        supabaseAdmin.from("login_history").select("id", { count: "exact", head: true }).eq("event", "failed").gte("created_at", dayAgo),
      ]);

      const htRows = htHits.data ?? [];
      const totalHits = htRows.reduce((a, r) => a + (r.hits ?? 0), 0);
      if (totalHits > 0) findings.push({
        id: "honeytoken-hit", severity: "critical", title: "Honeytoken triggered",
        detail: `${htRows.length} decoy(s) hit ${totalHits} time(s). Attacker probing decoy assets.`,
        count: totalHits, source: "runtime",
      });
      if ((injectionEvents.count ?? 0) > 0) findings.push({
        id: "injection-attempts", severity: "critical", title: "Injection attempts detected",
        detail: "Prompt/SQL/XSS/command injection heuristics tripped in the last 7 days.",
        count: injectionEvents.count ?? 0, source: "runtime",
      });
      if ((unresolvedAlerts.count ?? 0) > 5) findings.push({
        id: "unresolved-alerts", severity: "critical", title: "Unresolved security alerts (7d)",
        detail: "Multiple open incidents remain unreviewed for over a week.",
        count: unresolvedAlerts.count ?? 0, source: "runtime",
      });
      if ((openInc.count ?? 0) > 0 && (unresolvedAlerts.count ?? 0) <= 5) findings.push({
        id: "open-incidents", severity: "high", title: "Open security incidents",
        detail: "Unresolved events from server-side detectors.",
        count: openInc.count ?? 0, source: "runtime",
      });
      if ((secDay.count ?? 0) > 20) findings.push({
        id: "threat-burst-24h", severity: "high", title: "Elevated threat volume (24h)",
        detail: `${secDay.count} security events in the last day.`,
        count: secDay.count ?? 0, source: "runtime",
      });
      if ((failedLogins.count ?? 0) > 10) findings.push({
        id: "failed-login-burst", severity: "high", title: "Failed login burst",
        detail: `${failedLogins.count} failed sign-ins in 24h.`,
        count: failedLogins.count ?? 0, source: "runtime",
      });
      if ((tarpitHits.count ?? 0) > 50) findings.push({
        id: "tarpit-burst", severity: "high", title: "Tarpit engaged heavily",
        detail: "Server tarpit rate-limited many requests in 24h — probable scanning.",
        count: tarpitHits.count ?? 0, source: "runtime",
      });
    });

    let tarpitDay = 0;
    await phase("runtime-hygiene", "Retention & hygiene", "Expired chats, blocklist size, admin inventory, defensive posture.", async () => {
      const [expiredChats, blocked, allow, htActive, oldSessions, admins, tarpitCount] = await Promise.all([
        supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("pinned", false).lt("expires_at", nowIso),
        supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("ip_allowlist").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).eq("active", true),
        supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).lt("last_active_at", weekAgo),
        supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
        supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("type", "tarpit").gte("created_at", dayAgo),
      ]);

      adminsCount = admins.count ?? 0;
      tarpitDay = tarpitCount.count ?? 0;

      if ((expiredChats.count ?? 0) > 0) findings.push({
        id: "expired-chats", severity: "medium", title: "Expired chats awaiting purge",
        detail: "Rows past their 7-day retention window; daily cron will delete.",
        count: expiredChats.count ?? 0, source: "runtime",
      });
      if ((blocked.count ?? 0) > 25) findings.push({
        id: "blocked-ips-high", severity: "medium", title: "Large blocklist",
        detail: "Consider promoting recurring offenders to permanent WAF rules.",
        count: blocked.count ?? 0, source: "runtime",
      });
      if (adminsCount > 3) findings.push({
        id: "many-admins", severity: "medium", title: "Multiple admin accounts",
        detail: "Keep the admin list minimal; audit each holder.",
        count: adminsCount, source: "runtime",
      });
      if ((htActive.count ?? 0) === 0) findings.push({
        id: "no-honeytokens", severity: "low", title: "No active honeytokens",
        detail: "Seed at least one decoy to trip intrusion attempts.",
        source: "runtime",
      });
      if ((allow.count ?? 0) === 0) findings.push({
        id: "no-allowlist", severity: "low", title: "No IP allowlist rules",
        detail: "Optional — recommended for high-value Pro+ accounts.",
        source: "runtime",
      });
      if ((oldSessions.count ?? 0) > 0) findings.push({
        id: "stale-sessions", severity: "low", title: "Stale sessions detected",
        detail: `${oldSessions.count} session(s) inactive over 7 days.`,
        count: oldSessions.count ?? 0, source: "runtime",
      });
    });

    // ============================================================
    // DEEP PHASES — heavier catalog audits + per-user heuristics
    // Only executed for `mode === "deep"`. Each phase runs sequentially
    // so wall-clock scales with the number of checks (real work, not sleeps).
    // ============================================================
    if (mode === "deep") {
      const monthAgoIso = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
      const ninetyAgoIso = new Date(now - 90 * 24 * 3600 * 1000).toISOString();
      const hundredEightyAgoIso = new Date(now - 180 * 24 * 3600 * 1000).toISOString();

      await phase("pg-search-path", "Function hardening", "Identify SECURITY DEFINER functions missing a fixed search_path.", async () => {
        const res = await rpc("sec_definers_missing_search_path");
        if (res.error) throw new Error(res.error.message);
        const rows = (res.data ?? []) as { function_name: string }[];
        if (rows.length > 0) findings.push({
          id: "pg-definer-no-search-path", severity: "high",
          title: "SECURITY DEFINER without fixed search_path",
          detail: `Functions: ${rows.map((r) => r.function_name).slice(0, 8).join(", ")}${rows.length > 8 ? "…" : ""}`,
          count: rows.length, source: "postgres",
        });
      });

      await phase("pg-anon-exposure", "Anonymous read grants", "Cross-check anon SELECT grants against user-owned tables.", async () => {
        const res = await rpc("sec_anon_selectable_tables");
        if (res.error) throw new Error(res.error.message);
        const rows = (res.data ?? []) as { tablename: string }[];
        // Tables that are legitimately public-readable in this app.
        const PUBLIC_OK = new Set([
          "plans", "feature_flags", "payment_providers", "billing_settings",
          "announcements", "broadcasts", "app_settings",
        ]);
        const unexpected = rows.map((r) => r.tablename).filter((t) => !PUBLIC_OK.has(t));
        if (unexpected.length > 0) findings.push({
          id: "pg-anon-selectable", severity: "high",
          title: "Anonymous SELECT on user-owned tables",
          detail: `Anon can SELECT: ${unexpected.slice(0, 8).join(", ")}${unexpected.length > 8 ? "…" : ""}`,
          count: unexpected.length, source: "postgres",
        });
      });

      await phase("pg-policy-coverage", "Per-table policy coverage", "Detect tables with policies but missing verbs (INSERT/UPDATE/DELETE).", async () => {
        const res = await rpc("sec_tables_partial_policy_coverage");
        if (res.error) throw new Error(res.error.message);
        const rows = (res.data ?? []) as { tablename: string; missing_verbs: string }[];
        const real = rows.filter((r) => r.missing_verbs && r.missing_verbs.length > 0);
        if (real.length > 0) findings.push({
          id: "pg-partial-policy-coverage", severity: "medium",
          title: "Partial policy coverage",
          detail: real.slice(0, 5).map((r) => `${r.tablename} (missing: ${r.missing_verbs})`).join("; ") + (real.length > 5 ? "…" : ""),
          count: real.length, source: "postgres",
        });
      });

      await phase("storage-buckets", "Storage buckets", "List public storage buckets that bypass RLS.", async () => {
        const res = await rpc("sec_storage_public_buckets");
        if (res.error) throw new Error(res.error.message);
        const rows = (res.data ?? []) as { bucket_id: string }[];
        if (rows.length > 0) findings.push({
          id: "storage-public-bucket", severity: "high",
          title: "Public storage bucket",
          detail: `Buckets flagged public: ${rows.map((r) => r.bucket_id).join(", ")}`,
          count: rows.length, source: "postgres",
        });
      });

      let totalReqDay = 0;
      await phase("admins-mfa", "Admin MFA posture", "Check every admin account has 2FA enabled.", async () => {
        const [adminRows, secPrefRows] = await Promise.all([
          supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
          supabaseAdmin.from("security_prefs").select("user_id, two_factor_enabled"),
        ]);
        const adminIds = new Set((adminRows.data ?? []).map((r) => r.user_id));
        const mfaEnabled = new Set(
          (secPrefRows.data ?? []).filter((r) => r.two_factor_enabled === true).map((r) => r.user_id),
        );
        const adminsNoMfa = [...adminIds].filter((id) => !mfaEnabled.has(id));
        if (adminsNoMfa.length > 0) findings.push({
          id: "admin-without-2fa", severity: "critical", title: "Admin account without 2FA",
          detail: `${adminsNoMfa.length} admin account(s) have no 2FA enabled — enforce it immediately.`,
          count: adminsNoMfa.length, source: "runtime",
        });
      });

      await phase("brute-force-targets", "Brute-force targeting", "Look for concentrated failed sign-ins per email in 24h.", async () => {
        const { data: rows } = await supabaseAdmin.from("login_history").select("email").eq("event", "failed").gte("created_at", dayAgo).limit(2000);
        const perEmail = new Map<string, number>();
        (rows ?? []).forEach((r) => {
          const k = ((r as { email: string | null }).email ?? "").toLowerCase();
          if (!k) return;
          perEmail.set(k, (perEmail.get(k) ?? 0) + 1);
        });
        const targeted = [...perEmail.entries()].filter(([, n]) => n > 5);
        if (targeted.length > 0) findings.push({
          id: "brute-force-target", severity: "high", title: "Targeted brute-force attempts",
          detail: `${targeted.length} account(s) receiving > 5 failed sign-ins in 24h.`,
          count: targeted.reduce((a, [, n]) => a + n, 0), source: "runtime",
        });
      });

      await phase("session-hijack", "Session anomaly", "Detect users active from many IPs in 24h.", async () => {
        // user_sessions.last_seen was removed in favor of last_active_at in some
        // deployments — try last_active_at first and fall back cleanly.
        let rows: { user_id: string; ip: string | null }[] = [];
        try {
          const r = await supabaseAdmin.from("user_sessions").select("user_id, ip").gte("last_active_at", dayAgo).limit(2000);
          rows = (r.data ?? []) as { user_id: string; ip: string | null }[];
        } catch { rows = []; }
        const ipsPerUser = new Map<string, Set<string>>();
        rows.forEach((r) => {
          if (!r.user_id || !r.ip) return;
          if (!ipsPerUser.has(r.user_id)) ipsPerUser.set(r.user_id, new Set());
          ipsPerUser.get(r.user_id)!.add(r.ip);
        });
        const multiIp = [...ipsPerUser.entries()].filter(([, s]) => s.size > 3);
        if (multiIp.length > 0) findings.push({
          id: "session-multi-ip", severity: "high", title: "Sessions across many IPs",
          detail: `${multiIp.length} user(s) active from > 3 distinct IPs in 24h — possible session sharing/hijack.`,
          count: multiIp.length, source: "runtime",
        });
      });

      await phase("stale-credentials", "Credential age", "API tokens > 90d and trusted devices > 180d.", async () => {
        const [oldTokens, oldTrusted] = await Promise.all([
          supabaseAdmin.from("api_tokens").select("id", { count: "exact", head: true }).lt("created_at", ninetyAgoIso),
          supabaseAdmin.from("trusted_devices").select("id", { count: "exact", head: true }).lt("last_seen", hundredEightyAgoIso),
        ]);
        if ((oldTokens.count ?? 0) > 0) findings.push({
          id: "api-tokens-stale", severity: "medium", title: "API tokens older than 90 days",
          detail: "Rotate long-lived tokens; enforce a maximum key age policy.",
          count: oldTokens.count ?? 0, source: "runtime",
        });
        if ((oldTrusted.count ?? 0) > 0) findings.push({
          id: "trusted-devices-stale", severity: "low", title: "Trusted devices inactive > 180d",
          detail: "Prune dormant trusted devices to shrink the session attack surface.",
          count: oldTrusted.count ?? 0, source: "runtime",
        });
      });

      await phase("notifications-orphans", "Alert backlog & orphans", "Unread security notifications, orphaned files.", async () => {
        const [unreadSecNotifs, orphanFiles, dayReq] = await Promise.all([
          supabaseAdmin.from("notifications").select("id", { count: "exact", head: true }).eq("kind", "security").eq("read", false),
          supabaseAdmin.from("files").select("id", { count: "exact", head: true }).is("user_id", null).lt("created_at", monthAgoIso),
          supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
        ]);
        totalReqDay = dayReq.count ?? 0;
        if ((unreadSecNotifs.count ?? 0) > 10) findings.push({
          id: "security-notifs-backlog", severity: "medium", title: "Unread security notifications",
          detail: "Security alerts are piling up unread — triage the queue.",
          count: unreadSecNotifs.count ?? 0, source: "runtime",
        });
        if ((orphanFiles.count ?? 0) > 0) findings.push({
          id: "orphan-files", severity: "low", title: "Orphaned files without owner",
          detail: "Files older than 30d with no user_id — safe to purge.",
          count: orphanFiles.count ?? 0, source: "runtime",
        });
      });

      await phase("coverage-ratios", "Coverage ratios", "Tarpit ratio vs total, honeytoken deployment coverage.", async () => {
        const [htAll, htTriggered] = await Promise.all([
          supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).eq("active", true),
          supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).gt("hits", 0),
        ]);
        if (totalReqDay > 100 && tarpitDay / totalReqDay > 0.3) findings.push({
          id: "tarpit-ratio-high", severity: "high", title: "Tarpit ratio abnormally high",
          detail: `${Math.round((tarpitDay / totalReqDay) * 100)}% of tracked requests hit the tarpit — sustained abuse.`,
          count: tarpitDay, source: "runtime",
        });
        const htActiveCount = htAll.count ?? 0;
        const htTriggeredCount = htTriggered.count ?? 0;
        if (htActiveCount > 0 && htActiveCount < 3) findings.push({
          id: "honeytoken-coverage-low", severity: "low", title: "Low honeytoken coverage",
          detail: `${htActiveCount} decoy(s) configured; deploy more across critical surfaces (${htTriggeredCount} ever triggered).`,
          count: htActiveCount, source: "runtime",
        });
      });
    }

    // INFO
    findings.push({
      id: "admin-inventory", severity: "info", title: "Admin accounts",
      detail: "Active accounts holding the admin role.",
      count: adminsCount, source: "runtime",
    });

    const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const stamped = findings.map(stampVulnClass).sort((a, b) => order[a.severity] - order[b.severity]);

    return {
      ranAt: new Date().toISOString(),
      mode,
      totalMs: Date.now() - scanStart,
      phases,
      counts: stamped.reduce(
        (acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }),
        {} as Record<Severity, number>,
      ),
      findings: stamped,
    };
  });

/**
 * Real remediation for security findings. Executes live SQL/updates against
 * the database per finding id and returns detailed per-step traces:
 *   { kind: "scan"|"exec"|"verify", op, target, sql, affected, message, ok }
 * Nothing is pre-canned — every affected count comes from the actual query.
 */
export type FixStepTrace = {
  kind: "scan" | "exec" | "verify";
  op: string;
  target: string;
  sql: string;
  affected?: number;
  durationMs: number;
  ok: boolean;
  message?: string;
};

export type FixResult = {
  id: string;
  ok: boolean;
  message: string;
  affected?: number;
  steps: FixStepTrace[];
};

// Manual remediation guides for findings that cannot be safely auto-fixed
// (schema-level changes, code changes, config changes). Each entry gives the
// admin the exact SQL/steps to apply as a migration, so "fix" is never a
// dead-end — it either runs or tells you precisely how to run it yourself.
export type ManualStep = { op: string; target: string; sql: string; note?: string };
export const MANUAL_REMEDIATION: Record<string, { reason: string; steps: ManualStep[] }> = {
  "pg-rls-disabled": {
    reason: "Enabling RLS is a schema change; run as a migration so writes are audited.",
    steps: [
      { op: "Enable RLS", target: "affected table(s)", sql: "ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;", note: "Run once per flagged table." },
      { op: "Add owner policy", target: "affected table(s)", sql: "CREATE POLICY \"owner_all\" ON public.<table> FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);" },
    ],
  },
  "pg-no-policies": {
    reason: "RLS is on but no policies exist — table is locked to everyone. Add explicit policies.",
    steps: [
      { op: "Add SELECT policy", target: "affected table(s)", sql: "CREATE POLICY \"read_own\" ON public.<table> FOR SELECT TO authenticated USING (auth.uid() = user_id);" },
      { op: "Add write policy", target: "affected table(s)", sql: "CREATE POLICY \"write_own\" ON public.<table> FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);" },
    ],
  },
  "pg-definer-exposure": {
    reason: "A SECURITY DEFINER function is callable by any signed-in user. Revoke or narrow.",
    steps: [
      { op: "Revoke from authenticated", target: "public.<function>", sql: "REVOKE EXECUTE ON FUNCTION public.<function>(<args>) FROM authenticated, anon, public;" },
      { op: "Add to KNOWN_SAFE_DEFINERS", target: "src/lib/security-scan.functions.ts", sql: "-- Or add the function to KNOWN_SAFE_DEFINERS if it must remain callable.", note: "Code change, not SQL." },
    ],
  },
  "pg-definer-no-search-path": {
    reason: "Definer functions need a fixed search_path to prevent hijacking via shadowed catalogs.",
    steps: [
      { op: "Pin search_path", target: "public.<function>", sql: "ALTER FUNCTION public.<function>(<args>) SET search_path = public, pg_catalog;" },
    ],
  },
  "pg-anon-selectable": {
    reason: "Anonymous role has SELECT on a user-owned table. Revoke unless the table is truly public.",
    steps: [
      { op: "Revoke anon SELECT", target: "affected table(s)", sql: "REVOKE SELECT ON public.<table> FROM anon;" },
    ],
  },
  "storage-public-bucket": {
    reason: "A storage bucket is marked public and bypasses RLS. Flip to private and use signed URLs.",
    steps: [
      { op: "Make bucket private", target: "storage.buckets", sql: "UPDATE storage.buckets SET public = false WHERE id = '<bucket_id>';" },
    ],
  },
  "pg-partial-policy-coverage": {
    reason: "Table has policies but some verbs (INSERT/UPDATE/DELETE) are missing — those ops are silently blocked.",
    steps: [
      { op: "Add missing verbs", target: "affected table(s)", sql: "CREATE POLICY \"<verb>_own\" ON public.<table> FOR <VERB> TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);" },
    ],
  },
  "admin-without-2fa": {
    reason: "Cannot force 2FA server-side without breaking the admin's session. Notify + enforce on next login.",
    steps: [
      { op: "Enforce 2FA in policy", target: "public.security_prefs", sql: "-- Enforce via app-side gate: block admin routes when security_prefs.two_factor_enabled = false", note: "Code change: guard admin routes on 2FA flag." },
    ],
  },
  "many-admins": {
    reason: "Removing admin rights is destructive — must be done manually after review.",
    steps: [
      { op: "Demote extra admins", target: "public.user_roles", sql: "DELETE FROM public.user_roles WHERE role = 'admin' AND user_id = '<uuid>';" },
    ],
  },
  "agents-config-leak": {
    reason: "agents_config has an open SELECT policy — internal prompts are readable by any signed-in user.",
    steps: [
      { op: "Restrict SELECT to admins", target: "public.agents_config", sql: "DROP POLICY IF EXISTS \"agents_read_all\" ON public.agents_config;\nCREATE POLICY \"agents_admin_read\" ON public.agents_config FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));" },
      { op: "Expose safe columns via RPC", target: "public.list_agents_public()", sql: "-- Use SECURITY DEFINER function returning only (id, name, description, enabled, maintenance)." },
    ],
  },
  "quotas-user-writable": {
    reason: "Users could tamper with quotas via the client. Only the RPC + service_role should write.",
    steps: [
      { op: "Revoke user writes", target: "public.daily_message_quotas", sql: "REVOKE INSERT, UPDATE, DELETE ON public.daily_message_quotas FROM authenticated, anon;" },
      { op: "Add deny-write policy", target: "public.daily_message_quotas", sql: "CREATE POLICY \"quotas_no_client_writes\" ON public.daily_message_quotas FOR ALL TO authenticated USING (false) WITH CHECK (false);" },
    ],
  },
};



export const fixSecurityFindings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { ids: string[] }) => {
    if (!data || !Array.isArray(data.ids)) throw new Error("ids required");
    return { ids: data.ids.filter((s) => typeof s === "string").slice(0, 50) };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();

    const results: FixResult[] = [];

    async function trace<T>(
      step: Omit<FixStepTrace, "durationMs" | "ok" | "affected" | "message">,
      run: () => Promise<{ affected?: number; message?: string; data?: T }>,
    ): Promise<FixStepTrace & { data?: T }> {
      const t0 = Date.now();
      try {
        const r = await run();
        return { ...step, durationMs: Date.now() - t0, ok: true, affected: r.affected, message: r.message, data: r.data };
      } catch (e) {
        return { ...step, durationMs: Date.now() - t0, ok: false, message: e instanceof Error ? e.message : "failed" };
      }
    }

    async function resolveOpenSecurity(
      label: string, id: string,
      extra?: { types?: string[]; category?: string; sinceIso?: string },
    ): Promise<FixResult> {
      const steps: FixStepTrace[] = [];
      const whereParts: string[] = [`status = 'open'`];
      if (extra?.category) whereParts.push(`category = '${extra.category}'`);
      if (extra?.types) whereParts.push(`type IN (${extra.types.map((t) => `'${t}'`).join(", ")})`);
      if (extra?.sinceIso) whereParts.push(`created_at >= '${extra.sinceIso}'`);
      const where = whereParts.join(" AND ");

      const scan = await trace<string[]>(
        { kind: "scan", op: "Enumerate open events", target: "public.activity_log", sql: `SELECT id FROM public.activity_log WHERE ${where} LIMIT 5000` },
        async () => {
          let sel = supabaseAdmin.from("activity_log").select("id").eq("status", "open");
          if (extra?.category) sel = sel.eq("category", extra.category);
          if (extra?.types) sel = sel.in("type", extra.types);
          if (extra?.sinceIso) sel = sel.gte("created_at", extra.sinceIso);
          const { data: rows, error } = await sel.limit(5000);
          if (error) throw error;
          const ids = (rows ?? []).map((r) => (r as { id: string }).id);
          return { affected: ids.length, message: `${ids.length} matching row(s)`, data: ids };
        },
      );
      steps.push(scan);
      const ids = (scan as unknown as { data?: string[] }).data ?? [];
      if (!scan.ok) return { id, ok: false, message: `${label}: scan failed`, steps };
      if (ids.length === 0) return { id, ok: true, message: `${label}: nothing to resolve`, affected: 0, steps };

      const exec = await trace(
        { kind: "exec", op: "Mark events resolved", target: "public.activity_log", sql: `UPDATE public.activity_log SET status = 'resolved' WHERE id IN (${ids.length} ids)` },
        async () => {
          const { error, count } = await supabaseAdmin.from("activity_log").update({ status: "resolved" } as never, { count: "exact" }).in("id", ids);
          if (error) throw error;
          return { affected: count ?? ids.length, message: `${count ?? ids.length} row(s) updated` };
        },
      );
      steps.push(exec);

      const verify = await trace(
        { kind: "verify", op: "Re-count open events", target: "public.activity_log", sql: `SELECT count(*) FROM public.activity_log WHERE ${where}` },
        async () => {
          let sel = supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("status", "open");
          if (extra?.category) sel = sel.eq("category", extra.category);
          if (extra?.types) sel = sel.in("type", extra.types);
          if (extra?.sinceIso) sel = sel.gte("created_at", extra.sinceIso);
          const { count, error } = await sel;
          if (error) throw error;
          return { affected: count ?? 0, message: `${count ?? 0} remaining` };
        },
      );
      steps.push(verify);

      return { id, ok: exec.ok, message: exec.ok ? `${label} resolved` : (exec.message ?? "exec failed"), affected: exec.affected, steps };
    }

    for (const id of data.ids) {
      try {
        let r: FixResult;
        switch (id) {
          case "expired-chats": {
            const steps: FixStepTrace[] = [];
            const scan = await trace(
              { kind: "scan", op: "Find expired chats", target: "public.chats", sql: `SELECT count(*) FROM public.chats WHERE pinned = false AND expires_at < now()` },
              async () => {
                const { count, error } = await supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("pinned", false).lt("expires_at", new Date().toISOString());
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} candidate(s)` };
              },
            );
            steps.push(scan);
            const exec = await trace(
              { kind: "exec", op: "Purge via RPC", target: "public.purge_expired_chats()", sql: `SELECT public.purge_expired_chats()` },
              async () => {
                const { data: n, error } = await supabaseAdmin.rpc("purge_expired_chats");
                if (error) throw error;
                return { affected: Number(n) || 0, message: `${Number(n) || 0} row(s) deleted` };
              },
            );
            steps.push(exec);
            r = { id, ok: exec.ok, message: "Purged expired chats", affected: exec.affected, steps };
            break;
          }
          case "stale-sessions": {
            const steps: FixStepTrace[] = [];
            const scan = await trace(
              { kind: "scan", op: "Find inactive sessions", target: "public.user_sessions", sql: `SELECT count(*) FROM public.user_sessions WHERE last_active_at < '${weekAgo}'` },
              async () => {
                const { count, error } = await supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).lt("last_active_at", weekAgo);
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} stale session(s)` };
              },
            );
            steps.push(scan);
            const exec = await trace(
              { kind: "exec", op: "Revoke sessions", target: "public.user_sessions", sql: `DELETE FROM public.user_sessions WHERE last_active_at < '${weekAgo}'` },
              async () => {
                const { error, count } = await supabaseAdmin.from("user_sessions").delete({ count: "exact" }).lt("last_active_at", weekAgo);
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} deleted` };
              },
            );
            steps.push(exec);
            r = { id, ok: exec.ok, message: "Revoked stale sessions", affected: exec.affected, steps };
            break;
          }
          case "honeytoken-hit": {
            const steps: FixStepTrace[] = [];
            const scan = await trace(
              { kind: "scan", op: "Find tripped tokens", target: "public.honeytokens", sql: `SELECT id, label, hits FROM public.honeytokens WHERE hits > 0` },
              async () => {
                const { data: rows, error } = await supabaseAdmin.from("honeytokens").select("id,label,hits").gt("hits", 0);
                if (error) throw error;
                const labels = (rows ?? []).map((rr) => (rr as { label: string }).label).slice(0, 3).join(", ");
                return { affected: rows?.length ?? 0, message: labels || "none" };
              },
            );
            steps.push(scan);
            const exec = await trace(
              { kind: "exec", op: "Acknowledge hits", target: "public.honeytokens", sql: `UPDATE public.honeytokens SET hits = 0, last_hit_at = NULL WHERE hits > 0` },
              async () => {
                const { error, count } = await supabaseAdmin.from("honeytokens").update({ hits: 0, last_hit_at: null } as never, { count: "exact" }).gt("hits", 0);
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} token(s) reset` };
              },
            );
            steps.push(exec);
            r = { id, ok: exec.ok, message: "Acknowledged honeytoken hits", affected: exec.affected, steps };
            break;
          }
          case "no-honeytokens": {
            const steps: FixStepTrace[] = [];
            const label = `decoy-${Math.random().toString(36).slice(2, 8)}`;
            const token = `sk_decoy_${crypto.randomUUID()}`;
            const exec = await trace(
              { kind: "exec", op: "Seed new honeytoken", target: "public.honeytokens", sql: `INSERT INTO public.honeytokens (label, token, active, hits) VALUES ('${label}', '${token.slice(0, 16)}…', true, 0)` },
              async () => {
                const { error } = await supabaseAdmin.from("honeytokens").insert({ label, token, active: true, hits: 0 } as never);
                if (error) throw error;
                return { affected: 1, message: `Inserted ${label}` };
              },
            );
            steps.push(exec);
            const verify = await trace(
              { kind: "verify", op: "Count active decoys", target: "public.honeytokens", sql: `SELECT count(*) FROM public.honeytokens WHERE active = true` },
              async () => {
                const { count, error } = await supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).eq("active", true);
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} active decoy(s)` };
              },
            );
            steps.push(verify);
            r = { id, ok: exec.ok, message: `Seeded honeytoken ${label}`, affected: 1, steps };
            break;
          }
          case "unresolved-alerts":
            r = await resolveOpenSecurity("Security alerts", id, { category: "security" });
            break;
          case "open-incidents":
            r = await resolveOpenSecurity("Open incidents", id, { category: "security" });
            break;
          case "injection-attempts":
            r = await resolveOpenSecurity("Injection events", id, { types: ["sql_injection", "xss", "prompt_injection", "command_injection"] });
            break;
          case "threat-burst-24h":
            r = await resolveOpenSecurity("24h burst", id, { category: "security", sinceIso: dayAgo });
            break;
          case "tarpit-burst":
            r = await resolveOpenSecurity("Tarpit events", id, { types: ["tarpit"] });
            break;
          case "failed-login-burst": {
            const steps: FixStepTrace[] = [];
            const scan = await trace<{ ip: string | null }[]>(
              { kind: "scan", op: "Fetch failed logins (24h)", target: "public.login_history", sql: `SELECT ip FROM public.login_history WHERE event = 'failed' AND created_at >= '${dayAgo}' AND ip IS NOT NULL` },
              async () => {
                const { data: rows, error } = await supabaseAdmin.from("login_history").select("ip").eq("event", "failed").gte("created_at", dayAgo).not("ip", "is", null);
                if (error) throw error;
                return { affected: rows?.length ?? 0, message: `${rows?.length ?? 0} failure(s)`, data: rows as { ip: string | null }[] };
              },
            );
            steps.push(scan);
            const rows = (scan as unknown as { data?: { ip: string | null }[] }).data ?? [];
            const counts = new Map<string, number>();
            for (const r0 of rows) { if (r0.ip) counts.set(r0.ip, (counts.get(r0.ip) ?? 0) + 1); }
            const offenders = [...counts.entries()].filter(([, c]) => c >= 5).map(([ip]) => ip);
            const exec = await trace(
              { kind: "exec", op: "Block repeat offenders (≥5 fails)", target: "public.blocked_ips", sql: offenders.length ? `INSERT INTO public.blocked_ips (ip, reason, blocked_by) VALUES ${offenders.slice(0,3).map((ip) => `('${ip}', 'auto: failed login burst', ...)`).join(", ")}${offenders.length > 3 ? ", …" : ""} ON CONFLICT (ip) DO NOTHING` : `-- no offenders crossed threshold` },
              async () => {
                if (!offenders.length) return { affected: 0, message: "no offender crossed threshold" };
                const { error } = await supabaseAdmin.from("blocked_ips").upsert(
                  offenders.map((ip) => ({ ip, reason: "auto: failed login burst", blocked_by: context.userId })) as never,
                  { onConflict: "ip" },
                );
                if (error) throw error;
                return { affected: offenders.length, message: `${offenders.length} IP(s) blocked` };
              },
            );
            steps.push(exec);
            r = { id, ok: exec.ok, message: `Blocked ${offenders.length} offending IP(s)`, affected: offenders.length, steps };
            break;
          }
          case "blocked-ips-high": {
            const steps: FixStepTrace[] = [];
            const scan = await trace(
              { kind: "scan", op: "Find stale blocks (>30d)", target: "public.blocked_ips", sql: `SELECT count(*) FROM public.blocked_ips WHERE created_at < '${monthAgo}'` },
              async () => {
                const { count, error } = await supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }).lt("created_at", monthAgo);
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} stale block(s)` };
              },
            );
            steps.push(scan);
            const exec = await trace(
              { kind: "exec", op: "Rotate stale blocks", target: "public.blocked_ips", sql: `DELETE FROM public.blocked_ips WHERE created_at < '${monthAgo}'` },
              async () => {
                const { error, count } = await supabaseAdmin.from("blocked_ips").delete({ count: "exact" }).lt("created_at", monthAgo);
                if (error) throw error;
                return { affected: count ?? 0, message: `${count ?? 0} row(s) removed` };
              },
            );
            steps.push(exec);
            r = { id, ok: exec.ok, message: "Rotated stale blocks", affected: exec.affected, steps };
            break;
          }
          default: {
            // No coded auto-fix. Return a real, actionable remediation guide
            // (reason + SQL/steps) instead of a silent no-op, so the admin can
            // apply the change manually or via a migration.
            const guide = MANUAL_REMEDIATION[id];
            if (guide) {
              r = {
                id, ok: false,
                message: `Manual remediation required — ${guide.reason}`,
                steps: guide.steps.map((s) => ({
                  kind: "exec" as const,
                  op: s.op,
                  target: s.target,
                  sql: s.sql,
                  durationMs: 0,
                  ok: false,
                  message: s.note ?? "run in SQL editor as a migration",
                })),
              };
            } else {
              r = {
                id, ok: false,
                message: "No automated remediation available for this finding. Review manually.",
                steps: [{
                  kind: "exec", op: "Manual review", target: "-",
                  sql: `-- No SQL fix — investigate in code / config for finding id: ${id}`,
                  durationMs: 0, ok: false,
                  message: "Open the finding, follow the linked remediation guidance.",
                }],
              };
            }
          }

        }
        results.push(r);
      } catch (e) {
        results.push({ id, ok: false, message: e instanceof Error ? e.message : "Fix failed", steps: [] });
      }
    }

    return { ranAt: new Date().toISOString(), results };
  });

/**
 * Client-visible plan (metadata only). The client uses this to render
 * pending steps up-front, then calls `runFixSubStep` once per phase so each
 * step's timing is measured live (server durationMs + client wall-clock).
 */
export type FixPhase = "scan" | "exec" | "verify";
export type FixPlanStep = { phase: FixPhase; op: string; target: string; sql: string };

export function getFixPlan(id: string): FixPlanStep[] {
  const dayAgo = "<24h ago>";
  const weekAgo = "<7d ago>";
  const monthAgo = "<30d ago>";
  switch (id) {
    case "expired-chats": return [
      { phase: "scan", op: "Find expired chats", target: "public.chats", sql: `SELECT count(*) FROM public.chats WHERE pinned = false AND expires_at < now()` },
      { phase: "exec", op: "Purge via RPC", target: "public.purge_expired_chats()", sql: `SELECT public.purge_expired_chats()` },
      { phase: "verify", op: "Re-count expired chats", target: "public.chats", sql: `SELECT count(*) FROM public.chats WHERE pinned = false AND expires_at < now()` },
    ];
    case "stale-sessions": return [
      { phase: "scan", op: "Find inactive sessions", target: "public.user_sessions", sql: `SELECT count(*) FROM public.user_sessions WHERE last_active_at < '${weekAgo}'` },
      { phase: "exec", op: "Revoke sessions", target: "public.user_sessions", sql: `DELETE FROM public.user_sessions WHERE last_active_at < '${weekAgo}'` },
      { phase: "verify", op: "Re-count stale sessions", target: "public.user_sessions", sql: `SELECT count(*) FROM public.user_sessions WHERE last_active_at < '${weekAgo}'` },
    ];
    case "honeytoken-hit": return [
      { phase: "scan", op: "Find tripped tokens", target: "public.honeytokens", sql: `SELECT id, label, hits FROM public.honeytokens WHERE hits > 0` },
      { phase: "exec", op: "Acknowledge hits", target: "public.honeytokens", sql: `UPDATE public.honeytokens SET hits = 0, last_hit_at = NULL WHERE hits > 0` },
      { phase: "verify", op: "Re-count tripped tokens", target: "public.honeytokens", sql: `SELECT count(*) FROM public.honeytokens WHERE hits > 0` },
    ];
    case "no-honeytokens": return [
      { phase: "exec", op: "Seed new honeytoken", target: "public.honeytokens", sql: `INSERT INTO public.honeytokens (label, token, active, hits) VALUES ($1, $2, true, 0)` },
      { phase: "verify", op: "Count active decoys", target: "public.honeytokens", sql: `SELECT count(*) FROM public.honeytokens WHERE active = true` },
    ];
    case "unresolved-alerts":
    case "open-incidents":
    case "injection-attempts":
    case "threat-burst-24h":
    case "tarpit-burst": {
      const where = id === "injection-attempts"
        ? `type IN ('sql_injection','xss','prompt_injection','command_injection') AND status='open'`
        : id === "tarpit-burst"
          ? `type = 'tarpit' AND status='open'`
          : id === "threat-burst-24h"
            ? `category='security' AND status='open' AND created_at >= '${dayAgo}'`
            : `category='security' AND status='open'`;
      return [
        { phase: "scan", op: "Enumerate open events", target: "public.activity_log", sql: `SELECT id FROM public.activity_log WHERE ${where} LIMIT 5000` },
        { phase: "exec", op: "Mark events resolved", target: "public.activity_log", sql: `UPDATE public.activity_log SET status='resolved' WHERE ${where}` },
        { phase: "verify", op: "Re-count open events", target: "public.activity_log", sql: `SELECT count(*) FROM public.activity_log WHERE ${where}` },
      ];
    }
    case "failed-login-burst": return [
      { phase: "scan", op: "Fetch failed logins (24h)", target: "public.login_history", sql: `SELECT ip FROM public.login_history WHERE event='failed' AND created_at >= '${dayAgo}' AND ip IS NOT NULL` },
      { phase: "exec", op: "Block repeat offenders (≥5)", target: "public.blocked_ips", sql: `INSERT INTO public.blocked_ips (ip, reason, blocked_by) SELECT ip, 'auto: failed login burst', $admin FROM ... ON CONFLICT (ip) DO NOTHING` },
      { phase: "verify", op: "Confirm offenders blocked", target: "public.blocked_ips", sql: `SELECT count(*) FROM public.blocked_ips WHERE reason = 'auto: failed login burst' AND created_at >= '${dayAgo}'` },
    ];
    case "blocked-ips-high": return [
      { phase: "scan", op: "Find stale blocks (>30d)", target: "public.blocked_ips", sql: `SELECT count(*) FROM public.blocked_ips WHERE created_at < '${monthAgo}'` },
      { phase: "exec", op: "Rotate stale blocks", target: "public.blocked_ips", sql: `DELETE FROM public.blocked_ips WHERE created_at < '${monthAgo}'` },
      { phase: "verify", op: "Re-count stale blocks", target: "public.blocked_ips", sql: `SELECT count(*) FROM public.blocked_ips WHERE created_at < '${monthAgo}'` },
    ];
    default: return [];
  }
}

/**
 * Executes exactly one phase of one finding's remediation and returns a
 * single live trace. Client calls this once per FixPlanStep so each step's
 * duration is real wall-clock time, not a batched summary.
 */
export const runFixSubStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string; phase: FixPhase }) => {
    if (!data?.id || !data?.phase) throw new Error("id and phase required");
    return data;
  })
  .handler(async ({ data, context }): Promise<FixStepTrace> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const t0 = Date.now();
    const done = (partial: Omit<FixStepTrace, "durationMs">): FixStepTrace => ({ ...partial, durationMs: Date.now() - t0 });
    const plan = getFixPlan(data.id).find((p) => p.phase === data.phase);
    if (!plan) return done({ kind: data.phase, op: "unknown", target: "-", sql: "-", ok: false, message: "no such step" });
    const base = { kind: plan.phase, op: plan.op, target: plan.target, sql: plan.sql };
    try {
      switch (`${data.id}:${data.phase}`) {
        case "expired-chats:scan": {
          const { count, error } = await supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("pinned", false).lt("expires_at", new Date().toISOString());
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} candidate(s)` });
        }
        case "expired-chats:exec": {
          const { data: n, error } = await supabaseAdmin.rpc("purge_expired_chats");
          if (error) throw error;
          return done({ ...base, ok: true, affected: Number(n) || 0, message: `${Number(n) || 0} row(s) deleted` });
        }
        case "expired-chats:verify": {
          const { count, error } = await supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("pinned", false).lt("expires_at", new Date().toISOString());
          if (error) throw error;
          return done({ ...base, ok: (count ?? 0) === 0, affected: count ?? 0, message: `${count ?? 0} remaining` });
        }
        case "stale-sessions:scan": {
          const { count, error } = await supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).lt("last_active_at", weekAgo);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} stale session(s)` });
        }
        case "stale-sessions:exec": {
          const { error, count } = await supabaseAdmin.from("user_sessions").delete({ count: "exact" }).lt("last_active_at", weekAgo);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} deleted` });
        }
        case "stale-sessions:verify": {
          const { count, error } = await supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).lt("last_active_at", weekAgo);
          if (error) throw error;
          return done({ ...base, ok: (count ?? 0) === 0, affected: count ?? 0, message: `${count ?? 0} remaining` });
        }
        case "honeytoken-hit:scan": {
          const { data: rows, error } = await supabaseAdmin.from("honeytokens").select("id,label,hits").gt("hits", 0);
          if (error) throw error;
          const labels = (rows ?? []).map((r) => (r as { label: string }).label).slice(0, 3).join(", ");
          return done({ ...base, ok: true, affected: rows?.length ?? 0, message: labels || "none" });
        }
        case "honeytoken-hit:exec": {
          const { error, count } = await supabaseAdmin.from("honeytokens").update({ hits: 0, last_hit_at: null } as never, { count: "exact" }).gt("hits", 0);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} token(s) reset` });
        }
        case "honeytoken-hit:verify": {
          const { count, error } = await supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).gt("hits", 0);
          if (error) throw error;
          return done({ ...base, ok: (count ?? 0) === 0, affected: count ?? 0, message: `${count ?? 0} still tripped` });
        }
        case "no-honeytokens:exec": {
          const label = `decoy-${Math.random().toString(36).slice(2, 8)}`;
          const token = `sk_decoy_${crypto.randomUUID()}`;
          const { error } = await supabaseAdmin.from("honeytokens").insert({ label, token, active: true, hits: 0 } as never);
          if (error) throw error;
          return done({ ...base, ok: true, affected: 1, message: `Inserted ${label}` });
        }
        case "no-honeytokens:verify": {
          const { count, error } = await supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).eq("active", true);
          if (error) throw error;
          return done({ ...base, ok: (count ?? 0) > 0, affected: count ?? 0, message: `${count ?? 0} active decoy(s)` });
        }
        case "failed-login-burst:scan": {
          const { data: rows, error } = await supabaseAdmin.from("login_history").select("ip").eq("event", "failed").gte("created_at", dayAgo).not("ip", "is", null);
          if (error) throw error;
          return done({ ...base, ok: true, affected: rows?.length ?? 0, message: `${rows?.length ?? 0} failure(s)` });
        }
        case "failed-login-burst:exec": {
          const { data: rows, error } = await supabaseAdmin.from("login_history").select("ip").eq("event", "failed").gte("created_at", dayAgo).not("ip", "is", null);
          if (error) throw error;
          const counts = new Map<string, number>();
          for (const r of (rows ?? []) as { ip: string | null }[]) if (r.ip) counts.set(r.ip, (counts.get(r.ip) ?? 0) + 1);
          const offenders = [...counts.entries()].filter(([, c]) => c >= 5).map(([ip]) => ip);
          if (!offenders.length) return done({ ...base, ok: true, affected: 0, message: "no offender crossed threshold" });
          const { error: e2 } = await supabaseAdmin.from("blocked_ips").upsert(offenders.map((ip) => ({ ip, reason: "auto: failed login burst", blocked_by: context.userId })) as never, { onConflict: "ip" });
          if (e2) throw e2;
          return done({ ...base, ok: true, affected: offenders.length, message: `${offenders.length} IP(s) blocked` });
        }
        case "failed-login-burst:verify": {
          const { count, error } = await supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }).eq("reason", "auto: failed login burst").gte("created_at", dayAgo);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} auto-block(s) present` });
        }
        case "blocked-ips-high:scan": {
          const { count, error } = await supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }).lt("created_at", monthAgo);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} stale block(s)` });
        }
        case "blocked-ips-high:exec": {
          const { error, count } = await supabaseAdmin.from("blocked_ips").delete({ count: "exact" }).lt("created_at", monthAgo);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} row(s) removed` });
        }
        case "blocked-ips-high:verify": {
          const { count, error } = await supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }).lt("created_at", monthAgo);
          if (error) throw error;
          return done({ ...base, ok: (count ?? 0) === 0, affected: count ?? 0, message: `${count ?? 0} remaining` });
        }
        default: {
          // Generic open-events resolver family
          const map: Record<string, { category?: string; types?: string[]; sinceIso?: string }> = {
            "unresolved-alerts": { category: "security" },
            "open-incidents": { category: "security" },
            "injection-attempts": { types: ["sql_injection", "xss", "prompt_injection", "command_injection"] },
            "threat-burst-24h": { category: "security", sinceIso: dayAgo },
            "tarpit-burst": { types: ["tarpit"] },
          };
          const extra = map[data.id];
          if (!extra) return done({ ...base, ok: false, message: "no handler" });
          const applyFilters = <T extends { eq: (...a: never[]) => T; in: (...a: never[]) => T; gte: (...a: never[]) => T }>(q: T): T => {
            let s = q.eq("status" as never, "open" as never);
            if (extra.category) s = s.eq("category" as never, extra.category as never);
            if (extra.types) s = s.in("type" as never, extra.types as never);
            if (extra.sinceIso) s = s.gte("created_at" as never, extra.sinceIso as never);
            return s;
          };
          if (data.phase === "scan") {
            const { count, error } = await applyFilters(supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }) as never);
            if (error) throw error;
            return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} matching row(s)` });
          }
          if (data.phase === "exec") {
            const sel = applyFilters(supabaseAdmin.from("activity_log").select("id") as never) as unknown as { limit: (n: number) => Promise<{ data: { id: string }[] | null; error: unknown }> };
            const { data: rows, error } = await sel.limit(5000);
            if (error) throw error as Error;
            const ids = (rows ?? []).map((r: { id: string }) => r.id);
            if (!ids.length) return done({ ...base, ok: true, affected: 0, message: "nothing to resolve" });
            const { error: e2, count } = await supabaseAdmin.from("activity_log").update({ status: "resolved" } as never, { count: "exact" }).in("id", ids);
            if (e2) throw e2;
            return done({ ...base, ok: true, affected: count ?? ids.length, message: `${count ?? ids.length} row(s) updated` });
          }
          const { count, error } = await applyFilters(supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }) as never);
          if (error) throw error;
          return done({ ...base, ok: true, affected: count ?? 0, message: `${count ?? 0} remaining` });
        }
      }
    } catch (e) {
      return done({ ...base, ok: false, message: e instanceof Error ? e.message : "failed" });
    }
  });

/**
 * Generate a full penetration-test / posture report from live data.
 * Aggregates real database + runtime signals into a Markdown report that
 * the admin can download. Nothing is pre-canned.
 */
export const generatePentestReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const rangeStart = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const rangeEnd = new Date(now).toISOString();

    // Pull live catalog structure via the same SECURITY DEFINER helpers
    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as (name: string) => Promise<{ data: unknown }>;
    const [noRls, noPolicies, definerExec] = await Promise.all([
      rpc("sec_tables_without_rls"),
      rpc("sec_tables_without_policies"),
      rpc("sec_definer_executable_by_authenticated"),
    ]);
    const noRlsRows = (noRls.data ?? []) as { tablename: string }[];
    const noPolRows = (noPolicies.data ?? []) as { tablename: string }[];
    const definerRows = (definerExec.data ?? []) as { function_name: string }[];

    // Runtime signals
    const [
      openInc, secDay, secWeek, secMonth,
      failedDay, failedWeek, tarpitDay, injectionWeek,
      blocked, allow, htAll, htHit, admins, sessionsTotal, staleSessions,
      chatsTotal, expiredChats, topOffenders, recentIncidents,
    ] = await Promise.all([
      supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").eq("status", "open"),
      supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").gte("created_at", dayAgo),
      supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").gte("created_at", weekAgo),
      supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("category", "security").gte("created_at", monthAgo),
      supabaseAdmin.from("login_history").select("id", { count: "exact", head: true }).eq("event", "failed").gte("created_at", dayAgo),
      supabaseAdmin.from("login_history").select("id", { count: "exact", head: true }).eq("event", "failed").gte("created_at", weekAgo),
      supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).eq("type", "tarpit").gte("created_at", dayAgo),
      supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }).in("type", ["sql_injection", "xss", "prompt_injection", "command_injection"]).gte("created_at", weekAgo),
      supabaseAdmin.from("blocked_ips").select("ip,reason,created_at").order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("ip_allowlist").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("honeytokens").select("label,active,hits,last_hit_at"),
      supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).gt("hits", 0),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
      supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).lt("last_active_at", weekAgo),
      supabaseAdmin.from("chats").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("pinned", false).lt("expires_at", rangeEnd),
      supabaseAdmin.from("login_history").select("ip").eq("event", "failed").gte("created_at", weekAgo).not("ip", "is", null).limit(2000),
      supabaseAdmin.from("activity_log").select("type,severity,message,created_at,ip_address").eq("category", "security").order("created_at", { ascending: false }).limit(15),
    ]);

    const offenderMap = new Map<string, number>();
    for (const r of (topOffenders.data ?? []) as unknown as { ip: string | null }[]) {
      if (!r.ip) continue;
      offenderMap.set(r.ip, (offenderMap.get(r.ip) ?? 0) + 1);
    }
    const topIps = [...offenderMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Compose findings inline (mirror the panel logic; do not cross RPC boundary)
    const findings: ScanFinding[] = [];
    if (noRlsRows.length) findings.push({ id: "pg-rls-disabled", severity: "critical", title: "Tables without RLS", detail: noRlsRows.map(r => r.tablename).join(", "), count: noRlsRows.length, source: "postgres" });
    if (noPolRows.length) findings.push({ id: "pg-no-policies", severity: "high", title: "RLS without policies", detail: noPolRows.map(r => r.tablename).join(", "), count: noPolRows.length, source: "postgres" });
    const KNOWN = new Set(["public.has_role","public.consume_message_quota","public.check_promo","public.sec_tables_without_rls","public.sec_tables_without_policies","public.sec_definer_executable_by_authenticated"]);
    const unexpectedDefiners = definerRows.map(r => r.function_name).filter(n => !KNOWN.has(n));
    if (unexpectedDefiners.length) findings.push({ id: "pg-definer-exposure", severity: "high", title: "Unexpected SECURITY DEFINER exposure", detail: unexpectedDefiners.join(", "), count: unexpectedDefiners.length, source: "postgres" });
    if ((htHit.count ?? 0) > 0) findings.push({ id: "honeytoken-hit", severity: "critical", title: "Honeytoken triggered", detail: "Decoy assets probed.", count: htHit.count ?? 0, source: "runtime" });
    if ((injectionWeek.count ?? 0) > 0) findings.push({ id: "injection-attempts", severity: "critical", title: "Injection attempts (7d)", detail: "Prompt/SQL/XSS/command heuristics tripped.", count: injectionWeek.count ?? 0, source: "runtime" });
    if ((openInc.count ?? 0) > 0) findings.push({ id: "open-incidents", severity: "high", title: "Open incidents", detail: "Unresolved security events.", count: openInc.count ?? 0, source: "runtime" });
    if ((failedDay.count ?? 0) > 10) findings.push({ id: "failed-login-burst", severity: "high", title: "Failed login burst (24h)", detail: "", count: failedDay.count ?? 0, source: "runtime" });
    if ((tarpitDay.count ?? 0) > 50) findings.push({ id: "tarpit-burst", severity: "high", title: "Heavy tarpit engagement (24h)", detail: "", count: tarpitDay.count ?? 0, source: "runtime" });
    if ((expiredChats.count ?? 0) > 0) findings.push({ id: "expired-chats", severity: "medium", title: "Expired chats pending purge", detail: "", count: expiredChats.count ?? 0, source: "runtime" });
    if ((staleSessions.count ?? 0) > 0) findings.push({ id: "stale-sessions", severity: "low", title: "Stale sessions", detail: "", count: staleSessions.count ?? 0, source: "runtime" });

    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    findings.forEach(f => { counts[f.severity]++; });
    const scan = { findings, counts, ranAt: new Date().toISOString() };

    // Risk score (0-100, lower is better)
    const w: Record<Severity, number> = { critical: 25, high: 10, medium: 4, low: 1, info: 0 };
    const risk = Math.min(100, scan.findings.reduce((a, f) => a + w[f.severity], 0));
    const rating = risk >= 60 ? "Critical" : risk >= 30 ? "Elevated" : risk >= 10 ? "Moderate" : "Low";

    const rid = `Metrixcom-PT-${new Date(now).toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const line = (s: string) => s + "\n";
    const md: string[] = [];
    md.push(line(`# Metrixcom — Penetration Test & Security Posture Report`));
    md.push(line(`**Report ID:** ${rid}`));
    md.push(line(`**Generated:** ${new Date(now).toISOString()}`));
    md.push(line(`**Window analyzed:** ${rangeStart} → ${rangeEnd}`));
    md.push(line(`**Assessor:** Metrixcom internal security scanner (live, admin-authorized)`));
    md.push(line(`**Scope:** Supabase Postgres (public schema), auth, RLS policies, activity_log, honeytokens, sessions, login history, tarpit, blocklist.`));
    md.push("");
    md.push(line(`## 1. Executive summary`));
    md.push(line(`- **Overall risk:** ${rating} (${risk}/100)`));
    md.push(line(`- **Findings:** ${scan.findings.length} total — ${scan.counts.critical ?? 0} critical, ${scan.counts.high ?? 0} high, ${scan.counts.medium ?? 0} medium, ${scan.counts.low ?? 0} low, ${scan.counts.info ?? 0} info`));
    md.push(line(`- **Security events (30d):** ${secMonth.count ?? 0}; **7d:** ${secWeek.count ?? 0}; **24h:** ${secDay.count ?? 0}`));
    md.push(line(`- **Failed logins (7d):** ${failedWeek.count ?? 0}; **24h:** ${failedDay.count ?? 0}`));
    md.push(line(`- **Injection heuristics tripped (7d):** ${injectionWeek.count ?? 0}`));
    md.push(line(`- **Tarpit engagements (24h):** ${tarpitDay.count ?? 0}`));
    md.push(line(`- **Open unresolved incidents:** ${openInc.count ?? 0}`));
    md.push("");
    md.push(line(`## 2. Methodology`));
    md.push(line(`Automated review executed via server-side SECURITY DEFINER helpers with admin verification. Live pg_catalog inspection for RLS/policy/definer exposure; runtime aggregation from activity_log, login_history, honeytokens, user_sessions, chats, blocked_ips, ip_allowlist. Injection heuristics evaluated against last 7 days. No destructive testing performed; no user data exfiltrated.`));
    md.push("");
    md.push(line(`## 3. Findings by severity`));
    for (const sev of ["critical", "high", "medium", "low", "info"] as Severity[]) {
      const group = scan.findings.filter((f) => f.severity === sev);
      if (!group.length) continue;
      md.push(line(`### ${sev.toUpperCase()} (${group.length})`));
      for (const f of group) {
        md.push(line(`- **${f.title}**${typeof f.count === "number" ? ` — ${f.count.toLocaleString()}` : ""}  `));
        md.push(line(`  ${f.detail}  `));
        md.push(line(`  _id: \`${f.id}\` · source: ${f.source}_`));
      }
      md.push("");
    }
    md.push(line(`## 4. Database posture`));
    md.push(line(`- Tables without RLS: ${noRlsRows.length}${noRlsRows.length ? " → " + noRlsRows.map(r => r.tablename).join(", ") : ""}`));
    md.push(line(`- RLS enabled but no policies: ${noPolRows.length}${noPolRows.length ? " → " + noPolRows.map(r => r.tablename).join(", ") : ""}`));
    md.push(line(`- SECURITY DEFINER functions callable by authenticated: ${definerRows.length}${definerRows.length ? " → " + definerRows.map(r => r.function_name).join(", ") : ""}`));
    md.push("");
    md.push(line(`## 5. Detection & response layers`));
    md.push(line(`- Admin accounts: ${(admins.data ?? []).length}`));
    md.push(line(`- Active sessions: ${sessionsTotal.count ?? 0} (stale >7d: ${staleSessions.count ?? 0})`));
    md.push(line(`- Chats total: ${chatsTotal.count ?? 0} (expired awaiting purge: ${expiredChats.count ?? 0})`));
    md.push(line(`- Honeytokens: ${(htAll.data ?? []).length} deployed, ${htHit.count ?? 0} triggered`));
    md.push(line(`- IP allowlist entries: ${allow.count ?? 0}; blocked IPs (recent 20 shown below)`));
    md.push("");
    if ((blocked.data ?? []).length) {
      md.push(line(`### Recent blocklist`));
      md.push(line(`| IP | Reason | Blocked at |`));
      md.push(line(`|---|---|---|`));
      for (const b of blocked.data as unknown as { ip: string; reason: string | null; created_at: string }[]) {
        md.push(line(`| \`${b.ip}\` | ${b.reason ?? "—"} | ${b.created_at} |`));
      }
      md.push("");
    }
    if (topIps.length) {
      md.push(line(`### Top failed-login source IPs (7d)`));
      md.push(line(`| IP | Failures |`));
      md.push(line(`|---|---|`));
      for (const [ip, n] of topIps) md.push(line(`| \`${ip}\` | ${n} |`));
      md.push("");
    }
    md.push(line(`## 6. Recent security events (last 15)`));
    if (!(recentIncidents.data ?? []).length) md.push(line(`_No recent events._`));
    else {
      md.push(line(`| Time | Type | Severity | Source | Message |`));
      md.push(line(`|---|---|---|---|---|`));
      for (const e of recentIncidents.data as unknown as { type: string | null; severity: string | null; message: string | null; created_at: string; ip_address: string | null }[]) {
        md.push(line(`| ${e.created_at} | ${e.type ?? "—"} | ${e.severity ?? "—"} | ${e.ip_address ?? "—"} | ${(e.message ?? "").replace(/\|/g, "\\|").slice(0, 140)} |`));
      }
    }
    md.push("");
    md.push(line(`## 7. Recommendations`));
    if (scan.findings.some((f) => f.severity === "critical")) md.push(line(`- Triage every CRITICAL finding immediately; use in-app "Fix selected" for automatable ones.`));
    if (noRlsRows.length) md.push(line(`- Enable RLS on all public tables (manual migration required).`));
    if (noPolRows.length) md.push(line(`- Add policies to RLS-locked tables or intentionally document them as locked.`));
    if ((allow.count ?? 0) === 0) md.push(line(`- Consider an IP allowlist for admin access.`));
    md.push(line(`- Rotate provider API keys quarterly; verify secret access via the Secrets panel.`));
    md.push(line(`- Review admin roster; keep it minimal.`));
    md.push("");
    md.push(line(`---`));
    md.push(line(`_This report was generated automatically by Metrixcom's security scanner. It reflects live database state at generation time._`));

    return {
      reportId: rid,
      generatedAt: new Date(now).toISOString(),
      risk,
      rating,
      counts: scan.counts,
      markdown: md.join(""),
    };
  });

/* ============================================================================
 * DRY-RUN — simulate a fix without mutating.
 * Runs the same read probes the real remediation does, returns the exact SQL
 * that WOULD execute, the expected number of affected rows, and the predicted
 * status change per phase. Nothing is written.
 * ==========================================================================*/

export type DryRunStep = {
  phase: FixPhase;
  op: string;
  target: string;
  sql: string;             // exact SQL that would execute in real apply
  willMutate: boolean;     // true for exec/verify steps that write in real mode
  expectedAffected: number; // rows a real run would touch RIGHT NOW
  predictedChange: string; // human-readable before → after
  probedSql: string;       // the read-only probe actually executed to measure this
  durationMs: number;
  ok: boolean;
  note?: string;
};

export type DryRunFinding = {
  id: string;
  ok: boolean;
  totalExpectedAffected: number;
  steps: DryRunStep[];
  summary: string;
};

export const dryRunFixFinding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => {
    if (!data?.id) throw new Error("id required");
    return data;
  })
  .handler(async ({ data, context }): Promise<DryRunFinding> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString();
    const plan = getFixPlan(data.id);
    const out: DryRunStep[] = [];

    if (!plan.length) {
      return {
        id: data.id, ok: false, totalExpectedAffected: 0, steps: [],
        summary: "No automated remediation available — requires manual review or migration.",
      };
    }

    const probe = async (
      p: FixPlanStep,
      probedSql: string,
      run: () => Promise<{ expectedAffected: number; predictedChange: string; note?: string; willMutate: boolean }>,
    ): Promise<DryRunStep> => {
      const t0 = Date.now();
      try {
        const r = await run();
        return { phase: p.phase, op: p.op, target: p.target, sql: p.sql, probedSql, durationMs: Date.now() - t0, ok: true, ...r };
      } catch (e) {
        return {
          phase: p.phase, op: p.op, target: p.target, sql: p.sql, probedSql,
          durationMs: Date.now() - t0, ok: false, willMutate: p.phase !== "scan",
          expectedAffected: 0, predictedChange: "probe failed",
          note: e instanceof Error ? e.message : "probe error",
        };
      }
    };

    for (const p of plan) {
      const key = `${data.id}:${p.phase}` as const;
      let step: DryRunStep;
      switch (key) {
        case "expired-chats:scan":
        case "expired-chats:exec":
        case "expired-chats:verify": {
          const probedSql = `SELECT count(*) FROM public.chats WHERE pinned=false AND expires_at < now()`;
          step = await probe(p, probedSql, async () => {
            const { count } = await supabaseAdmin.from("chats").select("id", { count: "exact", head: true }).eq("pinned", false).lt("expires_at", new Date().toISOString());
            const n = count ?? 0;
            if (p.phase === "scan") return { willMutate: false, expectedAffected: n, predictedChange: `${n} candidate row(s) identified · no writes` };
            if (p.phase === "exec") return { willMutate: true, expectedAffected: n, predictedChange: `chats: ${n} → 0 expired (${n} DELETE)` };
            return { willMutate: false, expectedAffected: 0, predictedChange: `expected 0 expired row(s) remaining after apply (currently ${n})` };
          });
          break;
        }
        case "stale-sessions:scan":
        case "stale-sessions:exec":
        case "stale-sessions:verify": {
          const probedSql = `SELECT count(*) FROM public.user_sessions WHERE last_active_at < '${weekAgo}'`;
          step = await probe(p, probedSql, async () => {
            const { count } = await supabaseAdmin.from("user_sessions").select("id", { count: "exact", head: true }).lt("last_active_at", weekAgo);
            const n = count ?? 0;
            if (p.phase === "scan") return { willMutate: false, expectedAffected: n, predictedChange: `${n} stale session(s) · no writes` };
            if (p.phase === "exec") return { willMutate: true, expectedAffected: n, predictedChange: `sessions: -${n} rows · users signed out on those devices` };
            return { willMutate: false, expectedAffected: 0, predictedChange: `expected 0 stale session(s) remaining after apply (currently ${n})` };
          });
          break;
        }
        case "honeytoken-hit:scan":
        case "honeytoken-hit:exec":
        case "honeytoken-hit:verify": {
          const probedSql = `SELECT id,label,hits FROM public.honeytokens WHERE hits > 0`;
          step = await probe(p, probedSql, async () => {
            const { data: rows } = await supabaseAdmin.from("honeytokens").select("id,label,hits").gt("hits", 0);
            const list = (rows ?? []) as { label: string; hits: number }[];
            const n = list.length;
            const preview = list.slice(0, 3).map(r => `${r.label}(${r.hits})`).join(", ");
            if (p.phase === "scan") return { willMutate: false, expectedAffected: n, predictedChange: `${n} tripped decoy(s)${preview ? ` — ${preview}` : ""}` };
            if (p.phase === "exec") return { willMutate: true, expectedAffected: n, predictedChange: `honeytokens: hits > 0 → 0, last_hit_at → NULL (${n} row(s))` };
            return { willMutate: false, expectedAffected: 0, predictedChange: `expected 0 tripped decoy(s) after apply (currently ${n})` };
          });
          break;
        }
        case "no-honeytokens:exec": {
          step = await probe(p, `-- insert 1 new decoy`, async () =>
            ({ willMutate: true, expectedAffected: 1, predictedChange: `honeytokens: +1 active decoy` }));
          break;
        }
        case "no-honeytokens:verify": {
          const probedSql = `SELECT count(*) FROM public.honeytokens WHERE active = true`;
          step = await probe(p, probedSql, async () => {
            const { count } = await supabaseAdmin.from("honeytokens").select("id", { count: "exact", head: true }).eq("active", true);
            const n = count ?? 0;
            return { willMutate: false, expectedAffected: n + 1, predictedChange: `active decoys: ${n} → ${n + 1} (post-insert)` };
          });
          break;
        }
        case "failed-login-burst:scan":
        case "failed-login-burst:exec":
        case "failed-login-burst:verify": {
          const probedSql = p.phase === "verify"
            ? `SELECT count(*) FROM public.blocked_ips WHERE reason = 'auto: failed login burst' AND created_at >= '${dayAgo}'`
            : `SELECT ip, count(*) FROM public.login_history WHERE event='failed' AND created_at >= '${dayAgo}' GROUP BY ip HAVING count(*) >= 5`;
          step = await probe(p, probedSql, async () => {
            if (p.phase === "verify") {
              const { count } = await supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }).eq("reason", "auto: failed login burst").gte("created_at", dayAgo);
              const n = count ?? 0;
              return { willMutate: false, expectedAffected: n, predictedChange: `${n} auto-block(s) recorded in last 24h` };
            }
            const { data: rows } = await supabaseAdmin.from("login_history").select("ip").eq("event", "failed").gte("created_at", dayAgo).not("ip", "is", null);
            const counts = new Map<string, number>();
            for (const r of (rows ?? []) as { ip: string | null }[]) if (r.ip) counts.set(r.ip, (counts.get(r.ip) ?? 0) + 1);
            const offenders = [...counts.entries()].filter(([, c]) => c >= 5);
            const n = offenders.length;
            const preview = offenders.slice(0, 3).map(([ip, c]) => `${ip}×${c}`).join(", ");
            return p.phase === "scan"
              ? { willMutate: false, expectedAffected: rows?.length ?? 0, predictedChange: `${rows?.length ?? 0} failure(s), ${n} offender IP(s) ≥5${preview ? ` — ${preview}` : ""}` }
              : { willMutate: true, expectedAffected: n, predictedChange: `blocked_ips: +${n} row(s) (upsert, ON CONFLICT DO NOTHING)` };
          });
          break;
        }
        case "blocked-ips-high:scan":
        case "blocked-ips-high:exec":
        case "blocked-ips-high:verify": {
          const probedSql = `SELECT count(*) FROM public.blocked_ips WHERE created_at < '${monthAgo}'`;
          step = await probe(p, probedSql, async () => {
            const { count } = await supabaseAdmin.from("blocked_ips").select("id", { count: "exact", head: true }).lt("created_at", monthAgo);
            const n = count ?? 0;
            if (p.phase === "scan") return { willMutate: false, expectedAffected: n, predictedChange: `${n} stale block(s) older than 30d` };
            if (p.phase === "exec") return { willMutate: true, expectedAffected: n, predictedChange: `blocked_ips: -${n} stale row(s)` };
            return { willMutate: false, expectedAffected: 0, predictedChange: `expected 0 stale block(s) remaining after apply (currently ${n})` };
          });
          break;
        }
        default: {
          const map: Record<string, { category?: string; types?: string[]; sinceIso?: string }> = {
            "unresolved-alerts": { category: "security" },
            "open-incidents": { category: "security" },
            "injection-attempts": { types: ["sql_injection", "xss", "prompt_injection", "command_injection"] },
            "threat-burst-24h": { category: "security", sinceIso: dayAgo },
            "tarpit-burst": { types: ["tarpit"] },
          };
          const extra = map[data.id];
          if (!extra) {
            step = { phase: p.phase, op: p.op, target: p.target, sql: p.sql, probedSql: "-", willMutate: p.phase !== "scan", expectedAffected: 0, predictedChange: "no handler", durationMs: 0, ok: false };
            break;
          }
          const filters: string[] = [`status='open'`];
          if (extra.category) filters.push(`category='${extra.category}'`);
          if (extra.types) filters.push(`type IN (${extra.types.map(t => `'${t}'`).join(",")})`);
          if (extra.sinceIso) filters.push(`created_at >= '${extra.sinceIso}'`);
          const where = filters.join(" AND ");
          const probedSql = `SELECT count(*) FROM public.activity_log WHERE ${where}`;
          step = await probe(p, probedSql, async () => {
            const applyFilters = <T extends { eq: (...a: never[]) => T; in: (...a: never[]) => T; gte: (...a: never[]) => T }>(q: T): T => {
              let s = q.eq("status" as never, "open" as never);
              if (extra.category) s = s.eq("category" as never, extra.category as never);
              if (extra.types) s = s.in("type" as never, extra.types as never);
              if (extra.sinceIso) s = s.gte("created_at" as never, extra.sinceIso as never);
              return s;
            };
            const { count } = await applyFilters(supabaseAdmin.from("activity_log").select("id", { count: "exact", head: true }) as never);
            const n = count ?? 0;
            if (p.phase === "scan") return { willMutate: false, expectedAffected: n, predictedChange: `${n} open event(s) match` };
            if (p.phase === "exec") return { willMutate: true, expectedAffected: Math.min(n, 5000), predictedChange: `activity_log.status: open → resolved (${Math.min(n, 5000)} row(s), cap 5000)` };
            return { willMutate: false, expectedAffected: 0, predictedChange: `expected 0 open row(s) remaining after apply` };
          });
        }
      }
      out.push(step);
    }

    const totalExpectedAffected = out
      .filter(s => s.willMutate)
      .reduce((a, s) => a + (s.expectedAffected || 0), 0);
    const okAll = out.every(s => s.ok);
    return {
      id: data.id, ok: okAll, totalExpectedAffected, steps: out,
      summary: okAll
        ? `Simulation OK · ${totalExpectedAffected} row(s) would be written across ${out.filter(s => s.willMutate).length} mutation(s)`
        : `Simulation completed with probe errors — review before applying`,
    };
  });

