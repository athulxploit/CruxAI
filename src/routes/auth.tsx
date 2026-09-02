import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { ArchLogo } from "@/components/arch/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Metrixcom" },
      { name: "description", content: "Sign in to your Metrixcom account to access your AI workspace, agents, and professional engineering tools." },
      { property: "og:title", content: "Sign in — Metrixcom" },
      { property: "og:description", content: "Access your Metrixcom AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  const [googleEnabled, setGoogleEnabled] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("registration_enabled,google_auth_enabled")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRegistrationEnabled(data.registration_enabled);
          setGoogleEnabled(data.google_auth_enabled);
        }
      });
  }, []);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !registrationEnabled) {
      toast.error("Registrations are currently disabled.");
      return;
    }
    if (mode === "signup" && !consent) {
      toast.error("Please accept the Privacy Policy and Terms of Service to continue.");
      return;
    }
    setBusy(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. You are signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setBusy(true);
    try {
      const res = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (res.error) throw res.error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <ArchLogo size={32} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-elegant">
          <h1 className="text-[18px] font-semibold tracking-tight text-center">
            {mode === "signin" ? "Sign in to Metrixcom" : "Create your account"}
          </h1>
          <p className="mt-1 text-[12.5px] text-muted-foreground text-center">
            {mode === "signin"
              ? "Continue to your workspace"
              : "Start with a free Metrixcom account"}
          </p>

          {googleEnabled && (
            <div className="mt-6 space-y-2">
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => handleOAuth("google")}
                disabled={busy}
                type="button"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.87l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Continue with Google
              </Button>
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => handleOAuth("apple")}
                disabled={busy}
                type="button"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>
          )}

          {googleEnabled && (
            <div className="my-5 flex items-center gap-3 text-[11px] text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              OR
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label className="text-[12px]">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label className="text-[12px]">Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-[12px]">Password</Label>
              <Input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>
            {mode === "signup" && (
              <label className="flex items-start gap-2 text-[11.5px] text-muted-foreground leading-snug">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                <span>
                  I agree to the <a href="/terms" target="_blank" rel="noopener" className="underline text-foreground">Terms</a> and <a href="/privacy" target="_blank" rel="noopener" className="underline text-foreground">Privacy Policy</a>, and consent to encrypted processing of my prompts.
                </span>
              </label>
            )}
            <Button type="submit" className="w-full h-10" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>


          <button
            type="button"
            className="mt-4 w-full text-[12.5px] text-muted-foreground hover:text-foreground text-center"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
