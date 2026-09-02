import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getRequest } from "@tanstack/react-start/server";
import { pickKeys, type PoolProvider } from "@/lib/key-pool.server";
import { MODEL_REGISTRY } from "@/lib/model-registry";

// Internal admin check
const isAdmin = async (userId: string) => {
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!roleData;
};

export const Route = createFileRoute("/api/public/test-models")({
  server: {
    handlers: {
      POST: async () => {
        const request = getRequest();
        if (!request) return new Response("No request", { status: 400 });

        // 1. Verify admin
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });
        
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        
        if (authError || !user || !(await isAdmin(user.id))) {
          return new Response("Forbidden", { status: 403 });
        }

        const TEST_PROMPT = "Respond with exactly the word 'OK'.";
        const results = [];

        // We run these sequentially to avoid hammering providers and to get clean latency numbers
        for (const model of MODEL_REGISTRY) {
          const startTime = Date.now();
          let status: 'success' | 'error' = "success";
          let errorMessage = null;
          let responseText = null;

          try {
            const picks = pickKeys("openrouter");
            if (picks.length === 0) throw new Error("No OpenRouter API key");
            
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${picks[0].key}`,
                "HTTP-Referer": "https://metrixcom.com",
                "X-Title": "Metrixcom Test Suite",
              },
              body: JSON.stringify({
                model: model.openRouterId,
                messages: [{ role: "user", content: TEST_PROMPT }],
                max_tokens: 10,
                stream: false,
              }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
            
            responseText = data?.choices?.[0]?.message?.content;
          } catch (err: any) {
            status = "error";
            errorMessage = err.message;
          }

          const latency = Date.now() - startTime;

          // Record to DB
          await supabaseAdmin.from("xcomm_test_logs").insert({
            model_id: model.id,
            prompt: TEST_PROMPT,
            response: responseText,
            latency_ms: latency,
            status: status,
            error_message: errorMessage
          });

          // Also record to the general usage table for the dashboard to pick up real latency trends
          await supabaseAdmin.from("xcomm_model_usage").insert({
            user_id: user.id,
            model_key: model.openRouterId,
            total_tokens: 0,
            input_tokens: 0,
            output_tokens: 0,
            provider: "openrouter",
            provider_model_id: model.openRouterId,
            status: status,
            latency_ms: latency
          });

          results.push({ model: model.id, latency, status });
        }

        return new Response(JSON.stringify({ ok: true, results }), {
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
});
