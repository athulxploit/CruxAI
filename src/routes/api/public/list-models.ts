import { createFileRoute } from '@tanstack/react-router';
import { MODEL_REGISTRY } from '@/lib/model-registry';

export const Route = createFileRoute('/api/public/list-models')({
  server: {
    handlers: {
      GET: async () => {
        const models = MODEL_REGISTRY.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          tier: m.minPlan,
          api_model: m.openRouterId,
          api_provider: 'openrouter'

        }));

        return new Response(JSON.stringify({
          count: models.length,
          models: models
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});
