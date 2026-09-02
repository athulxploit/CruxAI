import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const workflowSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
});

export const saveWorkflow = createServerFn({ method: "POST" })
  .validator((data: unknown) => workflowSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = "00000000-0000-0000-0000-000000000000"; 
    
    if (data.id && data.id !== 'new') {
      const { data: wf, error } = await supabaseAdmin
        .from('workflows')
        .update({
          name: data.name,
          description: data.description || null,
          nodes: data.nodes as any,
          edges: data.edges as any,
          status: (data.status as any) || 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return wf;
    } else {
      const { data: wf, error } = await supabaseAdmin
        .from('workflows')
        .insert({
          user_id: userId,
          name: data.name,
          description: data.description || null,
          nodes: data.nodes as any,
          edges: data.edges as any,
          status: (data.status as any) || 'draft'
        })
        .select()
        .single();
        
      if (error) throw new Error(error.message);
      return wf;
    }
  });

export const getWorkflows = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .order('updated_at', { ascending: false });
      
    if (error) throw new Error(error.message);
    return data || [];
  });

export const getWorkflowById = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: id }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw new Error(error.message);
    return data;
  });

export const executeWorkflow = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    workflowId: z.string(),
    input: z.any().optional()
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: execution, error } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        workflow_id: data.workflowId,
        user_id: "00000000-0000-0000-0000-000000000000",
        status: 'running',
        input: data.input || {},
        start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    
    return execution;
  });

export const getExecutionHistory = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.string().parse(data))
  .handler(async ({ data: workflowId }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('start_time', { ascending: false });
      
    if (error) throw new Error(error.message);
    return data || [];
  });
