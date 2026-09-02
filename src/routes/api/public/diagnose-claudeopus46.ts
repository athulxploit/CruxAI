import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/diagnose-claudeopus46')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = process.env['OPENROUTER_API_KEY'];
        if (!key) {
          return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'HTTP-Referer': 'https://arch.ai',
              'X-Title': 'Crux AI Diagnostic',
            },
            body: JSON.stringify({
              model: 'anthropic/claude-opus-4.6',
              messages: [{ role: 'user', content: 'Respond with "Claude Opus 4.6 Verified"' }],
              max_tokens: 10,
            }),
          });

          const data = await response.json();
          return new Response(JSON.stringify({
            status: response.status,
            model_sent: 'anthropic/claude-opus-4.6',
            model_returned: data.model || (data.choices?.[0]?.message ? 'unknown' : 'error'),
            response: data.choices?.[0]?.message?.content || 'No content',
            full_data: data
          }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
