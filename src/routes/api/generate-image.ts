import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Image generation.
// Free/Standard render on Replicate (FLUX.1 schnell / Stable Diffusion 3.5 Large).
// Pro/Pro+ render on the Lovable AI gateway (GPT Image 2 / Gemini 3 Pro Image).
// Keys never touch the browser: the client posts a prompt with its Supabase
// bearer token, this route calls the provider server-side and returns an image URL.

const GATEWAY = "https://connector-gateway.lovable.dev/replicate/v1";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/images/generations";

// Image models exposed to the app.
const MODELS: Record<string, string> = {
  schnell: "black-forest-labs/flux-schnell",              // fastest, ~1-2s
  sd35: "stability-ai/stable-diffusion-3.5-large",        // Standard tier
  gptimage: "openai/gpt-image-2",                         // Pro tier
  geminipro: "google/gemini-3-pro-image",                 // Pro+ tier (Nano Banana Pro)
};

// Variants served by the Lovable AI gateway rather than Replicate.
const AI_VARIANTS = new Set(["gptimage", "geminipro"]);

// Plan (lowercased profiles.plan) -> model variant.
const TIER_MODEL: Record<string, string> = {
  free: "schnell",
  standard: "sd35",
  pro: "gptimage",
  "pro+": "geminipro",
  proplus: "geminipro",
};

const versionCache = new Map<string, string>();

const ASPECTS = new Set(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"]);

// GPT Image 2 accepts a pixel size, not an aspect ratio.
const GPT_SIZES: Record<string, string> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "21:9": "1536x1024",
  "3:2": "1536x1024",
  "4:3": "1536x1024",
  "9:16": "1024x1536",
  "2:3": "1024x1536",
  "3:4": "1024x1536",
};

/** Resolve the caller's plan tier -> image model variant. */
async function variantForUser(userId: string): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("plan").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if ((roles ?? []).some((r: { role?: string }) => r.role === "admin")) return "geminipro";
    const plan = String((profile as { plan?: string } | null)?.plan ?? "free").toLowerCase().trim();
    return TIER_MODEL[plan] ?? "schnell";
  } catch {
    return "schnell";
  }
}

