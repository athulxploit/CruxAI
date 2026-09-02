import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/diagnose-deepseek-v4')({
  server: {
    handlers: {
      GET: async () => {
        const apiKey = process.env['OPENROUTER_API_KEY'];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not set' }), { status: 500 });
        }

        const modelId = 'deepseek/deepseek-v4-flash';
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'X-Title': 'Metrixcom Diagnostic',
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Say "DeepSeek V4 Flash Verified"' }],
              max_tokens: 10,
            }),
          });

          const data = await res.json();
          return new Response(JSON.stringify({
            status: res.status,
            model: modelId,
            returned_model: data?.model,
            response: data?.choices?.[0]?.message?.content,
            error: data?.error
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
})
