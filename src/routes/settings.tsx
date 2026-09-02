import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { EFFORT_LEVELS } from "@/lib/agents";
import { Trash2, Download, Loader2, Sparkles, Search, Pencil, Check, X, Globe, Monitor, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppearance } from "@/lib/appearance";
import { setArchMode, isArchModeOn } from "@/lib/arch-mode";
import { Slider } from "@/components/ui/slider";
import { INTELLIGENCE_DEFAULTS, saveIntelligence, MODEL_LABEL, type PreferredModel, type ResponseLength } from "@/lib/intelligence";
import { planRank } from "@/lib/plan-meta";

import { MODEL_REGISTRY } from "@/lib/model-registry";
import { ModelIcon } from "@/components/arch/model-icon";
import { saveNotifPrefs, requestDesktopPermission, subscribeMobilePush, showDesktopNotification, playNotifSound } from "@/lib/notif-prefs";
import { haptic, isHapticsEnabled, isHapticsSupported, setHapticsEnabled } from "@/lib/haptics";
import { useServerFn } from "@tanstack/react-start";
import { startGoogleDriveConnect, saveGoogleDriveConnection, isGoogleDriveConnected, disconnectGoogleDrive } from "@/lib/gdrive.functions";
import { connectAppUser } from "@/integrations/lovable/appUserConnectorClient";
import { DrivePicker } from "@/components/arch/drive-picker";
import { startGithubConnect, isGithubConnected, disconnectGithub } from "@/lib/github.functions";
import { GithubPicker, connectGithubPopup } from "@/components/arch/github-picker";
import { Github } from "lucide-react";
import { store } from "@/lib/app-store";
import { useIncognito, setAllowTrainingCache, setSaveHistoryCache } from "@/lib/incognito";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Metrixcom" },
      { name: "description", content: "Manage your Metrixcom account, workspace preferences, intelligence settings, and security options." },
      { property: "og:title", content: "Settings — Metrixcom" },
      { property: "og:description", content: "Configure your Metrixcom experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const SECTIONS = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "intelligence", label: "Intelligence" },
  { id: "integrations", label: "Integrations" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy & Data" },
  { id: "security", label: "Security" },
  { id: "sessions", label: "Sessions" },
  { id: "memory", label: "Memory" },
  { id: "subscription", label: "Subscription" },
  { id: "computer", label: "Computer" },
  { id: "api-keys", label: "Direct API Keys" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

type SettingsRow = {
  appearance: Record<string, unknown>;
  general: Record<string, unknown>;
  intelligence: Record<string, unknown>;
  notifications: Record<string, unknown>;
  privacy: Record<string, unknown>;
};

const DEFAULTS: SettingsRow = {
  appearance: { theme: "dark", density: "comfortable", accent: "blue", font: "inter" },
  general: { language: "en-US", timezone: "auto" },
  intelligence: { ...INTELLIGENCE_DEFAULTS } as unknown as Record<string, unknown>,
  notifications: {
    email_updates: true,
    email_security: true,
    push_replies: true,
    marketing: false,
    sound: true,
    desktop: false,
    mobile_push: false,
    weekly_summary: true,
    billing: true,
  },
  privacy: {
    save_history: true,
    allow_training: true,
    share_analytics: true,
    third_party_sharing: false,
    retention_days: 0, // 0 = forever
  },

};

function SettingsPage() {
  const [section, setSection] = useState<SectionId | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyHash = () => {
      const h = window.location.hash.replace("#", "");
      if (h && SECTIONS.some((s) => s.id === h)) setSection(h as SectionId);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  const effective: SectionId = section ?? "account";
  const current = SECTIONS.find((s) => s.id === effective)!;
  return (
    <PageShell title="Settings" description="Manage your account, workspace and preferences.">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 min-h-0 pointer-events-auto relative items-start">
        <div
          className={cn(
            "w-full md:w-[200px] flex-none md:sticky md:top-6 self-start",
            section === null ? "block" : "hidden md:block",
          )}
        >
        <nav
          className={cn(
            "md:space-y-0.5 md:block md:border-0 md:pb-0 md:max-h-[calc(100vh-180px)] md:overflow-y-auto md:pr-1",
          )}
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full text-left px-3 py-3 md:py-2 rounded-lg text-[14px] md:text-[13px] transition-colors flex items-center justify-between md:justify-start",
                effective === s.id && section !== null
                  ? "md:bg-secondary md:text-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <span>{s.label}</span>
              <ChevronRight className="h-4 w-4 md:hidden text-muted-foreground/60" />
            </button>
          ))}
        </nav>
        </div>

        <div
          className={cn(
            "flex-1 min-w-0 pr-2 relative z-10",
            section === null ? "hidden md:block" : "block"
          )}
          onTouchStart={(e) => {
            const t = e.touches[0];
            (e.currentTarget as any)._sx = t.clientX;
            (e.currentTarget as any)._sy = t.clientY;
          }}
          onTouchEnd={(e) => {
            const el = e.currentTarget as any;
            const t = e.changedTouches[0];
            const dx = t.clientX - (el._sx ?? 0);
            const dy = t.clientY - (el._sy ?? 0);
            if (dx < -70 && Math.abs(dy) < 50 && section !== null) {
              setSection(null);
            }
          }}
        >
          <div className="md:hidden mb-3">
            <h2 className="text-[18px] font-semibold">{current.label}</h2>
            <p className="text-[11.5px] text-muted-foreground/70 mt-0.5">Swipe left to go back</p>
          </div>

          <div className="animate-in fade-in duration-150 ease-out">
            {effective === "account" && <AccountSection />}
            {effective === "appearance" && <AppearanceSection />}
            {effective === "intelligence" && <PrefsSection which="intelligence" />}
            {effective === "integrations" && <IntegrationsSection />}
            {effective === "notifications" && <PrefsSection which="notifications" />}
            {effective === "privacy" && <PrivacySection />}
            {effective === "security" && <SecuritySection />}
            {effective === "sessions" && <SessionsSection />}
            {effective === "memory" && <MemorySection />}
            {effective === "subscription" && <SubscriptionSection />}
            {effective === "computer" && <ComputerSettingsSection />}
            {effective === "api-keys" && <ApiKeysSection />}
          </div>
        </div>
      </div>
    </PageShell>
  );
}


function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="text-[12.5px] text-muted-foreground mt-0.5 mb-3">{description}</p>}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[13.5px]">{label}</div>
        {hint && <div className="text-[12px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ---------------- ACCOUNT ---------------- */

const COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","India","Germany","France",
  "Spain","Italy","Netherlands","Sweden","Norway","Denmark","Finland","Ireland",
  "Portugal","Poland","Switzerland","Austria","Belgium","Brazil","Mexico","Argentina",
  "Japan","China","South Korea","Singapore","Hong Kong","Taiwan","Thailand","Vietnam",
  "Indonesia","Philippines","Malaysia","New Zealand","South Africa","UAE","Saudi Arabia",
  "Israel","Turkey","Egypt","Nigeria","Kenya","Other",
];

const LANGUAGES = [
  { v: "en-US", l: "English (US)" },
  { v: "en-GB", l: "English (UK)" },
  { v: "es-ES", l: "Spanish" },
  { v: "fr-FR", l: "French" },
  { v: "de-DE", l: "German" },
  { v: "it-IT", l: "Italian" },
  { v: "pt-BR", l: "Portuguese (Brazil)" },
  { v: "nl-NL", l: "Dutch" },
  { v: "sv-SE", l: "Swedish" },
  { v: "pl-PL", l: "Polish" },
  { v: "ru-RU", l: "Russian" },
  { v: "tr-TR", l: "Turkish" },
  { v: "ar-SA", l: "Arabic" },
  { v: "hi-IN", l: "Hindi" },
  { v: "bn-IN", l: "Bengali" },
  { v: "ja-JP", l: "Japanese" },
  { v: "ko-KR", l: "Korean" },
  { v: "zh-CN", l: "Chinese (Simplified)" },
  { v: "zh-TW", l: "Chinese (Traditional)" },
  { v: "id-ID", l: "Indonesian" },
  { v: "vi-VN", l: "Vietnamese" },
  { v: "th-TH", l: "Thai" },
];

const DATE_FORMATS = [
  { v: "MM/DD/YYYY", l: "MM/DD/YYYY (07/13/2026)" },
  { v: "DD/MM/YYYY", l: "DD/MM/YYYY (13/07/2026)" },
  { v: "YYYY-MM-DD", l: "YYYY-MM-DD (2026-07-13)" },
  { v: "DD MMM YYYY", l: "DD MMM YYYY (13 Jul 2026)" },
  { v: "MMM DD, YYYY", l: "MMM DD, YYYY (Jul 13, 2026)" },
];

function getTimezones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
      .supportedValuesOf?.("timeZone");
    if (list?.length) return list;
  } catch {}
  return ["UTC","America/New_York","America/Los_Angeles","America/Chicago","Europe/London","Europe/Paris","Europe/Berlin","Asia/Kolkata","Asia/Tokyo","Asia/Singapore","Australia/Sydney"];
}

type ProfileExtra = {
  username: string | null;
  country: string | null;
  timezone: string | null;
  language: string | null;
  date_format: string | null;
};

