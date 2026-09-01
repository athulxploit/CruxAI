// Honeypot helper — logs any request and returns a decoy response.
// Server-only: imported by routes under src/routes/api/public/honeypots/*.
// File name ends in .server.ts so the client-import guard blocks it from bundles.

type SupabaseAdmin = {
  from: (t: string) => {
    insert: (row: Record<string, unknown>) => {
      then: (onFulfilled?: (v: { error: unknown }) => unknown, onRejected?: (e: unknown) => unknown) => Promise<unknown>;
    };
  };
};

const DECOYS: Record<string, { body: string | Record<string, unknown>; type: "html" | "json" | "text" }> = {
  "wp-login": { body: "<!doctype html><html><head><title>Log In &lsaquo; WordPress</title></head><body><form></form></body></html>", type: "html" },
  "admin": { body: { ok: true, session: "expired" }, type: "json" },
  "env": { body: "APP_ENV=production\n", type: "text" },
  "phpmyadmin": { body: "<!doctype html><title>phpMyAdmin</title>", type: "html" },
  "git-config": { body: "[core]\n\trepositoryformatversion = 0\n", type: "text" },
};

export async function trapAndLog(request: Request, trap: keyof typeof DECOYS | string) {
  try {
    const url = new URL(request.url);
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? null;
    const ua = request.headers.get("user-agent") ?? null;
    const referer = request.headers.get("referer") ?? null;
    let bodySample: string | null = null;
    try {
      const cloned = request.clone();
      const text = await cloned.text();
      bodySample = text ? text.slice(0, 512) : null;
    } catch { /* ignore */ }

    const mod = (await import("@/integrations/supabase/client.server")) as unknown as { supabaseAdmin: SupabaseAdmin };
    mod.supabaseAdmin.from("activity_log").insert({
      user_id: null,
      type: "honeypot_hit",
      category: "security",
      message: `Honeypot "${trap}" hit`,
      meta: {
        trap,
        method: request.method,
        path: url.pathname,
        query: url.search,
        ip,
        user_agent: ua,
        referer,
        body_sample: bodySample,
      },
      status: "open",
    }).then(undefined, () => {});
  } catch { /* never throw from a honeypot */ }

  const decoy = DECOYS[trap] ?? { body: { ok: true }, type: "json" as const };
  const isString = typeof decoy.body === "string";
  const body = isString ? (decoy.body as string) : JSON.stringify(decoy.body);
  const contentType =
    decoy.type === "html" ? "text/html; charset=utf-8" :
    decoy.type === "text" ? "text/plain; charset=utf-8" :
    "application/json";
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
