import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getBlueprint = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { workspaceId: string }) => z.object({ workspaceId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { workspaceId } = data;
    const { userId, supabase } = context;

    const { data: blueprint, error } = await (supabase as any)
      .from("blueprints")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!blueprint) return null;

    const { data: items, error: itemsError } = await (supabase as any)
      .from("blueprint_items")
      .select("*")
      .eq("blueprint_id", blueprint.id)
      .order("order_index", { ascending: true });

    if (itemsError) throw itemsError;

    return { ...blueprint, items };
  });

export const updateBlueprintItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({
    id: z.string(),
    patch: z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.string().optional(),
      meta: z.record(z.any()).optional(),
    })
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, patch } = data;
    const { userId, supabase } = context;

    const { data: item } = await (supabase as any)
      .from("blueprint_items")
      .select("blueprint_id")
      .eq("id", id)
      .single();

    if (!item) throw new Error("Item not found");

    const { data: blueprint } = await (supabase as any)
      .from("blueprints")
      .select("user_id")
      .eq("id", item.blueprint_id)
      .single();

    if (blueprint?.user_id !== userId) throw new Error("Unauthorized");

    const { data: result, error } = await (supabase as any)
      .from("blueprint_items")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  });

export const createBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({
    workspaceId: z.string(),
    title: z.string(),
    tagline: z.string().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { workspaceId, title, tagline } = data;
    const { userId, supabase } = context;

    // Generate unique Protocol ID
    const protocolId = `XCOMM-PRJ-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

    const { data: result, error } = await (supabase as any)
      .from("blueprints")
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        title,
        tagline: tagline ?? 'Your project\'s living intelligence.',
        protocol_id: protocolId,
        status: 'discovery',
        completeness: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return result;
  });

export const updateBlueprintStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: any) => z.object({
    id: z.string(),
    patch: z.object({
      status: z.string().optional(),
      completeness: z.number().optional(),
      progress: z.number().optional(),
      current_milestone: z.string().optional(),
      project_type: z.string().optional(),
      tagline: z.string().optional(),
      title: z.string().optional(),
    })
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, patch } = data;
    const { userId, supabase } = context;

    const { data: blueprint, error: fetchError } = await (supabase as any)
      .from("blueprints")
      .select("user_id")
      .eq("id", id)
      .single();

    if (fetchError || blueprint?.user_id !== userId) throw new Error("Unauthorized");

    const { data: result, error } = await (supabase as any)
      .from("blueprints")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return result;
  });