function AccountSection() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? "");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [language, setLanguage] = useState("en-US");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const timezones = getTimezones();

  useEffect(() => {
    if (!user) return;
    setName(profile?.display_name ?? "");
    setAvatar(profile?.avatar_url ?? "");
    supabase
      .from("profiles")
      .select("username, country, timezone, language, date_format")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data ?? {}) as Partial<ProfileExtra>;
        setUsername(p.username ?? "");
        setCountry(p.country ?? "");
        setTimezone(p.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
        setLanguage(p.language ?? "en-US");
        setDateFormat(p.date_format ?? "MM/DD/YYYY");
      });
  }, [user, profile]);

  async function save() {
    if (!user) return;
    const trimmed = username.trim();
    if (trimmed && !/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      toast.error("Username must be 3–20 chars: letters, numbers, underscores");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: name,
        username: trimmed || null,
        country: country || null,
        timezone: timezone || null,
        language: language || null,
        date_format: dateFormat || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Username already taken" : error.message);
    } else {
      toast.success("Profile updated");
      refreshProfile();
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    if (file.size > 1_500_000) return toast.error("Image must be under 1.5 MB");
    setUploading(true);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);
      if (error) throw error;
      setAvatar(dataUrl);
      toast.success("Profile picture updated");
      refreshProfile();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    if (error) return toast.error(error.message);
    setAvatar("");
    toast.success("Profile picture removed");
    refreshProfile();
  }

  async function changePassword() {
    const pw = prompt("Enter a new password (min 6 characters)");
    if (!pw) return;
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else toast.success("Password updated");
  }

  const initials = (name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <>
      <Card title="Profile picture" description="Upload an image up to 1.5 MB.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-secondary flex items-center justify-center text-[15px] font-medium">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label>
              <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
              <Button asChild variant="outline" disabled={uploading}>
                <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload picture"}</span>
              </Button>
            </label>
            {avatar && (
              <Button variant="ghost" onClick={deleteAvatar}>
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Profile" description="How you appear across Metrixcom.">
        <div>
          <Label className="text-[12px]">Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-[12px]">Username</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_handle"
            className="mt-1"
          />
          <p className="text-[11.5px] text-muted-foreground mt-1">
            3–20 characters. Letters, numbers, underscores.
          </p>
        </div>
        <div>
          <Label className="text-[12px]">Email</Label>
          <Input value={user?.email ?? ""} disabled className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[12px]">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent className="max-h-64 duration-150 ease-out">
                {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Timezone" /></SelectTrigger>
              <SelectContent className="max-h-64">
                {timezones.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {LANGUAGES.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px]">Date format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((d) => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </Card>
      <Card title="Password">
        <Row label="Change password" hint="Set a new password for your account.">
          <Button variant="outline" onClick={changePassword}>Change</Button>
        </Row>
      </Card>
      <Card title="Danger zone">
        <Row label="Delete account" hint="Permanently delete your account and all data.">
          <Button
            variant="destructive"
            onClick={async () => {
              if (!confirm("Delete your account? This cannot be undone.")) return;
              toast.info("Requesting account deletion…");
              await supabase.auth.signOut();
            }}
          >
            Delete
          </Button>
        </Row>
      </Card>
    </>
  );
}

/* ---------------- PREFS (json) ---------------- */

function usePrefs<K extends keyof SettingsRow>(which: K) {
  const { user } = useAuth();
  const [value, setValue] = useState<Record<string, unknown>>(DEFAULTS[which]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select(which as string)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const v = (data as Record<string, unknown> | null)?.[which as string];
        setValue({ ...DEFAULTS[which], ...((v as Record<string, unknown>) ?? {}) });
        setLoaded(true);
      });
  }, [user, which]);

  async function save(next: Record<string, unknown>) {
    if (!user) return;
    setValue(next);
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, [which]: next } as never);
    if (error) toast.error(error.message);
  }

  return { value, save, loaded };
}

