import { createFileRoute } from "@tanstack/react-router";
import { pickKeys } from "@/lib/key-pool.server";

export const Route = createFileRoute("/api/public/diagnose-gpt56sol")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const modelId = "openai/gpt-5.6-sol";
        const picks = pickKeys("openrouter");
        const key = picks[0]?.key;

        if (!key) {
          return new Response(JSON.stringify({ 
            status: "FAILED", 
            error: "No OpenRouter API key configured" 
          }), { status: 401 });
        }

        try {
          const start = Date.now();
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${key}`,
              "HTTP-Referer": "https://arch.ai",
              "X-Title": "Metrixcom Diagnostics",
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: "user", content: "Connection test." }],
              max_tokens: 5,
            }),
          });

          const latency = Date.now() - start;
          const data = await response.json();
          
          if (!response.ok) {
             return new Response(JSON.stringify({ 
              status: "FAILED", 
              httpStatus: response.status,
              error: data.error || "Upstream error"
            }), { status: response.status });
          }

          return new Response(JSON.stringify({
            status: "SUCCESS",
            httpStatus: response.status,
            modelSent: modelId,
            modelReturned: data.model,
            latency,
            verified: data.model === modelId || data.model?.includes("gpt-5.6-sol")
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ 
            status: "FAILED", 
            error: err.message 
          }), { status: 500 });
        }
      }
    }
  }
});
