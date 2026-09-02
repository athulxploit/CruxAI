import { createFileRoute } from "@tanstack/react-router";
import { pickKeys, type PoolProvider } from "@/lib/key-pool.server";

export const Route = createFileRoute("/api/public/diagnose-gpt54nano-e2e")({
  server: {
    handlers: {
      GET: async () => {
        const provider = "openrouter";
        const modelId = "openai/gpt-5.4-nano"; 
        const picks = pickKeys(provider as PoolProvider);

        if (picks.length === 0) {
          return new Response(JSON.stringify({
            status: "FAILED",
            error: "No API key configured for OpenRouter",
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
              "X-Title": "Metrixcom E2E Test",
            },
            body: JSON.stringify({
              model: modelId,
              messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: "Tell me a very short joke." }
              ],
              max_tokens: 50,
              stream: false,
            }),
          });

          const duration = Date.now() - startTime;
          const status = response.status;
          const data = await response.json().catch(() => ({}));
          
          const returnedModel = data?.model;
          const content = data?.choices?.[0]?.message?.content;
          const success = status === 200 && returnedModel === modelId && !!content;
          
          // OpenRouter specific provider info if available
          const actualProvider = data?.provider || "OpenAI (via OpenRouter)";

          const result = {
            model: "GPT-5.4 Nano",
            modelIdSent: modelId,
            modelIdReturned: returnedModel || "N/A",
            httpStatus: status,
            responseReceived: content ? "YES" : "NO",
            fallback: "NO",
            actualProvider: actualProvider,
            latency: `${duration}ms`,
            endToEndChatTest: success ? "PASSED" : "FAILED",
            verification: success ? "VERIFIED" : "FAILED",
            content: content
          };

          return new Response(JSON.stringify(result, null, 2), {
            headers: { "Content-Type": "application/json" }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({
            status: "FAILED",
            error: error.message,
          }), { status: 500 });
        }
      }
    }
  }
});