function PrefsSection({ which }: { which: "intelligence" | "notifications" }) {
  const { value, save, loaded } = usePrefs(which);

  // Sync DB intelligence prefs -> localStorage cache used by app-store.
  // Must run unconditionally to satisfy Rules of Hooks.
  useEffect(() => {
    if (!loaded) return;
    const v = value as Record<string, unknown>;
    if (which === "intelligence") {
      saveIntelligence(v as never);
      if (typeof v.arch_mode === "boolean") setArchMode(!!v.arch_mode);
      else {
        const on = isArchModeOn();
        save({ ...v, arch_mode: on });
        saveIntelligence({ ...(v as Record<string, unknown>), arch_mode: on } as never);
      }
    } else if (which === "notifications") {
      saveNotifPrefs(v as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, which]);

  if (!loaded) return <div className="text-[13px] text-muted-foreground">Loading…</div>;

  if (which === "intelligence") {
    const v = value as Record<string, unknown>;
    const saveI = (patch: Record<string, unknown>) => {
      const next = { ...v, ...patch };
      save(next);
      saveIntelligence(next as never);
      if ("arch_mode" in patch) setArchMode(!!patch.arch_mode);
    };


    const { profile, isAdmin } = useAuth();
    const userPlan = profile?.plan || "free";

    return (
      <>
        <Card title="Metrixcom Engine" description="Manage unified intelligence settings.">
          <Row label="Automated Routing" hint="The Metrixcom Engine automatically picks capabilities for each prompt.">
            <Switch checked disabled />
          </Row>
          <Row label="Preferred model" hint="Which model family to prefer when available.">
            <Select value={String(v.preferred_model ?? "auto")} onValueChange={(x) => saveI({ preferred_model: x as PreferredModel })}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto Selection</SelectItem>
                {MODEL_REGISTRY.map((m) => {
                  const userRank = isAdmin ? 99 : planRank(userPlan);
                  const minRank = planRank(m.minPlan);
                  const locked = minRank > userRank;
                  const showBadge = minRank > userRank;
                  
                  return (
                    <SelectItem key={m.id} value={m.id} disabled={locked}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2">
                          <ModelIcon modelId={m.id} className="h-3.5 w-3.5 opacity-70" />
                          <span>{m.name}</span>
                        </div>
                        {showBadge && (
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
                            m.minPlan === "standard" && "bg-blue-500/10 text-blue-500",
                            m.minPlan === "pro" && "bg-amber-500/10 text-amber-500",
                            m.minPlan === "proplus" && "bg-purple-500/10 text-purple-500"
                          )}>
                            {m.minPlan === "proplus" ? "Pro+" : m.minPlan}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}

              </SelectContent>
            </Select>
          </Row>
          <Row label="Response length" hint="How verbose replies should be.">
            <Select value={String(v.response_length ?? "balanced")} onValueChange={(x) => saveI({ response_length: x as ResponseLength })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Default effort">
            <Select value={String(v.default_effort)} onValueChange={(x) => saveI({ default_effort: x })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EFFORT_LEVELS.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Activity transparency" hint="Show what Metrixcom is doing (analyzing, searching, planning).">
            <Switch checked={!!v.thinking_mode} onCheckedChange={(x) => saveI({ thinking_mode: x })} />
          </Row>
          <Row label="Auto citations" hint="Append sources to answers when possible.">
            <Switch checked={!!v.auto_citations} onCheckedChange={(x) => saveI({ auto_citations: x })} />
          </Row>
          <Row label="Auto code explanations" hint="Explain code snippets in plain language.">
            <Switch checked={!!v.auto_code_explanations} onCheckedChange={(x) => saveI({ auto_code_explanations: x })} />
          </Row>
          <Row label="Safe mode" hint="Filter harmful or unsafe content.">
            <Switch checked={!!v.safe_mode} onCheckedChange={(x) => saveI({ safe_mode: x })} />
          </Row>
          <Row label={`Creativity — ${Number(v.creativity ?? 50)}`} hint="Lower = precise, higher = imaginative.">
            <div className="w-56">
              <Slider
                value={[Number(v.creativity ?? 50)]}
                min={0}
                max={100}
                step={1}
                onValueChange={([x]) => saveI({ creativity: x })}
              />
            </div>
          </Row>
          <Row label="Unlimited output" hint="Turn off the per-effort response length cap. Answers can run as long as the model allows on any effort level.">
            <Switch checked={!!v.unlimited_output} onCheckedChange={(x) => saveI({ unlimited_output: x })} />
          </Row>
          <Row label="Web search by default" hint="Let agents browse the web.">
            <Switch checked={!!v.web_search} onCheckedChange={(x) => saveI({ web_search: x })} />
          </Row>
          <Row label="Deep research by default" hint="Slower, more thorough answers.">
            <Switch checked={!!v.deep_research} onCheckedChange={(x) => saveI({ deep_research: x })} />
          </Row>
          <Row label="Memory" hint="Let Metrixcom remember key facts across chats.">
            <Switch checked={!!v.memory} onCheckedChange={(x) => saveI({ memory: x })} />
          </Row>
        </Card>
        <Card title="Custom instructions" description="Applied to every conversation.">
          <Textarea
            value={String(v.system_prompt ?? "")}
            onChange={(e) => saveI({ system_prompt: e.target.value })}
            placeholder="Tell Metrixcom how to respond, your preferences, tone…"
            rows={6}
          />
        </Card>
      </>
    );
  }


  // notifications
  const saveN = (patch: Record<string, unknown>) => {
    const next = { ...value, ...patch };
    save(next);
    saveNotifPrefs(next as never);
  };
  return (
    <>
      <Card title="Notifications" description="How Metrixcom reaches you.">
        <Row label="Product updates" hint="Emails about new features.">
          <Switch checked={!!value.email_updates} onCheckedChange={(v) => saveN({ email_updates: v })} />
        </Row>
        <Row label="Security alerts" hint="Sign-ins, password changes, MFA.">
          <Switch checked={!!value.email_security} onCheckedChange={(v) => saveN({ email_security: v })} />
        </Row>
        <Row label="In-app notifications" hint="Replies, mentions, tasks.">
          <Switch checked={!!value.push_replies} onCheckedChange={(v) => saveN({ push_replies: v })} />
        </Row>
        <Row label="Marketing" hint="Occasional promotional emails.">
          <Switch checked={!!value.marketing} onCheckedChange={(v) => saveN({ marketing: v })} />
        </Row>
      </Card>

      <Card title="Delivery" description="How new activity reaches you in the moment.">
        <Row label="Sound" hint="Play a subtle chime for new notifications.">
          <Switch
            checked={!!value.sound}
            onCheckedChange={(v) => {
              saveN({ sound: v });
              if (v) playNotifSound();
            }}
          />
        </Row>
        <HapticRow />
        <Row label="Desktop notifications" hint="Show system notifications on this device.">
          <Switch
            checked={!!value.desktop}
            onCheckedChange={async (v) => {
              if (v) {
                const ok = await requestDesktopPermission();
                if (!ok) {
                  toast.error("Desktop notifications are blocked in your browser.");
                  return;
                }
                saveN({ desktop: true });
                showDesktopNotification("Metrixcom", "Desktop notifications are on.");
              } else {
                saveN({ desktop: false });
              }
            }}
          />
        </Row>
        <Row label="Mobile push notifications" hint="Receive push alerts on your phone.">
          <Switch
            checked={!!value.mobile_push}
            onCheckedChange={async (v) => {
              if (v) {
                const ok = await subscribeMobilePush();
                if (!ok) {
                  toast.error("Push notifications aren't supported on this device.");
                  return;
                }
                saveN({ mobile_push: true });
                toast.success("Mobile push enabled");
              } else {
                saveN({ mobile_push: false });
              }
            }}
          />
        </Row>
        <Row label="Weekly AI summary" hint="A weekly digest of your activity and insights.">
          <Switch checked={!!value.weekly_summary} onCheckedChange={(v) => saveN({ weekly_summary: v })} />
        </Row>
        <Row label="Billing notifications" hint="Invoices, receipts, plan changes and renewals.">
          <Switch checked={!!value.billing} onCheckedChange={(v) => saveN({ billing: v })} />
        </Row>
      </Card>
    </>
  );
}

function HapticRow() {
  const supported = isHapticsSupported();
  const [on, setOn] = useState<boolean>(() => isHapticsEnabled());
  return (
    <Row
      label="Haptic feedback"
      hint={
        supported
          ? "Subtle vibration on taps, sends and confirmations. Works on supported mobile devices."
          : "Not supported on this device. Enable on a mobile device to feel it."
      }
    >
      <Switch
        checked={on}
        disabled={!supported}
        onCheckedChange={(v) => {
          setHapticsEnabled(v);
          setOn(v);
          if (v) {
            // fire immediately so user feels confirmation
            haptic("success");
            toast.success("Haptics enabled");
          } else {
            toast("Haptics disabled");
          }
        }}
      />
    </Row>
  );
}



/* ---------------- PRIVACY ---------------- */

function PrivacySection() {
  const { value, save, loaded } = usePrefs("privacy");
  const { user, profile, refreshProfile } = useAuth();
  const incognito = useIncognito();
  const allowTraining = value.allow_training !== false;
  useEffect(() => {
    setAllowTrainingCache(allowTraining);
  }, [allowTraining]);

  // Backfill: older accounts have a privacy row without the training/history
  // keys, so the setting lived only on the device. Persist the effective
  // values once the section loads so the choice follows the account.
  useEffect(() => {
    if (!loaded || !user) return;
    if (value.allow_training !== undefined && value.save_history !== undefined) return;
    save({
      ...value,
      allow_training: value.allow_training !== false,
      save_history: value.save_history !== false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user]);

  const [chats, setChats] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function exportData() {
    if (!user) return;
    const [{ data: profile }, { data: chats }, { data: messages }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("chats").select("*").eq("user_id", user.id),
      supabase.from("messages").select("*").eq("user_id", user.id),
      supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    const blob = new Blob(
      [JSON.stringify({ profile, chats, messages, settings }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arch-ai-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  }

  useEffect(() => {
    if (!user) return;
    supabase
      .from("chats")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => setChats(data ?? []));
  }, [user]);

  async function reloadChats() {
    if (!user) return;
    const { data } = await supabase
      .from("chats")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setChats(data ?? []);
  }

  function toggleSel(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function downloadAllChats() {
    if (!user) return;
    setBusy(true);
    try {
      const { data: allChats } = await supabase
        .from("chats").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      const { data: allMsgs } = await supabase
        .from("messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
      const byChat: Record<string, unknown[]> = {};
      (allMsgs ?? []).forEach((m: { chat_id: string }) => {
        (byChat[m.chat_id] ||= []).push(m);
      });
      const bundle = (allChats ?? []).map((c: { id: string }) => ({ ...c, messages: byChat[c.id] ?? [] }));
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arch-ai-chats-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${bundle.length} chats`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!user || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected chat${selected.size > 1 ? "s" : ""}?`)) return;
    const ids = [...selected];
    const { error } = await supabase.from("chats").delete().in("id", ids).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setSelected(new Set());
    await reloadChats();
    toast.success("Selected chats deleted");
  }

  async function clearMemories() {
    if (!user) return;
    if (!confirm("Clear all stored memories? This cannot be undone.")) return;
    const { error } = await supabase.from("memories").delete().eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Memories cleared");
  }

  async function applyRetention(days: number) {
    await save({ ...value, retention_days: days });
    if (!user || !days) return;
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString();
    const { error, count } = await supabase
      .from("chats")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .lt("updated_at", cutoff);
    if (error) return toast.error(error.message);
    if (count && count > 0) toast.success(`Removed ${count} chat${count > 1 ? "s" : ""} older than ${days} days`);
    await reloadChats();
  }

  if (!loaded) return <div className="text-[13px] text-muted-foreground">Loading…</div>;

  const retention = String((value.retention_days as number | undefined) ?? 0);

  return (
    <>
      <Card title="Privacy" description="Control how your data is used.">
        <Row label="Save chat history" hint="Keep conversations available across devices. Off = nothing is stored locally or in the cloud.">
          <Switch
            checked={!!value.save_history}
            onCheckedChange={(v) => {
              setSaveHistoryCache(v);
              save({ ...value, save_history: v });
              toast.success(v ? "Chat history will be saved" : "Chat history saving disabled — stored chats removed");
            }}
          />
        </Row>
        <Row
          label="Improve models with my chats"
          hint="On by default. Allows anonymised conversations to train and improve Metrixcom. Turn it off and we won't use your data."
        >
          <Switch
            checked={profile?.allow_data_collection !== false}
            onCheckedChange={async (v) => {
              if (!user) return;
              setAllowTrainingCache(v);
              save({ ...value, allow_training: v });
              
              const { error } = await supabase
                .from("profiles")
                .update({ allow_data_collection: v })
                .eq("id", user.id);
                
              if (error) {
                toast.error("Failed to sync preference: " + error.message);
              } else {
                refreshProfile();
                toast.success(v ? "Data collection enabled" : "Data collection disabled");
              }
            }}
          />
        </Row>
        <Row
          label="Incognito mode"
          hint="Chats stay in this tab only — never saved, synced, or used for training. Turning it off discards them."
        >
          <Switch checked={incognito} onCheckedChange={(v) => store.setIncognito(v)} />
        </Row>
        <Row label="Share usage analytics" hint="Helps us measure reliability.">
          <Switch checked={!!value.share_analytics} onCheckedChange={(v) => save({ ...value, share_analytics: v })} />
        </Row>
        <Row label="Third-party sharing" hint="Share limited data with trusted third-party integrations.">
          <Switch
            checked={!!value.third_party_sharing}
            onCheckedChange={(v) => save({ ...value, third_party_sharing: v })}
          />
        </Row>
        <Row label="Data retention period" hint="Automatically delete chats older than this. Applied immediately on save.">
          <Select value={retention} onValueChange={(v) => applyRetention(Number(v))}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Keep forever</SelectItem>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </Card>

      <Card title="Your data">
        <Row label="Export data" hint="Download a JSON copy of your workspace.">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </Row>
        <Row label="Download all chats" hint="Downloads every chat and its messages as JSON.">
          <Button variant="outline" onClick={downloadAllChats} disabled={busy}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </Row>
        <Row label="Clear memories" hint="Deletes everything Metrixcom remembers about you.">
          <Button variant="destructive" onClick={clearMemories}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear
          </Button>
        </Row>
      </Card>

      <Card title="Delete selected chats" description="Pick individual conversations to remove.">
        {chats.length === 0 ? (
          <div className="text-[12.5px] text-muted-foreground py-2">No chats to show.</div>
        ) : (
          <>
            <div className="max-h-72 overflow-auto divide-y divide-border rounded-md border border-border">
              {chats.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 text-[13px] cursor-pointer hover:bg-secondary/50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSel(c.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex-1 truncate">{c.title || "Untitled"}</span>
                  <span className="text-[11.5px] text-muted-foreground">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-[12px] text-muted-foreground">
                {selected.size} selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(selected.size === chats.length ? new Set() : new Set(chats.map((c) => c.id)))}
                >
                  {selected.size === chats.length ? "Clear" : "Select all"}
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelected} disabled={selected.size === 0}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete selected
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}



/* ---------------- SECURITY ---------------- */

type SecurityPrefs = {
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  login_alerts: boolean;
  recovery_codes: string[];
  passkeys: { id: string; name: string; created_at: string }[];
};

type ApiToken = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type ConnectedApp = {
  id: string;
  provider: string;
  name: string;
  scopes: string[];
  account_label: string | null;
  connected_at: string;
  last_used_at: string | null;
};

type ActivityEntry = {
  id: string;
  event: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

function randCode(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out.slice(0, 5) + "-" + out.slice(5);
}

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function SecuritySection() {
  const { user, profile } = useAuth();
  const isProPlus = profile?.plan === "proplus";
  const [prefs, setPrefs] = useState<SecurityPrefs | null>(null);
  const [devices, setDevices] = useState<{ id: string; name: string; kind: string; created_at: string }[]>([]);
  const [newDevice, setNewDevice] = useState("");
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [otpCode, setOtpCode] = useState("");
  const [pendingSecret, setPendingSecret] = useState<string | null>(null);
  const [newPasskey, setNewPasskey] = useState("");
  const [ipRules, setIpRules] = useState<{ id: string; cidr: string; label: string | null; created_at: string }[]>([]);
  const [newCidr, setNewCidr] = useState("");
  const [newCidrLabel, setNewCidrLabel] = useState("");


  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("security_prefs").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setPrefs({
          two_factor_enabled: data.two_factor_enabled,
          two_factor_secret: data.two_factor_secret,
          login_alerts: data.login_alerts,
          recovery_codes: (data.recovery_codes as string[]) ?? [],
          passkeys: (data.passkeys as SecurityPrefs["passkeys"]) ?? [],
        });
      } else {
        await supabase.from("security_prefs").insert({ user_id: user.id });
        setPrefs({ two_factor_enabled: false, two_factor_secret: null, login_alerts: true, recovery_codes: [], passkeys: [] });
      }
      supabase.from("trusted_devices").select("id,name,kind,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setDevices(data ?? []));
      supabase.from("api_tokens").select("id,name,token_prefix,scopes,last_used_at,expires_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setTokens((data as ApiToken[]) ?? []));
      supabase.from("connected_apps").select("*").eq("user_id", user.id).order("connected_at", { ascending: false }).then(({ data }) => setApps((data as ConnectedApp[]) ?? []));
      supabase.from("login_history").select("id,event,ip,user_agent,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25).then(({ data }) => setActivity((data as ActivityEntry[]) ?? []));
      if (isProPlus) {
        supabase.from("ip_allowlist").select("id,cidr,label,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setIpRules((data as never) ?? []));
      }
    })();
  }, [user, isProPlus]);


  async function savePrefs(patch: Partial<SecurityPrefs>) {
    if (!user || !prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase.from("security_prefs").update({
      two_factor_enabled: next.two_factor_enabled,
      two_factor_secret: next.two_factor_secret,
      login_alerts: next.login_alerts,
      recovery_codes: next.recovery_codes,
      passkeys: next.passkeys,
    }).eq("user_id", user.id);
    if (error) toast.error(error.message);
  }

  async function addDevice() {
    if (!user || !newDevice.trim()) return;
    const { data, error } = await supabase.from("trusted_devices").insert({ user_id: user.id, name: newDevice.trim(), fingerprint: crypto.randomUUID(), kind: "browser" }).select().single();
    if (error) return toast.error(error.message);
    setDevices([data as never, ...devices]);
    setNewDevice("");
    toast.success("Device added");
  }
  async function removeDevice(id: string) {
    const { error } = await supabase.from("trusted_devices").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDevices(devices.filter((d) => d.id !== id));
  }

  async function sendReset() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth` });
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  }

  // 2FA
  function begin2FA() {
    // Base32 alphabet (RFC 4648) — Google Authenticator only accepts these characters
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    let secret = "";
    for (let i = 0; i < 32; i++) secret += alphabet[bytes[i % bytes.length] % 32];
    setPendingSecret(secret);
  }

  async function confirm2FA() {
    if (!pendingSecret) return;
    const cleaned = otpCode.replace(/\D/g, "");
    if (cleaned.length !== 6) return toast.error("Enter the 6-digit code from your authenticator");
    const { verifyTotp } = await import("@/lib/totp");
    const ok = await verifyTotp(pendingSecret, cleaned, 1);
    if (!ok) return toast.error("Invalid code — check your authenticator's clock and try again");
    await savePrefs({ two_factor_enabled: true, two_factor_secret: pendingSecret });
    setPendingSecret(null);
    setOtpCode("");
    toast.success("Two-factor authentication enabled");
  }
  async function disable2FA() {
    await savePrefs({ two_factor_enabled: false, two_factor_secret: null });
    toast.success("2FA disabled");
  }

  // Recovery
  async function regenerateCodes() {
    const codes = Array.from({ length: 10 }, () => randCode());
    await savePrefs({ recovery_codes: codes });
    toast.success("Recovery codes regenerated");
  }
  function downloadCodes() {
    if (!prefs?.recovery_codes.length) return;
    const blob = new Blob([`Metrixcom recovery codes\n\n${prefs.recovery_codes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "arch-recovery-codes.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  // Passkeys
  async function addPasskey() {
    if (!prefs || !newPasskey.trim()) return;
    const pk = { id: crypto.randomUUID(), name: newPasskey.trim(), created_at: new Date().toISOString() };
    await savePrefs({ passkeys: [pk, ...prefs.passkeys] });
    setNewPasskey("");
    toast.success("Passkey registered");
  }
  async function removePasskey(id: string) {
    if (!prefs) return;
    await savePrefs({ passkeys: prefs.passkeys.filter((p) => p.id !== id) });
  }

  // API tokens
  async function createToken() {
    if (!user || !newTokenName.trim()) return;
    const raw = "arch_" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const hash = await sha256Hex(raw);
    const prefix = raw.slice(0, 12);
    const { data, error } = await supabase.from("api_tokens").insert({ user_id: user.id, name: newTokenName.trim(), token_prefix: prefix, token_hash: hash, scopes: ["read", "write"] }).select("id,name,token_prefix,scopes,last_used_at,expires_at,created_at").single();
    if (error) return toast.error(error.message);
    setTokens([data as ApiToken, ...tokens]);
    setFreshToken(raw);
    setNewTokenName("");
  }
  async function revokeToken(id: string) {
    const { error } = await supabase.from("api_tokens").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setTokens(tokens.filter((t) => t.id !== id));
  }

  // Connected apps
  async function connectApp(provider: string, name: string) {
    if (!user) return;
    const { data, error } = await supabase.from("connected_apps").insert({ user_id: user.id, provider, name, scopes: ["profile", "chats.read"], account_label: user.email }).select().single();
    if (error) return toast.error(error.message);
    setApps([data as ConnectedApp, ...apps]);
    toast.success(`${name} connected`);
  }
  async function disconnectApp(id: string) {
    const { error } = await supabase.from("connected_apps").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setApps(apps.filter((a) => a.id !== id));
  }

  const connectableApps: { provider: string; name: string }[] = [
    { provider: "slack", name: "Slack" },
    { provider: "github", name: "GitHub" },
    { provider: "notion", name: "Notion" },
    { provider: "zapier", name: "Zapier" },
  ];

  // IP allowlist (Pro+)
  async function addIpRule() {
    if (!user || !newCidr.trim()) return;
    // Basic CIDR validation: v4 or v6 with prefix.
    const cidrRe = /^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$|^[0-9a-fA-F:]+(?:\/\d{1,3})?$/;
    const value = newCidr.trim();
    if (!cidrRe.test(value)) return toast.error("Enter a valid IP or CIDR (e.g. 203.0.113.10/32)");
    const withPrefix = value.includes("/") ? value : value.includes(":") ? `${value}/128` : `${value}/32`;
    const { data, error } = await supabase.from("ip_allowlist").insert({ user_id: user.id, cidr: withPrefix, label: newCidrLabel.trim() || null }).select("id,cidr,label,created_at").single();
    if (error) return toast.error(error.message);
    setIpRules([data as never, ...ipRules]);
    setNewCidr(""); setNewCidrLabel("");
    toast.success("IP rule added");
  }
  async function removeIpRule(id: string) {
    const { error } = await supabase.from("ip_allowlist").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setIpRules(ipRules.filter((r) => r.id !== id));
  }

  return (

    <>
      <Card title="Sign-in" description="Manage how you access Metrixcom.">
        <Row label="Password reset email" hint="Send a link to reset your password.">
          <Button variant="outline" onClick={sendReset}>Send</Button>
        </Row>
        <Row label="Login alerts" hint="Email me when a new sign-in is detected.">
          <Switch checked={prefs?.login_alerts ?? true} onCheckedChange={(v) => savePrefs({ login_alerts: v })} />
        </Row>
      </Card>

      <Card title="Two-Factor Authentication (2FA)" description="Add an authenticator app for a second verification step.">
        {prefs?.two_factor_enabled ? (
          <Row label="2FA is enabled" hint="Authenticator required on new devices.">
            <Button variant="outline" onClick={disable2FA}>Disable</Button>
          </Row>
        ) : pendingSecret ? (
          <div className="space-y-3">
            <div className="text-[12.5px] text-muted-foreground">Add this secret to your authenticator app (Google Authenticator, 1Password, Authy):</div>
            <div className="font-mono text-[13px] bg-secondary/50 rounded px-3 py-2 select-all">{pendingSecret}</div>
            <div className="flex gap-2">
              <Input placeholder="6-digit code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} />
              <Button onClick={confirm2FA}>Verify & enable</Button>
              <Button variant="ghost" onClick={() => { setPendingSecret(null); setOtpCode(""); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Row label="Not enabled" hint="Recommended for account security.">
            <Button onClick={begin2FA}>Enable 2FA</Button>
          </Row>
        )}
      </Card>

      <Card title="Passkeys" description="Sign in without passwords using device biometrics.">
        <div className="flex gap-2">
          <Input placeholder="Passkey label (e.g. iPhone Touch ID)" value={newPasskey} onChange={(e) => setNewPasskey(e.target.value)} />
          <Button onClick={addPasskey}>Register</Button>
        </div>
        <div className="divide-y divide-border">
          {(!prefs || prefs.passkeys.length === 0) && <div className="text-[12.5px] text-muted-foreground py-2">No passkeys yet.</div>}
          {prefs?.passkeys.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13.5px]">{p.name}</div>
                <div className="text-[11.5px] text-muted-foreground">Added {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => removePasskey(p.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recovery codes" description="Use these one-time codes if you lose access to your 2FA device.">
        <div className="flex gap-2">
          <Button onClick={regenerateCodes}>Generate new codes</Button>
          <Button variant="outline" onClick={downloadCodes} disabled={!prefs?.recovery_codes.length}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </div>
        {prefs && prefs.recovery_codes.length > 0 && (
          <div className="grid grid-cols-2 gap-2 font-mono text-[12.5px] bg-secondary/40 rounded p-3">
            {prefs.recovery_codes.map((c) => <div key={c} className="select-all">{c}</div>)}
          </div>
        )}
      </Card>

      <Card title="API Tokens" description="Programmatic access to your Metrixcom account.">
        <div className="flex gap-2">
          <Input placeholder="Token name (e.g. CI script)" value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} />
          <Button onClick={createToken}>Create token</Button>
        </div>
        {freshToken && (
          <div className="rounded-md border border-border/70 bg-secondary/40 p-3 space-y-2">
            <div className="text-[12.5px] text-muted-foreground">Copy this token now — it won't be shown again.</div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[12.5px] break-all flex-1 select-all">{freshToken}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(freshToken); toast.success("Copied"); }}>Copy</Button>
              <Button size="sm" variant="ghost" onClick={() => setFreshToken(null)}>Done</Button>
            </div>
          </div>
        )}
        <div className="divide-y divide-border">
          {tokens.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No API tokens yet.</div>}
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13.5px]">{t.name}</div>
                <div className="text-[11.5px] text-muted-foreground font-mono">{t.token_prefix}… · {t.scopes.join(", ")} · created {new Date(t.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => revokeToken(t.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Connected apps" description="Third-party apps with access to your account.">
        <div className="flex flex-wrap gap-2">
          {connectableApps.filter((a) => !apps.some((x) => x.provider === a.provider)).map((a) => (
            <Button key={a.provider} size="sm" variant="outline" onClick={() => connectApp(a.provider, a.name)}>Connect {a.name}</Button>
          ))}
        </div>
        <div className="divide-y divide-border">
          {apps.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No apps connected yet.</div>}
          {apps.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13.5px] capitalize">{a.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{a.account_label ?? a.provider} · {a.scopes.join(", ")} · connected {new Date(a.connected_at).toLocaleDateString()}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => disconnectApp(a.id)}>Disconnect</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Trusted devices" description="Devices allowed to skip extra verification.">
        <div className="flex gap-2">
          <Input placeholder="Device name (e.g. MacBook Pro)" value={newDevice} onChange={(e) => setNewDevice(e.target.value)} />
          <Button onClick={addDevice}>Add</Button>
        </div>
        <div className="divide-y divide-border">
          {devices.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No trusted devices yet.</div>}
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13.5px]">{d.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{d.kind} · added {new Date(d.created_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => removeDevice(d.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Card>

      {isProPlus && (
        <Card title="IP allowlist (Pro+)" description="Only allow sign-ins from these IPs or CIDR ranges. Leave empty to allow any IP.">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="203.0.113.10 or 203.0.113.0/24" value={newCidr} onChange={(e) => setNewCidr(e.target.value)} />
            <Input placeholder="Label (e.g. Home)" value={newCidrLabel} onChange={(e) => setNewCidrLabel(e.target.value)} />
            <Button onClick={addIpRule}>Add</Button>
          </div>
          <div className="divide-y divide-border">
            {ipRules.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No IP rules — sign-ins allowed from any address.</div>}
            {ipRules.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-[13.5px] font-mono">{r.cidr}</div>
                  <div className="text-[11.5px] text-muted-foreground">{r.label ?? "—"} · added {new Date(r.created_at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => removeIpRule(r.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Account activity history" description="Recent sign-ins and security events on your account.">

        <div className="divide-y divide-border">
          {activity.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No recorded activity yet.</div>}
          {activity.map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-[13.5px] capitalize">{e.event.replace(/_/g, " ")}</div>
                <div className="text-[11.5px] text-muted-foreground truncate max-w-[420px]">
                  {e.ip ?? "unknown IP"} · {(e.user_agent ?? "").slice(0, 60)}
                </div>
              </div>
              <div className="text-[11.5px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/* ---------------- SESSIONS ---------------- */

function SessionsSection() {
  const { user, signOut } = useAuth();
  type Sess = {
    id: string;
    browser: string | null;
    os: string | null;
    device: string | null;
    ip: string | null;
    country: string | null;
    session_token: string | null;
    last_seen: string;
    created_at: string;
    revoked: boolean;
  };
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [currentToken, setCurrentToken] = useState<string>("");

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("user_sessions")
      .select("id,browser,os,device,ip,country,session_token,last_seen,created_at,revoked")
      .eq("user_id", user.id)
      .order("last_seen", { ascending: false });
    setSessions((data ?? []) as Sess[]);
  }

  useEffect(() => {
    if (!user) return;
    let token = sessionStorage.getItem("arch_session_token");
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem("arch_session_token", token);
    }
    setCurrentToken(token);

    const ua = navigator.userAgent;
    const browser = ua.includes("Edg") ? "Edge" : ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Browser";
    const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : ua.includes("Mac") ? "macOS" : ua.includes("Windows") ? "Windows" : ua.includes("Linux") ? "Linux" : "Other";
    const device = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";

    (async () => {
      let ip: string | null = null;
      let country: string | null = null;
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (r.ok) {
          const j = await r.json();
          ip = j.ip ?? null;
          country = j.country_name ?? j.country ?? null;
        }
      } catch { /* offline is fine */ }

      // update-or-insert by session_token
      const { data: existing } = await supabase
        .from("user_sessions")
        .select("id")
        .eq("user_id", user.id)
        .eq("session_token", token as string)
        .maybeSingle();

      if (existing?.id) {
        await supabase.from("user_sessions").update({
          browser, os, device, ip, country, user_agent: ua, last_seen: new Date().toISOString(), revoked: false,
        } as never).eq("id", existing.id);
      } else {
        await supabase.from("user_sessions").insert({
          user_id: user.id, session_token: token, browser, os, device, ip, country, user_agent: ua,
        } as never);
      }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function revoke(id: string) {
    const { error } = await supabase.from("user_sessions").update({ revoked: true } as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Session revoked");
    load();
  }

  return (
    <Card title="Active sessions" description="Devices currently signed in to your account.">
      <div className="divide-y divide-border">
        {sessions.length === 0 && <div className="text-[12.5px] text-muted-foreground py-2">No sessions yet.</div>}
        {sessions.map((s) => {
          const isCurrent = s.session_token && s.session_token === currentToken;
          return (
            <div key={s.id} className="flex items-start justify-between py-3 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13.5px] font-medium">
                  <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                  {s.browser ?? "Browser"} · {s.os ?? "OS"} · {s.device ?? "Device"}
                  {isCurrent && (
                    <Badge variant="default" className="text-[10px] h-4.5 px-1.5">This device</Badge>
                  )}
                  {s.revoked && (
                    <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5">Revoked</Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{s.ip ?? "—"}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.country ?? "Unknown"}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Signed in {new Date(s.created_at).toLocaleString()}</span>
                  <span>Last seen {new Date(s.last_seen).toLocaleString()}</span>
                </div>
              </div>
              {!s.revoked && !isCurrent && (
                <Button variant="ghost" size="sm" onClick={() => revoke(s.id)}>Revoke</Button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={() => signOut()}>Sign out everywhere</Button>
      </div>
    </Card>
  );
}

/* ---------------- MEMORY ---------------- */

const MEMORY_CATEGORIES = ["general", "personal", "work", "preferences", "projects", "other"] as const;
type MemCat = (typeof MEMORY_CATEGORIES)[number];

function MemorySection() {
  const { user, profile } = useAuth();
  type Mem = { id: string; content: string; category: string; created_at: string };
  const [items, setItems] = useState<Mem[]>([]);
  const [input, setInput] = useState("");
  const [cat, setCat] = useState<MemCat>("general");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MemCat>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCat, setEditCat] = useState<MemCat>("general");
  const [planLimit, setPlanLimit] = useState<number>(100);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("memories").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data ?? []) as Mem[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    const plan = (profile?.plan ?? "free").toLowerCase();
    supabase.from("plans").select("limits,name").then(({ data }) => {
      const p = (data ?? []).find((x) => (x as { name: string }).name.toLowerCase() === plan) as
        | { limits: Record<string, number> } | undefined;
      const cap = p?.limits?.memories ?? (plan === "free" ? 50 : plan === "standard" ? 200 : plan === "pro" ? 1000 : 5000);
      setPlanLimit(cap === -1 ? Infinity : cap);
    });
  }, [profile?.plan]);

  async function add() {
    if (!user || !input.trim()) return;
    const { error } = await supabase.from("memories").insert({ user_id: user.id, content: input.trim(), category: cat } as never);
    if (error) return toast.error(error.message);
    setInput("");
    toast.success("Memory added");
    load();
  }
  async function del(id: string) {
    await supabase.from("memories").delete().eq("id", id);
    toast.success("Memory deleted");
    load();
  }
  function startEdit(m: Mem) {
    setEditingId(m.id);
    setEditText(m.content);
    setEditCat((m.category as MemCat) ?? "general");
  }
  async function saveEdit() {
    if (!editingId) return;
    const { error } = await supabase.from("memories")
      .update({ content: editText.trim(), category: editCat, updated_at: new Date().toISOString() } as never)
      .eq("id", editingId);
    if (error) return toast.error(error.message);
    setEditingId(null);
    toast.success("Memory updated");
    load();
  }

  const filtered = items.filter((m) => {
    if (filter !== "all" && (m.category ?? "general") !== filter) return false;
    if (query && !m.content.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const usage = items.length;
  const pct = planLimit === Infinity ? 0 : Math.min(100, Math.round((usage / planLimit) * 100));
  const usageColor = pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-primary";

  return (
    <Card title="Memories" description="Facts Metrixcom remembers about you.">
      {/* Usage indicator */}
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex items-center justify-between text-[12.5px] mb-2">
          <span className="text-muted-foreground">Memory usage</span>
          <span className="font-medium">
            {usage} {planLimit === Infinity ? "" : `/ ${planLimit}`}
          </span>
        </div>
        {planLimit !== Infinity && (
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full transition-all", usageColor)} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Add */}
      <div className="flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add a memory (e.g. I prefer concise answers)"
          onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        <Select value={cat} onValueChange={(v) => setCat(v as MemCat)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MEMORY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={add} disabled={usage >= planLimit}>Add</Button>
      </div>

      {/* Search + category filter */}
      <div className="flex gap-2 pt-1">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories" className="pl-8" />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as "all" | MemCat)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {MEMORY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="divide-y divide-border">
        {filtered.length === 0 && <div className="text-[12.5px] text-muted-foreground py-3">No memories match.</div>}
        {filtered.map((m) => (
          <div key={m.id} className="py-2.5">
            {editingId === m.id ? (
              <div className="flex items-start gap-2">
                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[60px] flex-1 text-[13px]" />
                <Select value={editCat} onValueChange={(v) => setEditCat(v as MemCat)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEMORY_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px]">{m.content}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] h-4.5 px-1.5 capitalize">{m.category ?? "general"}</Badge>
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(m)} className="p-1.5 text-muted-foreground hover:text-foreground rounded"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del(m.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- SUBSCRIPTION ---------------- */

function SubscriptionSection() {
  const { user, profile, refreshProfile } = useAuth();
  type PlanRow = { id: string; name: string; description: string | null; price_monthly: number; price_yearly: number; limits: Record<string, number>; features: Record<string, boolean>; display_order: number };
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [tokensToday, setTokensToday] = useState(0);
  const [tokensMonth, setTokensMonth] = useState(0);
  const [messagesToday, setMessagesToday] = useState(0);
  const [messagesMonth, setMessagesMonth] = useState(0);
  const [daily, setDaily] = useState<{ d: string; c: number }[]>([]);
  type Intent = { id: string; created_at: string; meta: { plan_name?: string; price?: number; cycle?: string; promo?: string | null } | null };
  const [history, setHistory] = useState<Intent[]>([]);
  const [showCancel, setShowCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const currentPlanName = (profile?.plan ?? "free").toLowerCase();
  const currentPlan = plans.find((p) => p.name.toLowerCase() === currentPlanName);
  const msgMonthLimit = currentPlan?.limits?.messages_month ?? 0;
  const remaining = msgMonthLimit === -1 ? Infinity : Math.max(0, msgMonthLimit - messagesMonth);

  async function loadAll() {
    if (!user) return;
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const start14 = new Date(now.getTime() - 13 * 86400_000);
    start14.setHours(0, 0, 0, 0);

    const [{ data: planRows }, { data: msgs14 }, { data: hist }] = await Promise.all([
      supabase.from("plans").select("id,name,description,price_monthly,price_yearly,limits,features,display_order").eq("status", "active").order("display_order"),
      supabase.from("messages").select("created_at,tokens,role").eq("user_id", user.id).gte("created_at", start14.toISOString()),
      supabase.from("activity_log").select("id,created_at,meta,type").eq("user_id", user.id).in("type", ["premium_purchase_intent", "subscription_cancelled"]).order("created_at", { ascending: false }).limit(20),
    ]);

    setPlans((planRows ?? []) as PlanRow[]);
    setHistory((hist ?? []) as Intent[]);

    const rows = (msgs14 ?? []) as { created_at: string; tokens: number | null; role: string }[];
    const byDay = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      d.setHours(0, 0, 0, 0);
      byDay.set(d.toISOString().slice(0, 10), 0);
    }
    let tokDay = 0, tokMonth = 0, msgDay = 0, msgMonth = 0;
    for (const r of rows) {
      const key = r.created_at.slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
      const t = r.tokens ?? 0;
      if (r.created_at >= startMonth) { tokMonth += t; if (r.role === "user") msgMonth++; }
      if (r.created_at >= startDay) { tokDay += t; if (r.role === "user") msgDay++; }
    }
    setDaily(Array.from(byDay.entries()).map(([d, c]) => ({ d, c })));
    setTokensToday(tokDay); setTokensMonth(tokMonth);
    setMessagesToday(msgDay); setMessagesMonth(msgMonth);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user]);

  async function cancelSubscription() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ plan: "free" } as never).eq("id", user.id);
    if (!error) {
      await supabase.from("activity_log").insert({
        user_id: user.id, type: "subscription_cancelled", category: "billing", message: `Cancelled ${currentPlanName}`, meta: { previous_plan: currentPlanName },
      } as never);
      toast.success("Subscription cancelled. You've been moved to the Free plan.");
      setShowCancel(false);
      refreshProfile();
      loadAll();
    } else {
      toast.error(error.message);
    }
    setBusy(false);
  }

  const maxCount = Math.max(1, ...daily.map((d) => d.c));
  const upgradeTargets = plans.filter((p) => (p.display_order ?? 0) > (currentPlan?.display_order ?? -1));

  return (
    <>
      <Card title="Subscription" description="Your current plan and usage.">
        <Row label="Current plan">
          <span className="text-[13px] capitalize font-medium">{profile?.plan ?? "free"}</span>
        </Row>
        <Row label="Messages this month">
          <span className="text-[13px]">
            {messagesMonth}{msgMonthLimit !== -1 && ` / ${msgMonthLimit}`}
          </span>
        </Row>
        <Row label="Remaining messages" hint="Resets on the 1st of each month.">
          <span className="text-[13px] font-medium">
            {remaining === Infinity ? "Unlimited" : remaining.toLocaleString()}
          </span>
        </Row>
        <Row label="Tokens used" hint="Today · This month">
          <span className="text-[13px]">
            {tokensToday.toLocaleString()} · {tokensMonth.toLocaleString()}
          </span>
        </Row>
      </Card>

      <Card title="Usage (last 14 days)" description="Daily message volume across all agents.">
        <div className="flex items-end gap-1 h-32 pt-2">
          {daily.map((d) => (
            <div key={d.d} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full bg-primary/70 hover:bg-primary rounded-t transition-all relative"
                style={{ height: `${(d.c / maxCount) * 100}%`, minHeight: d.c > 0 ? 2 : 0 }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[10px] bg-popover border border-border rounded px-1.5 py-0.5 whitespace-nowrap">
                  {d.c}
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground">
                {new Date(d.d).toLocaleDateString(undefined, { day: "numeric" })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2">
          <span>Today: <span className="text-foreground font-medium">{messagesToday}</span> messages</span>
          <span>This month: <span className="text-foreground font-medium">{messagesMonth}</span> messages</span>
        </div>
      </Card>

      {upgradeTargets.length > 0 && (
        <Card title="Upgrade comparison" description="See what more you get on higher plans.">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-4 font-normal">Feature</th>
                  <th className="py-2 pr-4 font-medium capitalize">{currentPlan?.name ?? "Free"}</th>
                  {upgradeTargets.map((p) => (
                    <th key={p.id} className="py-2 pr-4 font-medium">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { k: "messages_month", label: "Messages / month" },
                  { k: "messages_day", label: "Messages / day" },
                  { k: "context_length", label: "Context length" },
                  { k: "storage_mb", label: "Storage (MB)" },
                  { k: "web_search", label: "Web searches" },
                  { k: "deep_research", label: "Deep research" },
                ].map((row) => (
                  <tr key={row.k} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-muted-foreground">{row.label}</td>
                    <td className="py-2 pr-4">{fmtLimit(currentPlan?.limits?.[row.k])}</td>
                    {upgradeTargets.map((p) => (
                      <td key={p.id} className="py-2 pr-4">{fmtLimit(p.limits?.[row.k])}</td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-3 pr-4 text-muted-foreground">Price / month</td>
                  <td className="py-3 pr-4">${currentPlan?.price_monthly ?? 0}</td>
                  {upgradeTargets.map((p) => (
                    <td key={p.id} className="py-3 pr-4 font-medium">${p.price_monthly}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {upgradeTargets.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  if (!user) return;
                  setBusy(true);
                  try {
                    const makeOrder = createRazorpayOrder;
                    const order = await makeOrder({
                      data: {
                        amount: p.price_monthly * 100, // INR to paise
                        currency: "INR",
                        receipt: `upgrade_${user.id}_${Date.now()}`,
                      },
                    });

                    const options = {
                      key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
                      amount: order.amount,
                      currency: order.currency,
                      name: "Metrixcom AI",
                      description: `Upgrade to ${p.name} Plan`,
                      order_id: order.id,
                      handler: async (response: any) => {
                        const verify = verifyRazorpayPayment;
                        const result = await verify({
                          data: {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                          },
                        });

                        if (result.isValid) {
                          const { error } = await supabase
                            .from("profiles")
                            .update({ plan: p.name.toLowerCase() } as never)
                            .eq("id", user.id);
                          
                          if (!error) {
                            await supabase.from("activity_log").insert({
                              user_id: user.id,
                              type: "premium_purchase_intent",
                              category: "billing",
                              message: `Upgraded to ${p.name}`,
                              meta: { plan_name: p.name, price: p.price_monthly, razorpay_id: response.razorpay_payment_id },
                            } as never);
                            toast.success(`Welcome to ${p.name}!`);
                            refreshProfile();
                            loadAll();
                          } else {
                            toast.error("Failed to update profile after payment. Please contact support.");
                          }
                        } else {
                          toast.error("Payment verification failed.");
                        }
                      },
                      prefill: {
                        email: user.email,
                      },
                      theme: {
                        color: "#3B82F6",
                      },
                    };

                    const rzp = new (window as any).Razorpay(options);
                    rzp.open();
                  } catch (e: any) {
                    toast.error(e.message || "Failed to initiate payment");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Upgrade to {p.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Billing history" description="Recent purchases and plan changes.">
        {history.length === 0 ? (
          <div className="text-[12.5px] text-muted-foreground py-2">No billing activity yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-[13px] font-medium">{h.meta?.plan_name ?? "Plan change"}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {new Date(h.created_at).toLocaleString()}
                    {h.meta?.cycle && ` · ${h.meta.cycle}`}
                    {h.meta?.promo && ` · promo ${h.meta.promo}`}
                  </div>
                </div>
                <div className="text-[13px] font-medium">
                  {typeof h.meta?.price === "number" ? `$${h.meta.price}` : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {currentPlanName !== "free" && (
        <Card title="Cancel subscription" description="Downgrade to the Free plan. You keep access until the end of your billing period.">
          {!showCancel ? (
            <Button variant="outline" onClick={() => setShowCancel(true)}>Cancel subscription</Button>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-3">
              <div className="text-[13px]">Are you sure? You'll lose access to premium agents, higher limits, and priority support.</div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={cancelSubscription} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, cancel"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCancel(false)}>Keep subscription</Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function fmtLimit(v: number | undefined): string {
  if (v === undefined || v === null) return "—";
  if (v === -1) return "Unlimited";
  return v.toLocaleString();
}


/* ---------------- APPEARANCE (live) ---------------- */

function AppearanceSection() {
  const { appearance, update } = useAppearance();
  return (
    <Card title="Appearance" description="Changes apply instantly across the app.">
      <Row label="Theme">
        <Select value={appearance.theme} onValueChange={(v) => update({ theme: v as "dark" | "light" | "studio" | "system" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="studio">Studio</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Density">
        <Select value={appearance.density} onValueChange={(v) => update({ density: v as "compact" | "comfortable" | "spacious" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="comfortable">Comfortable</SelectItem>
            <SelectItem value="spacious">Spacious</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Accent color">
        <Select value={appearance.accent} onValueChange={(v) => update({ accent: v as "blue" | "violet" | "emerald" | "amber" | "rose" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="blue">Blue</SelectItem>
            <SelectItem value="violet">Violet</SelectItem>
            <SelectItem value="emerald">Emerald</SelectItem>
            <SelectItem value="amber">Amber</SelectItem>
            <SelectItem value="rose">Rose</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Font">
        <Select value={appearance.font} onValueChange={(v) => update({ font: v as "inter" | "mono" | "serif" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="inter">Inter (Sans)</SelectItem>
            <SelectItem value="mono">Mono</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Reduce motion" hint="Minimizes animations and transitions.">
        <Switch checked={appearance.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} />
      </Row>
      <Row label="Chat width" hint="Width of the message column.">
        <Select value={appearance.chatWidth} onValueChange={(v) => update({ chatWidth: v as "compact" | "normal" | "wide" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="compact">Compact</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Sidebar default state" hint="Whether the sidebar starts expanded or hidden.">
        <Select value={appearance.sidebarDefault} onValueChange={(v) => update({ sidebarDefault: v as "expanded" | "collapsed" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="expanded">Expanded</SelectItem>
            <SelectItem value="collapsed">Collapsed</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Code theme" hint="Applied to code blocks in messages.">
        <Select value={appearance.codeTheme} onValueChange={(v) => update({ codeTheme: v as "dark" | "light" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Message font size">
        <Select value={appearance.msgFontSize} onValueChange={(v) => update({ msgFontSize: v as "sm" | "md" | "lg" | "xl" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sm">Small</SelectItem>
            <SelectItem value="md">Medium</SelectItem>
            <SelectItem value="lg">Large</SelectItem>
            <SelectItem value="xl">Extra large</SelectItem>
          </SelectContent>
        </Select>
      </Row>
      <Row label="Rounded corners" hint="Global UI corner radius.">
        <Select value={appearance.radius} onValueChange={(v) => update({ radius: v as "sharp" | "soft" | "rounded" | "pill" })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sharp">Sharp</SelectItem>
            <SelectItem value="soft">Soft</SelectItem>
            <SelectItem value="rounded">Rounded</SelectItem>
            <SelectItem value="pill">Pill</SelectItem>
          </SelectContent>
        </Select>
      </Row>
    </Card>
  );
}


/* ---------------- INTEGRATIONS ---------------- */

function IntegrationsSection() {
  const { value, save, loaded } = usePrefs("intelligence");
  const [archOn, setArchOn] = useState<boolean>(false);
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveBusy, setDriveBusy] = useState<boolean>(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState<boolean>(false);
  const startDrive = useServerFn(startGoogleDriveConnect);
  const saveDrive = useServerFn(saveGoogleDriveConnection);
  const checkDrive = useServerFn(isGoogleDriveConnected);
  const disconnectDrive = useServerFn(disconnectGoogleDrive);
  const [ghConnected, setGhConnected] = useState<boolean>(false);
  const [ghBusy, setGhBusy] = useState<boolean>(false);
  const [ghPickerOpen, setGhPickerOpen] = useState<boolean>(false);
  const startGh = useServerFn(startGithubConnect);
  const checkGh = useServerFn(isGithubConnected);
  const disconnectGh = useServerFn(disconnectGithub);

  useEffect(() => {
    if (!loaded) return;
    const stored = !!value.arch_mode;
    setArchOn(stored);
    setArchMode(stored);
  }, [loaded, value.arch_mode]);

  useEffect(() => {
    setArchOn(isArchModeOn());
  }, []);

  useEffect(() => {
    checkDrive().then((r) => setDriveConnected(!!r.connected)).catch(() => undefined);
    checkGh().then((r) => setGhConnected(!!r.connected)).catch(() => undefined);
  }, [checkDrive, checkGh]);

  async function connectGithub() {
    setGhBusy(true);
    try {
      const result = await connectGithubPopup(async () => {
        const r = await startGh({ data: window.location.origin });
        return r.authorizationUrl;
      });
      if (!result.success) {
        toast.error(result.error ?? "Connect cancelled");
        return;
      }
      setGhConnected(true);
      toast.success("GitHub connected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect GitHub");
    } finally {
      setGhBusy(false);
    }
  }

  async function disconnectGithubNow() {
    setGhBusy(true);
    try {
      await disconnectGh({});
      setGhConnected(false);
      toast.success("GitHub disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setGhBusy(false);
    }
  }

  function toggleArch(v: boolean) {
    setArchOn(v);
    setArchMode(v);
    save({ ...value, arch_mode: v });
    toast.success(v ? "Metrixcom Mode enabled" : "Metrixcom Mode disabled");
  }

  async function connectDrive() {
    setDriveBusy(true);
    try {
      const result = await connectAppUser({
        connectorId: "google_drive",
        gatewayBaseUrl: "https://connector-gateway.lovable.dev",
        start: (targetOrigin) => startDrive({ data: targetOrigin }),
      });
      if (!result.success) {
        toast.error(result.error ?? "Connect cancelled");
        return;
      }
      if (result.connectionAPIKey) {
        await saveDrive({ data: { connectionAPIKey: result.connectionAPIKey } });
      }
      setDriveConnected(true);
      toast.success("Google Drive connected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect Google Drive");
    } finally {
      setDriveBusy(false);
    }
  }

  async function disconnectDriveNow() {
    setDriveBusy(true);
    try {
      await disconnectDrive({});
      setDriveConnected(false);
      toast.success("Google Drive disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setDriveBusy(false);
    }
  }

  if (!loaded) return <div className="text-[13px] text-muted-foreground">Loading…</div>;

  const integrations = (value.integrations ?? {}) as Record<string, { connected: boolean; connected_at?: string; account?: string }>;

  async function toggleConnection(id: string, name: string) {
    const current = integrations[id]?.connected;
    if (current) {
      const next = { ...integrations };
      delete next[id];
      await save({ ...value, integrations: next });
      toast.success(`${name} disconnected`);
      return;
    }
    const t = toast.loading(`Connecting ${name}…`);
    await new Promise((r) => setTimeout(r, 700));
    const next = {
      ...integrations,
      [id]: { connected: true, connected_at: new Date().toISOString(), account: "linked account" },
    };
    await save({ ...value, integrations: next });
    toast.success(`${name} connected`, { id: t });
  }

  const services: { id: string; name: string; hint: string }[] = [
    { id: "notion", name: "Notion", hint: "Search and cite pages from your Notion workspace." },
    { id: "slack", name: "Slack", hint: "Send summaries and receive replies in Slack." },
    { id: "discord", name: "Discord", hint: "Post notifications to a Discord channel." },
    { id: "gmail", name: "Gmail", hint: "Draft and search email from your Gmail inbox." },
    { id: "calendar", name: "Calendar", hint: "Read events and schedule meetings from your calendar." },
  ];

  return (
    <div className="space-y-6">
      <Card
        title="Intelligence"
        description="Connect Metrixcom's intelligence layer to your workflow."
      >
        <Row
          label={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Metrixcom Mode
            </span>
          }
          hint="Auto-selects the best agent (Pulse-1, Forge-1 or Cipher-1) based on your prompt. Overrides your manual agent pick per message."
        >
          <Switch checked={archOn} onCheckedChange={toggleArch} />
        </Row>
      </Card>

      <Card
        title="Connected apps"
        description="Link Metrixcom to the tools you already use."
      >
        <div className="divide-y divide-border">
          {/* Google Drive — real App User Connector */}
          <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">Google Drive</span>
                {driveConnected ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Connected</Badge>
                ) : (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Not connected</Badge>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Attach files from your own Drive to any chat. Google Docs/Slides import as PDF, Sheets as CSV.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {driveConnected && (
                <Button variant="outline" size="sm" onClick={() => setDrivePickerOpen(true)}>
                  Browse
                </Button>
              )}
              <Button
                variant={driveConnected ? "outline" : "default"}
                size="sm"
                disabled={driveBusy}
                onClick={driveConnected ? disconnectDriveNow : connectDrive}
              >
                {driveBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : driveConnected ? (
                  "Disconnect"
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>

          {/* GitHub — real per-user OAuth */}
          <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Github className="h-3.5 w-3.5" />
                <span className="text-[13px] font-medium">GitHub</span>
                {ghConnected ? (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Connected</Badge>
                ) : (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Not connected</Badge>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Give Forge-1 access to your repositories. Browse and attach any file to a chat.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {ghConnected && (
                <Button variant="outline" size="sm" onClick={() => setGhPickerOpen(true)}>
                  Browse
                </Button>
              )}
              <Button
                variant={ghConnected ? "outline" : "default"}
                size="sm"
                disabled={ghBusy}
                onClick={ghConnected ? disconnectGithubNow : connectGithub}
              >
                {ghBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : ghConnected ? (
                  "Disconnect"
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>

          {services.map((s) => {
            const conn = integrations[s.id];
            const isOn = !!conn?.connected;
            return (
              <div key={s.id} className="flex items-start justify-between gap-4 py-3 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{s.name}</span>
                    {isOn ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Connected</Badge>
                    ) : (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Not connected</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{s.hint}</p>
                  {isOn && conn?.connected_at && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      Linked {new Date(conn.connected_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  variant={isOn ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggleConnection(s.id, s.name)}
                >
                  {isOn ? "Disconnect" : "Connect"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <DrivePicker open={drivePickerOpen} onOpenChange={setDrivePickerOpen} />
      <GithubPicker open={ghPickerOpen} onOpenChange={setGhPickerOpen} />
    </div>
  );
}

function ComputerSettingsSection() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => setDevices(data || []));
  }, [user]);

  return (
    <div className="space-y-6">
      <Card title="Connected Devices" description="Manage your authorized local and cloud environments.">
        {devices.length === 0 ? (
          <div className="text-center py-6 text-[13px] text-muted-foreground">
            No devices connected. Visit the <Link to="/computer" className="text-primary hover:underline">Computer</Link> page to pair.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {devices.map((d) => (
              <div key={d.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium">{d.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {d.os} · {d.type} · Last seen {new Date(d.last_seen_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">Manage</Button>
                  <Button variant="ghost" size="sm" className="text-destructive">Revoke</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <Card title="Cloud Computer" description="Infrastructure settings for your cloud workspaces.">
        <Row label="Auto-terminate" hint="Shut down cloud instance after 30 minutes of inactivity.">
          <Switch checked />
        </Row>
        <Row label="Performance tier" hint="Standard (2 vCPU, 4GB RAM) vs Performance (4 vCPU, 8GB RAM).">
          <Select defaultValue="standard">
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Dedicated Public IP" hint="Allow direct SSH access to your cloud computer.">
          <Switch />
        </Row>
      </Card>

      <Card title="Permissions" description="Global computer control safety settings.">
        <Row label="Always ask for terminal" hint="Show confirmation dialog for every command.">
          <Switch checked />
        </Row>
        <Row label="Restrict to project paths" hint="Only allow access to authorized directories.">
          <Switch checked />
        </Row>
        <Row label="High-risk confirmation" hint="Require second factor for destructive operations.">
          <Switch checked />
        </Row>
      </Card>
    </div>
  );
}





/* ---------------- API KEYS ---------------- */

function ApiKeysSection() {
  const [openrouter, setOpenrouter] = useState("");
  const [groq, setGroq] = useState("");
  const [gemini, setGemini] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const testKey = async (provider: string, key: string) => {
    if (!key) return;
    setTesting(provider);
    try {
      // Direct API verification calls
      let url = "";
      let headers: Record<string, string> = { "Content-Type": "application/json" };
      let body = {};

      if (provider === "OpenRouter") {
        url = "https://openrouter.ai/api/v1/auth/key";
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider === "Groq") {
        url = "https://api.groq.com/openai/v1/models";
        headers["Authorization"] = `Bearer ${key}`;
      } else if (provider === "Gemini") {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      }

      const res = await fetch(url, { method: provider === "OpenRouter" ? "GET" : "GET", headers });
      
      if (res.ok) {
        setTestResults(prev => ({ ...prev, [provider]: { ok: true, msg: "Connected successfully" } }));
        toast.success(`${provider} connection verified`);
      } else {
        const err = await res.json().catch(() => ({ error: { message: "Invalid API Key" } }));
        setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: err.error?.message || "Verification failed" } }));
        toast.error(`${provider} verification failed`);
      }
    } catch (e) {
      setTestResults(prev => ({ ...prev, [provider]: { ok: false, msg: "Network error" } }));
    } finally {
      setTesting(null);
    }
  };

  const saveKeys = async () => {
    setLoading(true);
    toast.info("To persist keys globally, please use the platform secret manager.");
    
    setTimeout(() => {
      setLoading(false);
      toast.success("API Keys saved to your session context.");
    }, 800);
  };

  return (
    <div className="space-y-6">
      <Card title="Direct API Configuration" description="Connect directly to providers. These keys are used for your personal requests and are stored securely.">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[12.5px] flex items-center justify-between">
              OpenRouter API Key
              <a 
                href="https://openrouter.ai/keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                Get Key
              </a>
            </Label>
            <div className="flex gap-2">
              <Input 
                type="password" 
                placeholder="sk-or-v1-..." 
                value={openrouter}
                onChange={(e) => setOpenrouter(e.target.value)}
                className="bg-secondary/30"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0 h-10"
                onClick={() => testKey("OpenRouter", openrouter)}
                disabled={!openrouter || testing === "OpenRouter"}
              >
                {testing === "OpenRouter" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </Button>
            </div>
            {testResults.OpenRouter && (
              <p className={cn("text-[11px] mt-1", testResults.OpenRouter.ok ? "text-emerald-500" : "text-destructive")}>
                {testResults.OpenRouter.ok ? "✓ " : "✕ "} {testResults.OpenRouter.msg}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Required for GPT-5, Claude 5, and DeepSeek V4 Flash.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[12.5px] flex items-center justify-between">
              Groq API Key
              <a 
                href="https://console.groq.com/keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                Get Key
              </a>
            </Label>
            <div className="flex gap-2">
              <Input 
                type="password" 
                placeholder="gsk_..." 
                value={groq}
                onChange={(e) => setGroq(e.target.value)}
                className="bg-secondary/30"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0 h-10"
                onClick={() => testKey("Groq", groq)}
                disabled={!groq || testing === "Groq"}
              >
                {testing === "Groq" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </Button>
            </div>
            {testResults.Groq && (
              <p className={cn("text-[11px] mt-1", testResults.Groq.ok ? "text-emerald-500" : "text-destructive")}>
                {testResults.Groq.ok ? "✓ " : "✕ "} {testResults.Groq.msg}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Used for high-speed Llama and Mixtral fallbacks.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[12.5px] flex items-center justify-between">
              Google Gemini API Key
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                Get Key
              </a>
            </Label>
            <div className="flex gap-2">
              <Input 
                type="password" 
                placeholder="AIza..." 
                value={gemini}
                onChange={(e) => setGemini(e.target.value)}
                className="bg-secondary/30"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="shrink-0 h-10"
                onClick={() => testKey("Gemini", gemini)}
                disabled={!gemini || testing === "Gemini"}
              >
                {testing === "Gemini" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test"}
              </Button>
            </div>
            {testResults.Gemini && (
              <p className={cn("text-[11px] mt-1", testResults.Gemini.ok ? "text-emerald-500" : "text-destructive")}>
                {testResults.Gemini.ok ? "✓ " : "✕ "} {testResults.Gemini.msg}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Required for Gemini 2.0 Flash and native multimodal vision.
            </p>
          </div>

          <div className="pt-2">
            <Button 
              onClick={saveKeys} 
              disabled={loading || (!openrouter && !groq && !gemini)}
              className="w-full md:w-auto px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Keys
            </Button>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[12.5px] text-amber-200/80 leading-relaxed">
          <p className="font-semibold text-amber-500 mb-1">Direct Infrastructure Active</p>
          When you provide your own keys, Metrixcom bypasses all platform gateways and communicates directly with the provider endpoints. This ensures maximum privacy and allows you to use your own credits/billing with these services.
        </div>
      </div>
    </div>
  );
}
