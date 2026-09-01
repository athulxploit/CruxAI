// Client helper for FLUX.1 image generation. Talks only to our own
// /api/generate-image route — no provider keys in the browser.

export type FluxVariant = "schnell" | "dev" | "pro";

export interface GeneratedImage {
  url: string;
  model: string;
  prompt: string;
  aspect_ratio: string;
}

/** Heuristic: does this prompt ask for an image to be created? */
export function detectImageRequest(text: string): { prompt: string; aspect: string } | null {
  const t = text.trim();
  if (!t) return null;
  const verb = /\b(generate|create|make|draw|render|design|paint|illustrate|imagine|produce|give me)\b/i;
  const noun = /\b(image|images|picture|pictures|photo|photos|artwork|art|illustration|drawing|poster|wallpaper|logo|icon|render|sketch|painting|thumbnail)\b/i;
  const explicit = /^\/(image|img|imagine)\b/i;

  if (!explicit.test(t) && !(verb.test(t) && noun.test(t))) return null;
  // Avoid hijacking questions *about* images ("how do I compress an image?")
  if (/\b(how do|how can|how to|what is|why does|explain|analy[sz]e|compress|resize|convert)\b/i.test(t) && !explicit.test(t)) {
    return null;
  }

  let prompt = t
    .replace(explicit, "")
    .replace(/^\s*(please\s+)?(can you\s+)?(generate|create|make|draw|render|design|paint|illustrate|imagine|produce|give me)\s+(me\s+)?(an?\s+|some\s+)?/i, "")
    .replace(/^(image|images|picture|pictures|photo|photos|artwork|illustration|drawing|render)\s+(of|showing|with|for)\s+/i, "")
    .trim();
  if (!prompt) prompt = t;

  let aspect = "1:1";
  if (/\b(wide|widescreen|landscape|banner|16:9|cinematic)\b/i.test(t)) aspect = "16:9";
  else if (/\b(portrait|vertical|9:16|story|phone wallpaper)\b/i.test(t)) aspect = "9:16";
  else if (/\b(4:3)\b/.test(t)) aspect = "4:3";

  return { prompt: prompt.slice(0, 2000), aspect };
}

export async function generateImage(
  prompt: string,
  opts?: { model?: FluxVariant; aspect?: string },
): Promise<GeneratedImage> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please sign in to generate images.");

  const res = await fetch("/api/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      prompt,
      model: opts?.model ?? "schnell",
      aspect_ratio: opts?.aspect ?? "1:1",
    }),
  });

  const text = await res.text();
  let payload: { url?: string; error?: string; model?: string; aspect_ratio?: string } = {};
  try { payload = JSON.parse(text); } catch { /* non-JSON error body */ }

  if (!res.ok || !payload.url) {
    throw new Error(payload.error || `Image generation failed [${res.status}]`);
  }
  return {
    url: payload.url,
    model: payload.model ?? "black-forest-labs/flux-schnell",
    prompt,
    aspect_ratio: payload.aspect_ratio ?? opts?.aspect ?? "1:1",
  };
}