async function verifyBearer(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Mirror image bytes into the private bucket and return a long-lived signed URL. */
async function persist(userId: string, bytes: Uint8Array, ext: string, contentType: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("generated-images")
    .upload(path, bytes, { contentType, upsert: true });
  if (upErr) return null;
  const { data: signed } = await supabaseAdmin.storage
    .from("generated-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl ?? null;
}

/** Pro / Pro+ path: render through the Lovable AI gateway, returning base64 PNG. */
async function generateViaAiGateway(
  variant: string,
  prompt: string,
  aspect: string,
): Promise<{ b64?: string; error?: string; status?: number }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { error: "Image generation is not configured yet.", status: 503 };

  const body =
    variant === "gptimage"
      ? {
          model: MODELS["gptimage"],
          prompt,
          size: GPT_SIZES[aspect] ?? "1024x1024",
          quality: "medium",
          n: 1,
        }
      : {
          model: MODELS["geminipro"],
          messages: [{ role: "user", content: `${prompt}\n\nAspect ratio: ${aspect}` }],
          modalities: ["image", "text"],
        };

  let res: Response;
  try {
    res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { error: `Could not reach the image service: ${String(err)}`, status: 502 };
  }

  const text = await res.text();
  if (!res.ok) {
    console.error(`[generate-image] ai gateway failed [${res.status}]: ${text.slice(0, 400)}`);
    if (res.status === 429) return { error: "Image generation is rate limited — try again shortly.", status: 429 };
    if (res.status === 402) return { error: "Image generation credits are exhausted.", status: 402 };
    return { error: `Image generation failed [${res.status}]: ${text.slice(0, 300)}`, status: res.status };
  }

  let payload: { data?: { b64_json?: string }[]; error?: { message?: string } } = {};
  try { payload = JSON.parse(text); } catch { /* non-JSON */ }
  if (payload.error?.message) return { error: payload.error.message, status: 502 };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) return { error: "Image service returned no image", status: 502 };
  return { b64 };
}

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await verifyBearer(request);
        if (!userId) return json({ error: "Unauthorized" }, 401);

        let raw: unknown;
        try { raw = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
        const body = (raw ?? {}) as { prompt?: unknown; model?: unknown; aspect_ratio?: unknown };

        const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
        if (!prompt) return json({ error: "A prompt is required" }, 400);

        // The plan tier decides the model; a client hint can never upgrade it.
        const variant = await variantForUser(userId);
        const modelPath = MODELS[variant];
        const aspect = typeof body.aspect_ratio === "string" && ASPECTS.has(body.aspect_ratio)
          ? body.aspect_ratio
          : "1:1";

        // ---- Pro / Pro+ : Lovable AI gateway ----
        if (AI_VARIANTS.has(variant)) {
          const out = await generateViaAiGateway(variant, prompt, aspect);
          if (!out.b64) return json({ error: out.error ?? "Image generation failed" }, out.status ?? 502);
          const bytes = Uint8Array.from(atob(out.b64), (c) => c.charCodeAt(0));
          let finalUrl: string | null = null;
          try { finalUrl = await persist(userId, bytes, "png", "image/png"); }
          catch (err) { console.warn("[generate-image] persist skipped:", err); }
          return json({
            url: finalUrl ?? `data:image/png;base64,${out.b64}`,
            model: modelPath,
            prompt,
            aspect_ratio: aspect,
          });
        }

        // ---- Free / Standard : Replicate ----
        // Direct Replicate token takes priority; the connector gateway is the fallback.
        const directToken = process.env["REPLICATE_API_TOKEN"];
        const lovableKey = process.env["LOVABLE_API_KEY"];
        const replicateKey = process.env["REPLICATE_API_KEY"];
        if (!directToken && (!lovableKey || !replicateKey)) {
          return json(
            { error: "Image generation is not configured yet — no Replicate credentials are available." },
            503,
          );
        }
        const base = directToken ? "https://api.replicate.com/v1" : GATEWAY;

        const headers: Record<string, string> = directToken
          ? { Authorization: `Bearer ${directToken}`, "Content-Type": "application/json" }
          : {
              Authorization: `Bearer ${lovableKey ?? ""}`,
              "X-Connection-Api-Key": replicateKey ?? "",
              "Content-Type": "application/json",
            };

        const input: Record<string, unknown> = {
          prompt,
          aspect_ratio: aspect,
          output_format: "webp",
          output_quality: 90,
        };
        if (variant === "schnell") input["num_outputs"] = 1;
        if (variant === "sd35") {
          // Stable Diffusion 3.5 Large tuning defaults.
          input["cfg"] = 4.5;
          input["steps"] = 35;
          input["prompt_strength"] = 0.85;
        }

        // The gateway only supports POST /v1/predictions with an explicit
        // version id, so resolve (and cache) the model's latest version first.
        let version = versionCache.get(modelPath);
        if (!version) {
          const meta = await fetch(`${base}/models/${modelPath}`, { headers });
          if (!meta.ok) {
            const t = await meta.text();
            return json({ error: `Could not load image model [${meta.status}]: ${t.slice(0, 200)}` }, 502);
          }
          const m = (await meta.json()) as { latest_version?: { id?: string } };
          version = m.latest_version?.id;
          if (!version) return json({ error: "Image model has no available version" }, 502);
          versionCache.set(modelPath, version);
        }

        let create: Response;
        try {
          create = await fetch(`${base}/predictions`, {
            method: "POST",
            headers,
            body: JSON.stringify({ version, input }),
          });
        } catch (err) {
          return json({ error: `Could not reach the image service: ${String(err)}` }, 502);
        }

        const createText = await create.text();
        let createJson: Record<string, unknown> = {};
        try { createJson = JSON.parse(createText) as Record<string, unknown>; } catch { /* raw text */ }
        const upstreamStatus = typeof createJson["status"] === "number" ? (createJson["status"] as number) : create.status;

        if (create.status === 402 || upstreamStatus === 402) {
          return json(
            { error: "Image generation is out of credit on the connected Replicate account. Add credit at replicate.com/account/billing, then try again." },
            402,
          );
        }
        if (!create.ok) {
          console.error(`[generate-image] create failed [${create.status}]: ${createText.slice(0, 400)}`);
          return json({ error: `Image generation failed [${create.status}]: ${createText.slice(0, 300)}` }, create.status);
        }

        const created = createJson as { id?: string; status?: string; output?: unknown };
        const id = created.id;
        if (!id) return json({ error: "Image service returned no prediction id" }, 502);

        // Poll the gateway (never the upstream urls.get) until the render finishes.
        let status = created.status ?? "starting";
        let output: unknown = created.output;
        let error: unknown = null;
        for (let i = 0; i < 90 && status !== "succeeded" && status !== "failed" && status !== "canceled"; i++) {
          await new Promise((r) => setTimeout(r, i < 6 ? 1000 : 2000));
          const poll = await fetch(`${base}/predictions/${id}`, { headers });
          if (!poll.ok) continue;
          const p = (await poll.json()) as { status?: string; output?: unknown; error?: unknown };
          status = p.status ?? status;
          output = p.output;
          error = p.error;
        }

        if (status !== "succeeded") {
          return json({ error: `Image generation ${status}${error ? `: ${String(error)}` : ""}` }, 502);
        }

        const url = Array.isArray(output) ? String(output[0] ?? "") : String(output ?? "");
        if (!url.startsWith("http")) return json({ error: "Image service returned no image" }, 502);

        // Replicate URLs expire in ~1h — mirror the bytes into project storage
        // (private bucket) and hand back a long-lived signed URL.
        let finalUrl = url;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const bytes = new Uint8Array(await res.arrayBuffer());
            const signed = await persist(userId, bytes, "webp", "image/webp");
            if (signed) finalUrl = signed;
          }
        } catch (err) {
          console.warn("[generate-image] persist skipped:", err);
        }

        return json({ url: finalUrl, model: modelPath, prompt, aspect_ratio: aspect });
      },
    },
  },
});
