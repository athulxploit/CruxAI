import { createFileRoute } from '@tanstack/react-router'
import { pickKeys } from '@/lib/key-pool.server'

export const Route = createFileRoute('/api/public/diagnose-deepseekv4flash')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const provider = 'openrouter'
        const modelId = 'deepseek/deepseek-chat' 
        
        const picks = pickKeys(provider as any)
        if (picks.length === 0) {
          return Response.json({ verified: false, error: 'No OpenRouter API key configured' })
        }
        
        const key = picks[0].key
        const start = Date.now()
        
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`,
              'X-Title': 'Metrixcom Diagnostic',
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'Say "DeepSeek V4 Flash Verified"' }],
              max_tokens: 10,
            }),
          })
          
          const latency = Date.now() - start
          const data = await res.json()
          
          if (!res.ok) {
            return Response.json({
              verified: false,
              httpStatus: res.status,
              error: data.error || 'API request failed',
              latency
            })
          }
          
          const returnedModel = data.model
          const verified = returnedModel === modelId
          
          return Response.json({
            verified,
            provider,
            configuredModelId: modelId,
            returnedModelId: returnedModel,
            httpStatus: res.status,
            latency,
            response: data.choices?.[0]?.message?.content
          })
        } catch (err: any) {
          return Response.json({ verified: false, error: err.message, latency: Date.now() - start })
        }
      }
    }
  }
})
