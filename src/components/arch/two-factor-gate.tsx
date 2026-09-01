// Post-login 2FA challenge. When a user has two_factor_enabled=true, we
// gate the authenticated UI behind a TOTP code. Verification happens
// server-side (src/lib/mfa.functions.ts → verifyMfa) which stamps
// `security_prefs.mfa_verified_at`. RLS policies on chats/messages/files/
// memories use `public.mfa_ok(auth.uid())` so a valid Supabase access
// token WITHOUT a fresh MFA stamp cannot read that data even if the UI
// gate is bypassed.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useServerFn } from "@tanstack/react-start";
import { verifyMfa } from "@/lib/mfa.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<"loading" | "ok" | "challenge">("loading");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const verifyFn = useServerFn(verifyMfa);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("security_prefs")
        .select("two_factor_enabled, mfa_verified_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.two_factor_enabled) { setState("ok"); return; }
      const stamp = data.mfa_verified_at ? new Date(data.mfa_verified_at).getTime() : 0;
      const fresh = stamp > Date.now() - 30 * 60 * 1000;
      setState(fresh ? "ok" : "challenge");
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function submit() {
    setBusy(true);
    try {
      const res = await verifyFn({ data: { code } });
      if (!res?.ok) { toast.error(res?.error ?? "Invalid code"); return; }
      setState("ok");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (state === "challenge") {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
          <div className="text-lg font-semibold">Two-factor verification</div>
          <div className="mt-1 text-[13px] text-muted-foreground">
            Enter the 6-digit code from your authenticator app. Verified server-side; valid for 30 minutes.
          </div>
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            className="mt-4 tracking-widest text-center text-lg"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) submit(); }}
          />
          <div className="mt-4 flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            >
              Sign out
            </Button>
            <Button disabled={busy || code.length !== 6} onClick={submit}>
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
