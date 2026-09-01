// Dev-only sanity check. Routes through the same server proxy the app uses,
// so no provider API keys ever hit the browser.
export async function testGroq() {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    console.log('Not signed in');
    return { status: 401, body: 'Not signed in' };
  }
  const res = await fetch('/api/ai-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      maxTokens: 100,
      effort: 'low',
      messages: [{ role: 'user', content: 'Say hello' }],
    }),
  });
  const text = await res.text();
  console.log('Status:', res.status, 'Body:', text.slice(0, 200));
  return { status: res.status, body: text };
}
