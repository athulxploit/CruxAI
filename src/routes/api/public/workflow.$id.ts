import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/workflow/$id')({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const id = (params as any).id;
        const body = await request.json();
        
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        
        const { data: execution, error } = await supabaseAdmin
          .from('workflow_executions')
          .insert({
            workflow_id: id,
            status: 'running',
            input: body,
            start_time: new Date().toISOString(),
            user_id: '00000000-0000-0000-0000-000000000000'
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ 
          message: 'Workflow triggered', 
          executionId: execution.id 
        }), { 
          status: 202,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
})
