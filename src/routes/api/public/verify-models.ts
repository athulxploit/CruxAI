import { createFileRoute } from '@tanstack/react-router';
import { MODEL_REGISTRY } from '@/lib/model-registry';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/api/public/verify-models')({
  server: {
    handlers: {
      GET: async () => {
        const results = [];
        
        for (const model of MODEL_REGISTRY) {
          const start = Date.now();
          try {
            const apiKey = process.env['OPENROUTER_API_KEY'];
            if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: model.openRouterId,
                messages: [{ role: 'user', content: 'respond with ok' }],
                max_tokens: 5,
              })
            });

            const latency = Date.now() - start;
            const data = await resp.json();
            
            results.push({
              model: model.name,
              id: model.openRouterId,
              status: resp.status,
              latency_ms: latency,
              ok: resp.ok && (data.choices?.[0]?.message?.content?.toLowerCase().includes('ok') || data.choices?.length > 0)
            });
          } catch (err: any) {
            results.push({
              model: model.name,
              id: model.openRouterId,
              status: 'error',
              error: err.message
            });
          }
        }

        return new Response(JSON.stringify(results, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});
