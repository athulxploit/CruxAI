import { useEffect, useRef, useState } from "react";
import { Crown, Sparkles, PartyPopper } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PLAN_META, normalizePlan, planRank, type PlanId } from "@/lib/plan-meta";
import { PlanBadge } from "./plan-badge";

const KEY = (uid: string) => `arch:plan-seen:${uid}`;

/**
 * Watches the signed-in user's plan. When it moves up a tier (e.g. an admin
 * upgrades them from the Admin Panel), a congratulation dialog is shown once.
 */
export function PlanCelebration() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [celebrated, setCelebrated] = useState<PlanId>("free");
  const shown = useRef(false);

  useEffect(() => {
    if (!user?.id || !profile) return;
    const current = normalizePlan(profile.plan);
    let seen: string | null = null;
    try {
      seen = localStorage.getItem(KEY(user.id));
    } catch { /* ignore */ }

    if (!seen) {
      // First time we observe this account — record silently, no popup.
      try { localStorage.setItem(KEY(user.id), current); } catch { /* ignore */ }
      return;
    }
    if (seen === current) return;

    const upgraded = planRank(current) > planRank(seen);
    try { localStorage.setItem(KEY(user.id), current); } catch { /* ignore */ }
    if (upgraded && !shown.current) {
      shown.current = true;
      setCelebrated(current);
      setOpen(true);
    }
  }, [user?.id, profile?.plan, profile]);

  const meta = PLAN_META[celebrated];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md rounded-2xl border-border bg-surface">
        <DialogHeader className="items-center text-center">
          <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            {celebrated === "proplus" ? (
              <Crown className="h-7 w-7" />
            ) : celebrated === "pro" ? (
              <Sparkles className="h-7 w-7" />
            ) : (
              <PartyPopper className="h-7 w-7" />
            )}
          </div>
          <DialogTitle className="text-[19px]">
            Congratulations — you're on {meta.label}!
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Your account has been upgraded. {meta.blurb}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
            Current plan <PlanBadge plan={celebrated} />
          </div>
          <ul className="space-y-1.5">
            {meta.perks.map((p) => (
              <li key={p} className="flex items-center gap-2 text-[13px]">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <Button className="w-full" onClick={() => setOpen(false)}>
          Start using {meta.label}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
