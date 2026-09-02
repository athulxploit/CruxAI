import { createFileRoute } from "@tanstack/react-router";
import { pickKeys, type PoolProvider } from "@/lib/key-pool.server";

export const Route = createFileRoute("/api/public/diagnose-nemotron")({
  server: {
    handlers: {
      GET: async () => {
        const provider = "openrouter";
        const modelId = "nvidia/nemotron-3-nano-30b-a3b";
        const picks = pickKeys(provider as PoolProvider);

        if (picks.length === 0) {
          return new Response(JSON.stringify({
            status: "FAILED",
            error: "No API key configured for OpenRouter",
            verification: "FAILED"
          }), { status: 400 });
        }

        const { key } = picks[0];
        
        try {
          const startTime = Date.now();
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${key}`,
              "HTTP-Referer": "https://metrixcom.com",
              "X-Title": "Metrixcom Diagnostics",
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: "user", content: "hi" }],
              max_tokens: 1,
              stream: false, // Non-streaming for verification
            }),
          });

          const duration = Date.now() - startTime;
          const status = response.status;
          const data = await response.json().catch(() => ({}));
          
          const returnedModel = data?.model;
          const success = status === 200 && returnedModel === modelId;

          const result = {
            title: "MODEL VERIFICATION",
            divider: "-------------------",
            provider: "OpenRouter",
            configuredModelId: modelId,
            apiKey: "Configured",
            apiRequest: status === 200 ? "SUCCESS" : "FAILED",
            httpStatus: status,
            returnedModelId: returnedModel || "N/A",
            fallbackUsed: "NO",
            responseReceived: data?.choices ? "YES" : "NO",
            verification: success ? "VERIFIED" : "FAILED",
            latency: `${duration}ms`,
            rawResponse: data
          };

          return new Response(JSON.stringify(result, null, 2), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({
            status: "FAILED",
            error: error.message,
            verification: "FAILED"
          }), { status: 500 });
        }
      }
    }
  }
});
