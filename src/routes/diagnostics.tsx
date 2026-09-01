import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMessageLimit, readUsedToday, limitsMasterOn } from "@/lib/msg-limit";
import { usePlatform } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/diagnostics")({
  component: DiagnosticsPage,
  head: () => ({
    meta: [
      { title: "Metrixcom · Diagnostics" },
      { name: "description", content: "Admin-only per-user quota diagnostics." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

interface OverrideRow {
  msg_limit: number | null;
  unlimited: boolean | null;
  updated_at?: string | null;
}

function DiagnosticsPage() {
  const { user, isAdmin, loading, profile } = useAuth();
  const { settings } = usePlatform();
  const status = useMessageLimit();
  const [override, setOverride] = useState<OverrideRow | null>(null);
  const [scanKeys, setScanKeys] = useState<{ uid: string; date: string; count: number }[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("user_overrides")
      .select("msg_limit,unlimited,updated_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setOverride((data as OverrideRow) ?? null));
  }, [user?.id, tick]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rows: { uid: string; date: string; count: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("arch:msg_count:v1:")) continue;
      const parts = k.split(":");
      const uid = parts[3];
      const date = parts[4];
      const count = Number(localStorage.getItem(k) ?? 0) || 0;
      rows.push({ uid, date, count });
    }
    rows.sort((a, b) => (a.uid + a.date).localeCompare(b.uid + b.date));
    setScanKeys(rows);
  }, [tick, status.used]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/" />;

  const defaultLimit =
    (settings?.global_limits as { daily_msg_limit?: number } | undefined)?.daily_msg_limit ?? null;
  const masterOn = limitsMasterOn();
  const effectiveLimit = override?.unlimited ? null : (override?.msg_limit ?? defaultLimit ?? null);
  const localUsed = readUsedToday(user.id);

  const shortUid = (u: string) => (u.length > 12 ? `${u.slice(0, 8)}…${u.slice(-4)}` : u);

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quota Diagnostics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Per-user isolation check. Values are scoped to <code className="text-xs">auth.uid()</code> only.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTick((t) => t + 1)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface/80"
          >
            Refresh
          </button>
          <Link
            to="/admin"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface/80"
          >
            ← Admin
          </Link>
        </div>
      </header>

      <section className="rounded-lg border border-border bg-surface/40 p-5 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your session</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="font-mono text-xs break-all">{user.id}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{profile?.email ?? user.email ?? "—"}</dd>
          <dt className="text-muted-foreground">Admin</dt>
          <dd>{isAdmin ? "yes (bypasses limits)" : "no"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-surface/40 p-5 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Enforced limits</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Master switch</dt>
          <dd>{masterOn ? "ON" : "OFF (limits disabled globally)"}</dd>
          <dt className="text-muted-foreground">Global default (app_settings)</dt>
          <dd>{defaultLimit ?? "unlimited"}</dd>
          <dt className="text-muted-foreground">Your override (user_overrides)</dt>
          <dd>
            {override
              ? override.unlimited
                ? "unlimited"
                : override.msg_limit ?? "—"
              : "none"}
          </dd>
          <dt className="text-muted-foreground">Effective limit for you</dt>
          <dd>{effectiveLimit ?? "unlimited"}</dd>
          <dt className="text-muted-foreground">Enforced right now</dt>
          <dd>{status.enforced ? "yes" : "no"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-surface/40 p-5 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your msg_count (today)
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Used</dt>
          <dd>{localUsed}</dd>
          <dt className="text-muted-foreground">Remaining</dt>
          <dd>{status.remaining === Infinity ? "∞" : status.remaining}</dd>
          <dt className="text-muted-foreground">Blocked</dt>
          <dd>{status.blocked ? "yes" : "no"}</dd>
          <dt className="text-muted-foreground">Warning</dt>
          <dd>{status.warning ? "yes" : "no"}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-surface/40 p-5 space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          All local msg_count keys ({scanKeys.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Each row is a separate localStorage key scoped to a unique user ID + date. Different UIDs never share a
          counter — this is the visual proof of per-user isolation.
        </p>
        {scanKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No counters stored yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface/60 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">User ID</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-right px-3 py-2">Count</th>
                  <th className="text-left px-3 py-2">Match</th>
                </tr>
              </thead>
              <tbody>
                {scanKeys.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-mono">{shortUid(r.uid)}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2 text-right">{r.count}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.uid === user.id ? "you" : "other user"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
