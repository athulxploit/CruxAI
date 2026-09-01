// Honeytoken tripwire — any request to /api/public/honeypots/token/<token>
// is logged as a high-severity security event if the token matches a decoy.
import { createFileRoute } from "@tanstack/react-router";

type Admin = {
  from: (t: string) => {
    select: (c: string) => { eq: (col: string, v: string) => { limit: (n: number) => { maybeSingle: () => Promise<{ data: { id: string; label: string } | null }> } } };
    update: (row: Record<string, unknown>) => { eq: (col: string, v: string) => Promise<unknown> };
    insert: (row: Record<string, unknown>) => Promise<unknown>;
  };
};

export const Route = createFileRoute("/api/public/honeypots/token/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => handle(params.token, request),
      POST: async ({ params, request }) => handle(params.token, request),
    },
  },
});

async function handle(token: string, request: Request) {
  try {
    const mod = (await import("@/integrations/supabase/client.server")) as unknown as { supabaseAdmin: Admin };
    const admin = mod.supabaseAdmin;
    const { data } = await admin.from("honeytokens").select("id,label").eq("token", token).limit(1).maybeSingle();
    if (data) {
      const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
      const ua = request.headers.get("user-agent");
      await admin.from("honeytokens").update({ hits: 1, last_hit_at: new Date().toISOString() }).eq("id", data.id);
      await admin.from("activity_log").insert({
        user_id: null,
        type: "honeytoken_hit",
        category: "security",
        message: `Honeytoken "${data.label}" used`,
        meta: { label: data.label, ip, user_agent: ua, method: request.method },
        status: "open",
      });
    }
  } catch { /* silent */ }
  // Always respond identically so attackers cannot distinguish real vs decoy.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
