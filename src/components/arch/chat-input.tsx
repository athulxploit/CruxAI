import { useRef, useState } from "react";
import {
  Paperclip,
  ArrowUp,
  File,
  Globe,
  Search,
  Sparkles,
  X,
  Monitor,
  Puzzle,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { store, useApp } from "@/lib/app-store";
import { EFFORT_LEVELS } from "@/lib/agents";
import {
  REASONING_META,
  adaptReasoningLevel,
  reasoningLevelsFor,
  type ReasoningLevel,
} from "@/lib/reasoning";
import { Brain } from "lucide-react";
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
import { isArchModeOn, setArchMode } from "@/lib/arch-mode";
import { useEffect } from "react";
// Legacy agents-config import removed
import { useMessageLimit, incrementUsed } from "@/lib/msg-limit";
import { useRateLimit } from "@/lib/rate-limit";
import { AlertTriangle, Ban, Clock } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { PrivacyDisclaimer } from "./privacy-disclaimer";
import { PluginDirectory } from "./plugin-directory";
import { ModelSelector } from "./model-selector";
import { loadIntelligence, saveIntelligence, subscribeIntelligence } from "@/lib/intelligence";
import { getModelEntry } from "@/lib/model-registry";
import { getModeMeta, WORKSPACE_MODE_EVENT } from "@/lib/workspace-mode";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  path?: string;
  mime?: string;
  localUrl?: string;
  status: 'uploading' | 'ready' | 'error';
  error?: string;
}

