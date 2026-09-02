import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/diagnose-glm52')({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not found' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const modelId = 'z-ai/glm-5.2:free';
        console.log(`[diagnose-glm52] Testing ${modelId} via OpenRouter...`);

        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://metrixcom.com',
              'X-Title': 'Metrixcom Diagnostic',
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Respond only with "GLM-5.2 Verified"' }],
              max_tokens: 10,
            }),
          });

          const data = await response.json();
          const returnedModelId = data?.model;
          const content = data?.choices?.[0]?.message?.content?.trim();

          const result = {
            provider: 'OpenRouter',
            displayModel: 'GLM-5.2',
            configuredModelId: modelId,
            apiKey: 'Configured',
            apiRequest: response.ok ? 'SUCCESS' : 'FAILED',
            httpStatus: response.status,
            returnedModelId: returnedModelId || 'unknown',
            fallbackUsed: (returnedModelId && returnedModelId !== modelId) ? 'YES' : 'NO',
            responseReceived: content ? 'YES' : 'NO',
            content: content,
            verification: (response.ok && returnedModelId === modelId) ? 'VERIFIED' : 'FAILED',
          };

          return new Response(JSON.stringify(result, null, 2), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
