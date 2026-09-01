// Admin-only endpoint that returns live pool health for the AI key pool.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { poolStatus, poolSizes } from "@/lib/key-pool.server";

function buildUserClient(token: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const fetchShim: typeof fetch = (input, init) => {
    const h = new Headers(init?.headers);
    if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
    h.set("apikey", key);
    return fetch(input as RequestInfo, { ...init, headers: h });
  };
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: fetchShim, headers: { Authorization: `Bearer ${token}` } },
  });
}

async function verifyAdmin(request: Request): Promise<{ ok: boolean; reason?: string }> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { ok: false, reason: "no_bearer" };
  const token = auth.slice(7).trim();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) return { ok: false, reason: "server_config" };
  const anon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data: userRes, error } = await anon.auth.getUser(token);
  if (error || !userRes?.user?.id) return { ok: false, reason: "bad_token" };
  const asUser = buildUserClient(token);
  if (!asUser) return { ok: false, reason: "server_config" };
  const { data: isAdmin, error: rpcErr } = await asUser.rpc("has_role", {
    _user_id: userRes.user.id,
    _role: "admin",
  });
  if (rpcErr) return { ok: false, reason: `rpc:${rpcErr.message}` };
  return { ok: Boolean(isAdmin), reason: isAdmin ? undefined : "not_admin" };
}

export const Route = createFileRoute("/api/ai-pool-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const v = await verifyAdmin(request);
        if (!v.ok) {
          return new Response(`Forbidden: ${v.reason ?? "unknown"}`, { status: 403 });
        }
        return Response.json({
          sizes: poolSizes(),
          keys: poolStatus(),
          at: new Date().toISOString(),
        });
      },
    },
  },
});
