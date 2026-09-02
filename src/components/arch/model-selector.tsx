import { Lock, Check, ChevronDown } from "lucide-react";
import { loadIntelligence, saveIntelligence, type PreferredModel } from "@/lib/intelligence";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { haptic } from "@/lib/haptics";
import { useState, useEffect } from "react";
import { MODEL_REGISTRY } from "@/lib/model-registry";
import { adaptReasoningLevel } from "@/lib/reasoning";
import { ModelIcon } from "./model-icon";
import { planRank } from "@/lib/plan-meta";

export function ModelSelector() {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(() => loadIntelligence());
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Precompute constants to avoid calculations on each render
  const userPlan = profile?.plan || "free";
  const userRank = isAdmin ? 99 : planRank(userPlan);
  const currentModel = MODEL_REGISTRY.find(m => m.id === (prefs?.preferred_model || "auto")) || MODEL_REGISTRY[0];

  useEffect(() => {
    const h = (e: Event) => setPrefs((e as CustomEvent).detail);
    window.addEventListener("arch:intelligence", h);
    return () => window.removeEventListener("arch:intelligence", h);
  }, []);


  const checkLock = (minPlan: string) => {
    if (isAdmin) return false;
    return planRank(minPlan) > userRank;
  };

  const shouldShowBadge = (minPlan: string) => {
    // Only show badge if the user hasn't reached that tier yet
    return planRank(minPlan) > userRank;
  };

  const handleSelect = (id: PreferredModel, minPlan: string) => {
    if (checkLock(minPlan)) return;
    // Reasoning stays a separate setting, but it must never carry an
    // unsupported level over to a different model.
    const next = MODEL_REGISTRY.find((m) => m.id === id);
    saveIntelligence({
      preferred_model: id,
      reasoning_level: adaptReasoningLevel(next?.reasoning, loadIntelligence().reasoning_level ?? "off"),
    });
    haptic("selection");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors outline-none">
          <ModelIcon modelId={currentModel.id} className="h-3.5 w-3.5" />
          <span className="max-w-[80px] truncate">{currentModel.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-surface border-border p-1 duration-150 ease-out">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model Selection
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        {MODEL_REGISTRY.map((m) => {
            const locked = checkLock(m.minPlan);
            const active = prefs.preferred_model === m.id;
            const showBadge = shouldShowBadge(m.minPlan);
            
            return (
              <HoverCard 
                key={m.id} 
                openDelay={50} 
                closeDelay={500}
                open={openCardId === m.id}
                onOpenChange={(open) => {
                  if (open) {
                    setOpenCardId(m.id);
                  } else if (openCardId === m.id) {
                    setOpenCardId(null);
                  }
                }}
              >
                <HoverCardTrigger asChild>
                  <DropdownMenuItem
                    onClick={() => !locked && handleSelect(m.id as PreferredModel, m.minPlan)}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md px-2 py-2 text-[13px] focus:bg-surface-elevated transition-colors cursor-pointer disabled:pointer-events-auto",
                      locked && "opacity-60 grayscale",
                      active && "bg-surface-elevated text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <ModelIcon modelId={m.id} className="h-4 w-4 opacity-70" />
                      <span className="font-medium">{m.name}</span>
                      {showBadge && (
                        <span className={cn(
                          "rounded-sm px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-white/5 text-muted-foreground/80 border border-border/50"
                        )}>
                          {m.minPlan.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {locked ? (
                        <Lock className="h-3 w-3 text-muted-foreground/70" />
                      ) : active ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : null}
                    </div>
                  </DropdownMenuItem>
                </HoverCardTrigger>
                <HoverCardContent
                  side="right" 
                  align="start"
                  sideOffset={8}
                  alignOffset={-4}
                  className="w-[200px] border-border bg-surface-elevated p-2 text-[12px] shadow-lg pointer-events-auto"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">by {m.provider}</p>
                    <p className="text-muted-foreground leading-relaxed">{m.description}</p>
                    {locked && (
                      <button 
                        onClick={() => navigate({ to: "/premium" })}
                        className="mt-1 w-full text-left text-[11px] font-medium text-primary hover:underline transition-all"
                      >
                        Upgrade to {m.minPlan.toUpperCase()}
                      </button>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
