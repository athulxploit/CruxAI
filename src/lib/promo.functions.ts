import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendly, logServer } from "@/lib/errors";


export interface PromoCheckResult {
  id: string | null;
  code: string;
  kind: string | null;
  discount: number | null;
  valid: boolean;
  reason: "invalid" | "expired" | "limit_reached" | null;
}

function normalizeCode(code: unknown): string {
  if (typeof code !== "string") throw new Error("Promo code is required");
  const normalized = code.trim().toUpperCase();
  if (!normalized) throw new Error("Promo code is required");
  if (normalized.length > 64) throw new Error("Promo code is too long");
  return normalized;
}

export const checkPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string }) => ({ code: normalizeCode(input?.code) }))
  .handler(async ({ data, context }): Promise<PromoCheckResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: promo, error } = await supabaseAdmin
        .from("promotions")
        .select("id,code,kind,discount,expires_at,usage_limit,active")
        .eq("code", data.code)
        .eq("active", true)
        .maybeSingle();

      if (error) throw error;
      if (!promo) {
        return { id: null, code: data.code, kind: null, discount: null, valid: false, reason: "invalid" };
      }

      if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
        return { id: promo.id, code: promo.code, kind: promo.kind, discount: Number(promo.discount), valid: false, reason: "expired" };
      }

      if (promo.usage_limit != null) {
        const { count, error: countError } = await context.supabase
          .from("promotion_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("promo_id", promo.id)
          .eq("user_id", context.userId);
        if (countError) throw countError;
        if ((count ?? 0) >= promo.usage_limit) {
          return { id: promo.id, code: promo.code, kind: promo.kind, discount: Number(promo.discount), valid: false, reason: "limit_reached" };
        }
      }

      return { id: promo.id, code: promo.code, kind: promo.kind, discount: Number(promo.discount), valid: true, reason: null };
    } catch (err) {
      logServer("promo.check", err);
      throw new Error(friendly(err, "Couldn't check that promo code."));
    }
  });

export const redeemPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { promoId: string }) => {
    if (!input?.promoId || typeof input.promoId !== "string") throw new Error("Promo is required");
    return { promoId: input.promoId };
  })
  .handler(async ({ data, context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: insertError } = await context.supabase
        .from("promotion_redemptions")
        .insert({ user_id: context.userId, promo_id: data.promoId });
      if (insertError && insertError.code !== "23505") throw insertError;

      if (!insertError) {
        const { error: updateError } = await supabaseAdmin
          .from("promotions")
          .update({ updated_at: new Date().toISOString() } as never)
          .eq("id", data.promoId);
        if (updateError) throw updateError;
        await supabaseAdmin.rpc("increment_promo_use", { _promo_id: data.promoId } as never);
      }

      return { ok: true as const };
    } catch (err) {
      logServer("promo.redeem", err);
      throw new Error(friendly(err, "Couldn't redeem that promo code."));
    }
  });
