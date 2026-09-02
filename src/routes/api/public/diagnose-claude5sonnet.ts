import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/diagnose-claude5sonnet')({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ 
            status: 'FAILED', 
            error: 'API Key missing' 
          }), { status: 400 });
        }

        const modelId = 'anthropic/claude-sonnet-5';
        
        try {
          const startTime = Date.now();
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://arch.ai',
              'X-Title': 'Metrixcom Diagnostic',
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Connection test. Respond with "VERIFIED"' }],
              max_tokens: 10,
            }),
          });

          const data = await response.json();
          const returnedModel = data.model || data.id || 'unknown';
          const latency = Date.now() - startTime;
          
          return new Response(JSON.stringify({
            status: response.ok ? 'SUCCESS' : 'FAILED',
            httpStatus: response.status,
            modelSent: modelId,
            modelReturned: returnedModel,
            fallback: returnedModel !== modelId ? 'YES' : 'NO',
            responseReceived: !!data.choices?.[0]?.message?.content,
            verification: (response.ok && returnedModel === modelId) ? 'VERIFIED' : 'FAILED',
            latency: `${latency}ms`,
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ 
            status: 'FAILED', 
            error: err.message 
          }), { status: 500 });
        }
      }
    }
  }
});
