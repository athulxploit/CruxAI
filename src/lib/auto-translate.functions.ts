import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { friendly, logServer } from "@/lib/errors";

const InputSchema = z.object({
  texts: z.array(z.string().min(1).max(2000)).min(1).max(200),
  targetLang: z.string().min(2).max(10),
});

export interface TranslateResponse {
  translations: string[];
  error?: string;
}

export const translateBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => {
    const parsed = InputSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid translation request.");
    }
    return parsed.data;
  })
  .handler(async ({ data }): Promise<TranslateResponse> => {
    const { texts, targetLang } = data;
    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Translation service is not configured.");

      const system = `You are a professional UI translator. Translate the given array of English UI strings into ${targetLang}. 
Rules:
- Preserve meaning and tone (concise, product UI).
- Keep proper nouns, brand names (Metrixcom, Pulse-1, Forge-1, Cipher-1, Premium, Google), numbers, emojis, and code identifiers unchanged.
- Preserve leading/trailing whitespace, punctuation, and case style where sensible.
- Return STRICT JSON only in the exact shape: {"translations": string[]} with the same length and order as the input.`;

      const user = JSON.stringify({ texts });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      let res: Response;
      try {
        res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`AI gateway ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = (await res.json().catch(() => ({}))) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content ?? "{}";
      let parsed: { translations?: string[] } = {};
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {};
      }
      const translations = Array.isArray(parsed.translations) ? parsed.translations : [];
      // Pad/truncate to input length to keep alignment safe.
      const out = texts.map((t, i) => (typeof translations[i] === "string" ? translations[i] : t));
      return { translations: out };
    } catch (err) {
      logServer("translate.batch", err);
      // Graceful fallback: return original text so UI stays intact.
      return { translations: texts, error: friendly(err, "Translation is temporarily unavailable.") };
    }
  });
