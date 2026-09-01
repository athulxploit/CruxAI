import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { verifyTotp } from "@/lib/totp";
import { friendly, logServer } from "@/lib/errors";

export interface MfaResult {
  ok: boolean;
  verified: boolean;
  error?: string;
}

/**
 * Server-side TOTP verification. On success, stamps `mfa_verified_at` on the
 * user's `security_prefs` row (valid for 30 minutes, enforced by RLS via
 * `public.mfa_ok`). This is what actually gates access to chats, messages,
 * files and memories — the client UI gate is only a UX layer.
 */
export const verifyMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { code: string }) => ({
    code: String(input?.code ?? "").replace(/\D/g, "").slice(0, 6),
  }))
  .handler(async ({ data, context }): Promise<MfaResult> => {
    try {
      if (data.code.length !== 6) {
        return { ok: false, verified: false, error: "Enter the 6-digit code." };
      }
      const { supabase, userId } = context;
      const { data: prefs, error } = await supabase
        .from("security_prefs")
        .select("two_factor_enabled, two_factor_secret")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!prefs?.two_factor_enabled || !prefs.two_factor_secret) {
        // Nothing to verify — treat as ok so the client doesn't loop.
        return { ok: true, verified: false };
      }
      const ok = await verifyTotp(prefs.two_factor_secret, data.code, 1);
      if (!ok) return { ok: false, verified: false, error: "Invalid code. Please try again." };
      const { error: upErr } = await supabase
        .from("security_prefs")
        .update({ mfa_verified_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (upErr) throw upErr;
      return { ok: true, verified: true };
    } catch (err) {
      logServer("mfa.verify", err);
      return { ok: false, verified: false, error: friendly(err, "Couldn't verify your code.") };
    }
  });

/** Clear the verification stamp (e.g. on sign-out or manual lock). */
export const clearMfa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, userId } = context;
      const { error } = await supabase
        .from("security_prefs")
        .update({ mfa_verified_at: null })
        .eq("user_id", userId);
      if (error) throw error;
      return { ok: true as const };
    } catch (err) {
      logServer("mfa.clear", err);
      return { ok: false as const, error: friendly(err, "Couldn't clear your MFA session.") };
    }
  });