export function ChatInput() {
  const workspaceMode = useApp((s) => s.workspaceMode);
  const modeMeta = getModeMeta(workspaceMode);
  const modeTools = modeMeta.tools;
  const placeholder = modeMeta.placeholder;
  const [value, setValue] = useState("");
  const [webSearch, setWebSearch] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pluginsOpen, setPluginsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [archOn, setArchOn] = useState<boolean>(() => isArchModeOn());
  useEffect(() => {
    const h = (e: Event) => setArchOn(!!(e as CustomEvent).detail);
    window.addEventListener("arch:arch_mode", h);
    return () => window.removeEventListener("arch:arch_mode", h);
  }, []);
  // Transient composer state must not carry across modes.
  useEffect(() => {
    const h = () => {
      setValue("");
      setWebSearch(false);
      setDeepResearch(false);
      setPluginsOpen(false);
      setAttachments((prev) => {
        prev.forEach((a) => { if (a.localUrl) URL.revokeObjectURL(a.localUrl); });
        return [];
      });
      requestAnimationFrame(() => {
        const el = ref.current;
        if (el) { el.style.height = "auto"; }
      });
    };
    window.addEventListener(WORKSPACE_MODE_EVENT, h);
    return () => window.removeEventListener(WORKSPACE_MODE_EVENT, h);
  }, []);

  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const camInputRef = useRef<HTMLInputElement>(null);
  // Legacy agent-related state removed
  const cipherMode = useApp((s) => s.cipherMode);
  const effort = useApp((s) => s.effort);
  const computer = useApp((s) => s.computer);
  // Unified intelligence personality
  const agent = { name: "Metrixcom Engine" };
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { flags, settings } = usePlatform();
  // Legacy agent-config hooks removed
  const limit = useMessageLimit();
  const rl = useRateLimit();

  const [prefs, setPrefs] = useState(() => loadIntelligence());
  useEffect(() => subscribeIntelligence(setPrefs), []);
  const selectedModelId = prefs.preferred_model || "auto";
  const modelEntry = getModelEntry(selectedModelId);
  const supportsVision = modelEntry?.supportsVision ?? false;
  const hasImages = attachments.some(a => a.mime?.startsWith("image/"));
  const visionWarning = hasImages && !supportsVision;

  const blocked = (!authLoading && !isAdmin && false) || limit.blocked || rl.active || visionWarning;
  const canSend = (value.trim() || attachments.length > 0) && !uploading && !blocked && attachments.every(a => a.status === 'ready');

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
  const maxImages = 5;

  function autoresize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }

  async function optimizeImage(file: File): Promise<Blob | File> {
    if (!file.type.startsWith("image/") || file.size < 1024 * 1024) return file;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 2048;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFiles(list: FileList | null) {
    if (!list || !user) return;
    
    const files = Array.from(list);
    const existingImages = attachments.filter(a => a.mime?.startsWith("image/")).length;
    let addedImages = 0;

    const newAttachments: Attachment[] = [];
    
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      if (isImage && (existingImages + addedImages >= maxImages)) {
        toast.error(`Max ${maxImages} images per message`);
        continue;
      }
      if (attachments.length + newAttachments.length >= maxAttach) {
        toast.error(`Max ${maxAttach} attachments`);
        break;
      }
      if (file.size > maxMb * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxMb}MB`);
        continue;
      }

      const id = crypto.randomUUID();
      const localUrl = isImage ? URL.createObjectURL(file) : undefined;
      
      const att: Attachment = {
        id,
        name: file.name,
        size: file.size,
        mime: file.type || undefined,
        localUrl,
        status: 'uploading'
      };
      
      newAttachments.push(att);
      if (isImage) addedImages++;
    }

    if (newAttachments.length === 0) return;

    setAttachments(prev => [...prev, ...newAttachments]);
    setUploading(true);

    const uploadFile = async (att: Attachment, originalFile: File) => {
      try {
        const fileToUpload = att.mime?.startsWith("image/") 
          ? await optimizeImage(originalFile)
          : originalFile;
          
        const path = `${user.id}/${crypto.randomUUID()}-${att.name}`;
        const { error } = await supabase.storage
          .from("user-files")
          .upload(path, fileToUpload, { 
            contentType: att.mime || "application/octet-stream",
            upsert: true
          });

        if (error) throw error;

        await supabase.from("files").insert({
          user_id: user.id,
          name: att.name,
          mime: att.mime || null,
          size_bytes: att.size,
          storage_path: path,
        });

        setAttachments(prev => prev.map(a => 
          a.id === att.id ? { ...a, status: 'ready', path } : a
        ));
      } catch (err: any) {
        toast.error(`Failed to upload ${att.name}`);
        setAttachments(prev => prev.map(a => 
          a.id === att.id ? { ...a, status: 'error', error: err.message } : a
        ));
      }
    };

    // Parallel upload with controlled concurrency (3)
    const queue = [...newAttachments.map((att, i) => ({ att, file: files[i] }))];
    const workers = Array(Math.min(3, queue.length)).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) await uploadFile(item.att, item.file);
      }
    });

    await Promise.all(workers);
    setUploading(false);
  }

  function send() {
    const text = value.trim();
    // Direct model routing. Legacy agent auto-selection removed.
    if (limit.blocked || rl.active) {
      return;
    }
    const mode: "web" | "deep" | null =
      deepResearch && modeTools.deepResearch ? "deep" : webSearch && modeTools.webSearch ? "web" : null;
    store.sendMessage(text, { mode, attachments });
    haptic("medium");
    if (!isAdmin) incrementUsed(user?.id);
    setValue("");
    setAttachments([]);
    requestAnimationFrame(autoresize);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:pb-6">
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
                <span className="font-medium">Daily limit reached</span>
                {" — "}
                {limit.resetTime 
                  ? `Resets at ${new Date(limit.resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : "Resets at midnight."
                }
              </>
            ) : (
              <>
                <span className="font-medium">
                  {limit.remaining} message{limit.remaining === 1 ? "" : "s"} left{limit.remaining <= 3 ? " today" : ""}
                </span>
                {" — "}Crux daily limit usage.
              </>
            )}
          </div>
        </div>
      )}
      <div 
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.add("border-primary/50", "bg-primary/5");
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.classList.remove("border-primary/50", "bg-primary/5");
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className="rounded-2xl border border-border bg-surface shadow-elegant transition-all focus-within:border-border-strong group/composer"
      >
        {visionWarning && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Image input isn't supported by this model. Select a vision-capable model to continue.</span>
          </div>
        )}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a) => {
              const isImage = a.mime?.startsWith("image/");
              const isUploading = a.status === 'uploading';
              const isError = a.status === 'error';

              return (
                <div
                  key={a.id}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-1.5 transition-all hover:border-border-strong",
                    isImage ? "pr-2" : "px-2",
                    isError && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  {isImage ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border bg-muted">
                      {a.localUrl && (
                        <img 
                          src={a.localUrl} 
                          alt={a.name}
                          className={cn(
                            "h-full w-full object-cover transition-opacity",
                            isUploading ? "opacity-40" : "opacity-100"
                          )}
                        />
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                      {isError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <File className={cn("h-4 w-4", isUploading ? "text-muted-foreground/40" : "text-muted-foreground")} />
                      {isUploading && (
                        <Loader2 className="absolute -inset-1 h-6 w-6 animate-spin text-primary/40" />
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-0">
                    <span className="max-w-[120px] truncate text-[11px] font-medium leading-none">
                      {a.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {isError ? "Upload failed" : isUploading ? "Uploading..." : `${(a.size / 1024).toFixed(0)} KB`}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (a.localUrl) URL.revokeObjectURL(a.localUrl);
                      setAttachments((prev) => prev.filter((item) => item.id !== a.id));
                    }}
                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <textarea
          ref={ref}
          value={value}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const files: File[] = [];
            for (let i = 0; i < items.length; i++) {
              const file = items[i].getAsFile();
              if (file) files.push(file);
            }
            if (files.length > 0) {
              e.preventDefault();
              handleFiles(files as unknown as FileList);
            }
          }}
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
                ? `Limit reached — Resets at ${limit.resetTime ? new Date(limit.resetTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'midnight'}`
                : placeholder
          }
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[14.5px] leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
        <div className="flex items-center gap-1 px-2 pb-2 pt-1 overflow-x-auto scrollbar-none">
          <AttachmentMenu
            uploading={uploading}
            onFiles={() => fileInputRef.current?.click()}
            onImages={() => imgInputRef.current?.click()}
            onCamera={() => camInputRef.current?.click()}
            onPlugins={() => setPluginsOpen(true)}
            webSearch={webSearch}
            deepResearch={deepResearch}
            setWebSearch={setWebSearch}
            setDeepResearch={setDeepResearch}
            showWeb={modeTools.webSearch && flags.web_search && settings?.web_search_status !== "offline"}
            showDeep={modeTools.deepResearch && flags.deep_research && settings?.deep_research_status !== "offline"}
            showPlugins={modeTools.plugins}
            showArch={modeTools.archMode}
            archOn={archOn}
            setArchOn={(v) => setArchMode(v)}
          />
          
          <div className="flex items-center gap-1 shrink-0">
            {modeTools.computer && <ComputerSelector value={computer} />}
            {modeTools.computer && flags.operator_mode && <ModeSelector mode={cipherMode} />}
            <EffortSelector value={effort} />
            <ReasoningSelector />
          </div>


          {((webSearch && modeTools.webSearch) || (deepResearch && modeTools.deepResearch)) && (
            <div className="flex items-center gap-1 text-[11px] text-primary whitespace-nowrap ml-1">
              {webSearch && modeTools.webSearch && <span>· web</span>}
              {deepResearch && modeTools.deepResearch && <span>· deep</span>}
            </div>
          )}
          
          <div className="ml-auto sticky right-0 bg-surface pl-2 flex items-center gap-1">
            <ModelSelector />
            <Button
              size="icon"
              className="h-9 w-9 md:h-8 md:w-8 rounded-lg"
              disabled={!canSend}
              onClick={send}
            >
              <ArrowUp className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>
        </div>
      </div>
      {/* Legacy agent configuration errors removed */}

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Metrixcom can make mistakes. Verify important information.
      </p>
      <div className="mt-2">
        <PrivacyDisclaimer />
      </div>
      <PluginDirectory
        open={pluginsOpen}
        onOpenChange={setPluginsOpen}
      />
    </div>
  );
}

/**
 * Reasoning control. Only offers the levels the SELECTED model actually
 * supports; renders an explicit unsupported state otherwise, and clamps the
 * stored level whenever the user switches to a less capable model.
 */
function ReasoningSelector() {
  const [prefs, setPrefs] = useState(() => loadIntelligence());
  useEffect(() => {
    const h = (e: Event) => setPrefs((e as CustomEvent).detail);
    window.addEventListener("arch:intelligence", h);
    return () => window.removeEventListener("arch:intelligence", h);
  }, []);

  const entry = getModelEntry(prefs.preferred_model);
  const levels = reasoningLevelsFor(entry?.reasoning);
  const level: ReasoningLevel = adaptReasoningLevel(entry?.reasoning, prefs.reasoning_level ?? "off");

  // Keep the stored level honest when the active model can't do it.
  useEffect(() => {
    if ((prefs.reasoning_level ?? "off") !== level) saveIntelligence({ reasoning_level: level });
  }, [level, prefs.reasoning_level]);

  if (levels.length === 0) {
    return (
      <PillButton
        disabled
        title={
          entry
            ? `${entry.name} does not support reasoning controls`
            : "Select a specific model to use reasoning"
        }
        className="opacity-50 cursor-not-allowed"
      >
        <Brain className="h-3.5 w-3.5" />
        <span className="text-muted-foreground">No reasoning</span>
      </PillButton>
    );
  }

  const on = level !== "off";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton active={on}>
          <Brain className={cn("h-3.5 w-3.5", on && "text-primary")} />
          <span className="text-muted-foreground">Reasoning</span>
          <span className={cn(on && "text-primary")}>{REASONING_META[level].label}</span>
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 duration-150 ease-out">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground">
          {entry?.name} · supported levels
        </DropdownMenuLabel>
        {levels.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => saveIntelligence({ reasoning_level: l })}
            className="flex-col items-start gap-0.5 py-2.5"
          >
            <div className="flex w-full items-center gap-2">
              <span className="text-[13.5px] font-medium">{REASONING_META[l].label}</span>
              {l === level && <span className="ml-auto text-[10px] text-muted-foreground">Active</span>}
            </div>
            <div className="text-[12px] text-muted-foreground">{REASONING_META[l].hint}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
  onFiles,
  onImages,
  onCamera,
  onPlugins,
  webSearch,
  deepResearch,
  setWebSearch,
  setDeepResearch,
  showWeb,
  showDeep,
  showPlugins,
  showArch,
  archOn,
  setArchOn,
}: {
  uploading: boolean;
  onFiles: () => void;
  onImages: () => void;
  onCamera: () => void;
  onPlugins: () => void;
  webSearch: boolean;
  deepResearch: boolean;
  setWebSearch: (v: boolean) => void;
  setDeepResearch: (v: boolean) => void;
  showWeb: boolean;
  showDeep: boolean;
  showPlugins: boolean;
  showArch: boolean;
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
      <DropdownMenuContent align="start" className="w-56 duration-150 ease-out">
        <DropdownMenuItem onSelect={onImages}>
          <ImageIcon className="h-4 w-4" /> Images
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCamera}>
          <Camera className="h-4 w-4" /> Camera
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onFiles}>
          <File className="h-4 w-4" /> Files
        </DropdownMenuItem>
        {showPlugins && (
          <DropdownMenuItem onSelect={onPlugins}>
            <Puzzle className="h-4 w-4" /> Plugins
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open("/integrations", "_blank")} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Integrations
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuItem>
        {(showArch || showWeb || showDeep) && <DropdownMenuSeparator />}
        {(showArch || showWeb || showDeep) && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sparkles className="h-4 w-4" /> Capabilities
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {showArch && (
              <DropdownMenuCheckboxItem
                checked={archOn}
                onCheckedChange={(v) => setArchOn(!!v)}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Metrixcom Mode
              </DropdownMenuCheckboxItem>
            )}
            {showArch && (showWeb || showDeep) && <DropdownMenuSeparator />}
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
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ComputerSelector({ value }: { value: import("@/lib/app-store").ComputerType }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PillButton active={value === "local"}>
          {value === "local" ? (
            <Monitor className="h-3.5 w-3.5" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 duration-150 ease-out">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Execution Environment
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => store.setComputer("local")}
          className="flex-col items-start gap-0.5 py-2.5"
        >
          <div className="flex items-center gap-2 text-[13.5px] font-medium w-full">
            <Monitor className="h-4 w-4" />
            Local Computer
            {value === "local" && (
              <span className="ml-auto text-[10px] text-muted-foreground">Active</span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground">
            Metrixcom works with your authorized local files and tools.
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            store.setComputer("cloud");
          }}
          className={cn(
            "flex-col items-start gap-0.5 py-2.5",
            value === "cloud" && "bg-accent/10"
          )}
        >
          <div className="flex items-center gap-2 text-[13.5px] font-medium w-full">
            <Globe className="h-4 w-4" />
            Cloud Computer
            {value === "cloud" && (
              <span className="ml-auto text-[10px] text-accent">Active</span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground">
            Remote, isolated workspace for sandboxed execution and cloud tasks.
          </div>
        </DropdownMenuItem>
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
      <DropdownMenuContent align="start" className="w-72 duration-150 ease-out">
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
        </PillButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 duration-150 ease-out">
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
