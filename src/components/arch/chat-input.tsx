import { useRef, useState } from "react";
import {
  Paperclip,
  ArrowUp,
  Camera,
  Image as ImageIcon,
  File,
  Globe,
  Search,
  Sparkles,
  X,
  HardDrive,
  Github,
} from "lucide-react";
import { store, useApp } from "@/lib/app-store";
import { AGENTS, EFFORT_LEVELS, getAgent } from "@/lib/agents";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePlatform } from "@/lib/platform";
import { toast } from "sonner";
import { isArchModeOn, pickAgentForPrompt, setArchMode } from "@/lib/arch-mode";
import { useEffect } from "react";
import { useAgentsConfig, useAgentsConfigState, isAgentAvailable, diagnoseAgent } from "@/lib/agents-config";
import { useMessageLimit, incrementUsed } from "@/lib/msg-limit";
import { useRateLimit } from "@/lib/rate-limit";
import { AlertTriangle, Ban, Clock } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { PrivacyDisclaimer } from "./privacy-disclaimer";
import { DrivePicker } from "./drive-picker";
import { GithubPicker } from "./github-picker";

interface Attachment {
  name: string;
  size: number;
  path: string;
  mime?: string;
}

export function ChatInput() {
  const [value, setValue] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [ghPickerOpen, setGhPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archOn, setArchOn] = useState<boolean>(() => isArchModeOn());
  useEffect(() => {
    const h = (e: Event) => setArchOn(!!(e as CustomEvent).detail);
    window.addEventListener("arch:arch_mode", h);
    return () => window.removeEventListener("arch:arch_mode", h);
  }, []);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const camInputRef = useRef<HTMLInputElement>(null);
  const agentId = useApp((s) => s.agent);
  const cipherMode = useApp((s) => s.cipherMode);
  const effort = useApp((s) => s.effort);
  const agent = getAgent(agentId);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { flags, settings } = usePlatform();
  const agentsState = useAgentsConfigState();
  const agentConfigs = agentsState.configs;
  const availability = isAgentAvailable(agentConfigs, agentId);
  const diagnostic = diagnoseAgent(agentsState, agentId);
  const limit = useMessageLimit();
  const rl = useRateLimit();
  const blocked = (!authLoading && !isAdmin && !availability.ok) || limit.blocked || rl.active;

  // Warn once per threshold as the user approaches / hits their daily cap.
  useEffect(() => {
    if (!limit.enforced || !user?.id || limit.limit == null) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `arch:msg_warn:${user.id}:${today}`;
    let fired: Record<string, boolean> = {};
    try { fired = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* ignore */ }
    const mark = (tier: string) => {
      fired[tier] = true;
      try { localStorage.setItem(key, JSON.stringify(fired)); } catch { /* ignore */ }
    };
    if (limit.blocked && !fired.blocked) {
      toast.error("Daily message limit reached", {
        description: `You've used all ${limit.limit} messages for today. Resets at midnight UTC.`,
      });
      mark("blocked");
      return;
    }
    const r = limit.remaining;
    if (r <= 1 && !fired.t1) {
      toast.warning("1 message left today", {
        description: `You have 1 of ${limit.limit} daily messages remaining.`,
      });
      mark("t1");
    } else if (r <= 5 && !fired.t5) {
      toast.warning(`${r} messages left today`, {
        description: `You're close to your daily limit of ${limit.limit}.`,
      });
      mark("t5");
    } else if (r <= Math.max(10, Math.ceil(limit.limit * 0.2)) && !fired.t20) {
      toast(`Heads up — ${r} messages left today`, {
        description: `Approaching your daily limit of ${limit.limit}.`,
      });
      mark("t20");
    }
  }, [limit.enforced, limit.remaining, limit.blocked, limit.limit, user?.id]);
  const maxMb = settings?.global_limits?.max_upload_size_mb ?? settings?.max_upload_mb ?? 20;
  const maxAttach = settings?.global_limits?.max_attachments ?? 10;

  function autoresize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }

  async function handleFiles(list: FileList | null) {
    if (!list || !user) return;
    setUploading(true);
    const added: Attachment[] = [];
    for (const file of Array.from(list)) {
      if (attachments.length + added.length >= maxAttach) {
        toast.error(`Max ${maxAttach} attachments`);
        break;
      }
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxMb}MB`);
        continue;
      }
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage
        .from("user-files")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (error) {
        toast.error(error.message);
        continue;
      }
      await supabase.from("files").insert({
        user_id: user.id,
        name: file.name,
        mime: file.type || null,
        size_bytes: file.size,
        storage_path: path,
      });
      added.push({ name: file.name, size: file.size, path, mime: file.type || undefined });
    }
    setAttachments((a) => [...a, ...added]);
    setUploading(false);
    if (added.length) toast.success(`${added.length} file(s) attached`);
  }

  function send() {
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    let effectiveAgent = agentId;
    if (text && isArchModeOn()) {
      const picked = pickAgentForPrompt(text);
      // If Metrixcom picked an unavailable agent, fall back to first available
      const pickedAvail = isAgentAvailable(agentConfigs, picked);
      if (!isAdmin && !pickedAvail.ok) {
        const fallback = AGENTS.find((a) => isAgentAvailable(agentConfigs, a.id).ok);
        if (!fallback) {
          toast.error("All agents are currently unavailable.");
          return;
        }
        effectiveAgent = fallback.id;
      } else {
        effectiveAgent = picked;
      }
      if (effectiveAgent !== agentId) store.setAgent(effectiveAgent);
    }
    const avail = isAgentAvailable(agentConfigs, effectiveAgent);
    if (!isAdmin && !avail.ok) {
      toast.error(
        avail.reason === "maintenance"
          ? `${getAgent(effectiveAgent).name} is under maintenance.`
          : `${getAgent(effectiveAgent).name} is currently disabled.`,
      );
      return;
    }
    if (limit.blocked || rl.active) {
      // Banner above the composer communicates this — no chat spam.
      return;
    }
    const mode: "web" | "deep" | null = deepResearch ? "deep" : webSearch ? "web" : null;
    store.sendMessage(text, { mode, attachments });
    haptic("medium");
    if (!isAdmin) incrementUsed(user?.id);
    setValue("");
    setAttachments([]);
    requestAnimationFrame(autoresize);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={imgInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={camInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {rl.active && (
        <div
          className="mb-2 flex items-start gap-2 rounded-xl border border-border bg-surface/80 backdrop-blur px-3 py-2 text-[12.5px] text-foreground/80"
          role="status"
          aria-live="polite"
        >
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="leading-relaxed">
            <span className="font-medium text-foreground">Rate limit reached</span>
            <span className="text-muted-foreground">{" — "}the AI is cooling down. Ready in </span>
            <span className="font-mono text-foreground">{rl.readableIn}</span>
            {rl.readableAt ? <span className="text-muted-foreground"> (around <span className="font-mono text-foreground/80">{rl.readableAt}</span>)</span> : null}
            <span className="text-muted-foreground">.</span>
          </div>
        </div>
      )}

      {limit.enforced && (limit.blocked || limit.warning) && (
        <div
          className={cn(
            "mb-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12.5px]",
            limit.blocked
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-amber-500/40 bg-amber-500/10 text-amber-300",
          )}
          role={limit.blocked ? "alert" : "status"}
        >
          {limit.blocked ? (
            <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <div className="leading-relaxed">
            {limit.blocked ? (
              <>
                <span className="font-medium">Daily message limit reached</span>
                {" — "}you've used all {limit.limit} messages for today. Limit resets at midnight.
              </>
            ) : (
              <>
                <span className="font-medium">
                  {limit.remaining} message{limit.remaining === 1 ? "" : "s"} left today
                </span>
                {" — "}your daily limit of {limit.limit} is almost used.
              </>
            )}
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-surface shadow-elegant transition-shadow focus-within:border-border-strong">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-3">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-[12px]"
              >
                <File className="h-3 w-3" />
                <span className="truncate max-w-[160px]">{a.name}</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autoresize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          disabled={blocked}
          placeholder={
            rl.active
              ? `Rate limit — try again in ${rl.readableIn}`
              : limit.blocked
                ? "Daily message limit reached — resets at midnight"
                : blocked
                  ? availability.reason === "maintenance"
                    ? `${agent.name} is under maintenance…`
                    : `${agent.name} is unavailable…`
                  : `Message ${agent.name}…`
          }
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14.5px] leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <AttachmentMenu
            uploading={uploading}
            onCamera={() => camInputRef.current?.click()}
            onPhotos={() => imgInputRef.current?.click()}
            onFiles={() => fileInputRef.current?.click()}
            onDrive={() => setDrivePickerOpen(true)}
            onGithub={() => setGhPickerOpen(true)}
            webSearch={webSearch}
            deepResearch={deepResearch}
            setWebSearch={setWebSearch}
            setDeepResearch={setDeepResearch}
            showWeb={flags.web_search && settings?.web_search_status !== "offline"}
            showDeep={flags.deep_research && settings?.deep_research_status !== "offline"}
            archOn={archOn}
            setArchOn={(v) => setArchMode(v)}
          />
          <AgentSelector />
          {agentId === "cipher-1" && flags.operator_mode && <ModeSelector mode={cipherMode} />}
          <EffortSelector value={effort} />
          {webSearch && <span className="text-[11px] text-primary hidden md:inline">· web</span>}
          {deepResearch && <span className="text-[11px] text-primary hidden md:inline">· deep</span>}
          <div className="ml-auto">
            <Button
              size="icon"
              className="h-8 w-8 rounded-lg"
              disabled={(!value.trim() && attachments.length === 0) || uploading || blocked}
              onClick={send}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {(blocked || (isAdmin && diagnostic.reason && diagnostic.reason !== "config-missing")) && !limit.blocked && !rl.active && (() => {
        const alternatives = AGENTS.filter(
          (a) => a.id !== agentId && isAgentAvailable(agentConfigs, a.id).ok,
        );
        const reason = diagnostic.reason ?? availability.reason;
        const title =
          reason === "maintenance"
            ? `${agent.name} is under maintenance`
            : reason === "disabled"
            ? `${agent.name} is disabled by the administrator`
            : reason === "fetch-error"
            ? `Couldn't load ${agent.name}'s status`
            : `${agent.name} configuration missing`;
        const explain =
          reason === "maintenance"
            ? "The admin flagged this agent for maintenance so requests are paused."
            : reason === "disabled"
            ? "The admin has switched this agent off. It won't accept new requests."
            : reason === "fetch-error"
            ? "The agents_config table couldn't be read. The agent is running with defaults."
            : "No agents_config row exists for this agent. Defaulting to available.";
        const fieldLine = diagnostic.field
          ? `${diagnostic.field} = ${String(diagnostic.value)}`
          : reason === "fetch-error"
          ? "fetch error"
          : "no row";
        return (
          <div className="mt-2 rounded-xl border border-border bg-surface/80 px-3.5 py-3 text-[12px]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                reason === "maintenance" ? "text-amber-400" :
                reason === "fetch-error" ? "text-muted-foreground" : "text-red-400",
              )} />
              <div className="flex-1 space-y-1.5">
                <div className="font-medium text-foreground">{title}</div>
                <div className="text-muted-foreground leading-relaxed">{explain}</div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Reason</span>
                  <code className="rounded bg-muted/50 px-1.5 py-0.5 text-[10.5px] font-mono">{reason}</code>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-2">Field</span>
                  <code className="rounded bg-muted/50 px-1.5 py-0.5 text-[10.5px] font-mono">{fieldLine}</code>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-2">Agent</span>
                  <code className="rounded bg-muted/50 px-1.5 py-0.5 text-[10.5px] font-mono">{agentId}</code>
                </div>
                {diagnostic.detail && (
                  <div className="text-[11px] text-muted-foreground pt-1">
                    <span className="uppercase tracking-wider text-[10px]">Detail:</span>{" "}
                    <span className="font-mono">{diagnostic.detail}</span>
                  </div>
                )}
                {blocked && alternatives.length > 0 && (
                  <div className="pt-1.5 text-[11.5px]">
                    <span className="text-muted-foreground">Try instead: </span>
                    {alternatives.map((a, i) => (
                      <span key={a.id}>
                        <button
                          onClick={() => store.setAgent(a.id)}
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {a.name}
                        </button>
                        {i < alternatives.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Metrixcom can make mistakes. Verify important information.
      </p>
      <div className="mt-2">
        <PrivacyDisclaimer />
      </div>
      <DrivePicker
        open={drivePickerOpen}
        onOpenChange={setDrivePickerOpen}
        onPicked={(a) =>
          setAttachments((prev) => [
            ...prev,
            { name: a.name, size: a.size, path: a.path, mime: a.mime },
          ])
        }
      />
      <GithubPicker
        open={ghPickerOpen}
        onOpenChange={setGhPickerOpen}
        onPicked={(a) =>
          setAttachments((prev) => [
            ...prev,
            { name: a.name, size: a.size, path: a.path, mime: a.mime },
          ])
        }
      />
    </div>
  );
}

function PillButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 h-8 text-[12.5px] transition-colors",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function AttachmentMenu({
  uploading,
  onCamera,
  onPhotos,
  onFiles,
  onDrive,
  onGithub,
  webSearch,
  deepResearch,
  setWebSearch,
  setDeepResearch,
  showWeb,
  showDeep,
  archOn,
  setArchOn,
}: {
  uploading: boolean;
  onCamera: () => void;
  onPhotos: () => void;
  onFiles: () => void;
  onDrive: () => void;
  onGithub: () => void;
  webSearch: boolean;
  deepResearch: boolean;
  setWebSearch: (v: boolean) => void;
  setDeepResearch: (v: boolean) => void;
  showWeb: boolean;
  showDeep: boolean;
  archOn: boolean;
  setArchOn: (v: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton aria-label="Attach" disabled={uploading}>
          <Paperclip className="h-4 w-4" />
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onSelect={onCamera}>
          <Camera className="h-4 w-4" /> Camera
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onPhotos}>
          <ImageIcon className="h-4 w-4" /> Photos
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onFiles}>
          <File className="h-4 w-4" /> Files
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onDrive}>
          <HardDrive className="h-4 w-4" /> Google Drive
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onGithub}>
          <Github className="h-4 w-4" /> GitHub
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="h-4 w-4" /> Integrations
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuCheckboxItem
              checked={archOn}
              onCheckedChange={(v) => setArchOn(!!v)}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Metrixcom Mode
            </DropdownMenuCheckboxItem>
            {(showWeb || showDeep) && <DropdownMenuSeparator />}
            {showWeb && (
              <DropdownMenuCheckboxItem
                checked={webSearch}
                onCheckedChange={(v) => {
                  setWebSearch(!!v);
                  if (v) setDeepResearch(false);
                }}
              >
                <Search className="h-4 w-4 mr-2" /> Web Search
              </DropdownMenuCheckboxItem>
            )}
            {showDeep && (
              <DropdownMenuCheckboxItem
                checked={deepResearch}
                onCheckedChange={(v) => {
                  setDeepResearch(!!v);
                  if (v) setWebSearch(false);
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Deep Research
              </DropdownMenuCheckboxItem>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgentSelector() {
  const agentId = useApp((s) => s.agent);
  const agent = getAgent(agentId);
  const { isAdmin } = useAuth();
  const configs = useAgentsConfig();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton>
          <span className="text-[13px]">{agent.glyph}</span>
          {agent.name}
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Choose agent
        </DropdownMenuLabel>
        {AGENTS.map((a) => {
          const av = isAgentAvailable(configs, a.id);
          // Hide fully disabled agents from non-admins entirely
          if (!isAdmin && av.reason === "disabled") return null;
          const locked = !isAdmin && !av.ok;
          return (
            <DropdownMenuItem
              key={a.id}
              onSelect={(e) => {
                if (locked) {
                  e.preventDefault();
                  toast.error(
                    av.reason === "maintenance"
                      ? `${a.name} is under maintenance.`
                      : `${a.name} is currently disabled.`,
                  );
                  return;
                }
                store.setAgent(a.id);
              }}
              className="flex-col items-start gap-0.5 py-2.5"
            >
              <div className="flex items-center gap-2 text-[13.5px] font-medium w-full">
                <span>{a.glyph}</span>
                {a.name}
                {!av.ok && (
                  <span className={cn(
                    "ml-1 text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded",
                    av.reason === "maintenance"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {av.reason === "maintenance" ? "Maintenance" : "Disabled"}
                  </span>
                )}
                {a.id === agentId && (
                  <span className="ml-auto text-[10px] text-muted-foreground">Active</span>
                )}
              </div>
              <div className="text-[12px] text-muted-foreground">{a.description}</div>
            </DropdownMenuItem>
          );
        })}

      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeSelector({ mode }: { mode: "advisor" | "operator" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton active>
          {mode === "advisor" ? "Advisor" : "Operator"}
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Cipher-1 mode
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => store.setCipherMode("advisor")}
          className="flex-col items-start gap-0.5 py-2.5"
        >
          <div className="text-[13.5px] font-medium">Advisor</div>
          <div className="text-[12px] text-muted-foreground">
            Analyze, learn, and discuss. No system access.
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => store.setCipherMode("operator")}
          className="flex-col items-start gap-0.5 py-2.5"
        >
          <div className="text-[13.5px] font-medium">Operator</div>
          <div className="text-[12px] text-muted-foreground">
            Read files, run commands, analyze logs. Requires approval.
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const EFFORT_META: Record<string, { label: string; hint: string }> = {
  low:    { label: "Fast",     hint: "Quick replies · lowest latency" },
  medium: { label: "Balanced", hint: "Good depth · everyday default" },
  high:   { label: "Deep",     hint: "Careful reasoning · slower" },
  ultra:  { label: "Expert",   hint: "Extended thinking · high accuracy" },
  max:    { label: "Maximum",  hint: "Full cognition · longest wait" },
};

function EffortSelector({ value }: { value: string }) {
  const meta = EFFORT_META[value] ?? { label: value, hint: "" };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton>
          <span className="text-muted-foreground">Effort</span>
          <span className="capitalize">{value}</span>
          <span className="text-muted-foreground">· {meta.label}</span>
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {EFFORT_LEVELS.map((l) => {
          const m = EFFORT_META[l] ?? { label: l, hint: "" };
          return (
            <DropdownMenuItem
              key={l}
              onSelect={() => store.setEffort(l)}
              className="flex-col items-start gap-0.5 py-2.5"
            >
              <div className="flex w-full items-center gap-2">
                <span className="text-[13.5px] font-medium capitalize">{l}</span>
                <span className="text-[11px] text-muted-foreground">{m.label}</span>
                {l === value && <span className="ml-auto text-[10px] text-muted-foreground">Active</span>}
              </div>
              <div className="text-[12px] text-muted-foreground">{m.hint}</div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
