import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Check, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { checkPromoCode, redeemPromoCode } from "@/lib/promo.functions";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Metrixcom Premium — Power Your AI Workflow" },
      { name: "description", content: "Upgrade to Metrixcom Pro or Pro+ for advanced agents, higher usage limits, and exclusive professional engineering tools." },
      { property: "og:title", content: "Upgrade to Metrixcom Premium" },
      { property: "og:description", content: "Unlock the full power of the Metrixcom Engine with a premium subscription." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PremiumPage,
});

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  status: string;
  display_order: number | null;
  features: Record<string, boolean> | null;
  limits: Record<string, unknown> | null;
};

function PremiumPage() {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [promoCode, setPromoCode] = useState("");
  const [promoBusy, setPromoBusy] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    kind: string;
    discount: number | null;
  } | null>(null);


  async function applyPromo() {
    if (!user) return toast.error("Please sign in to redeem a code.");
    const code = promoCode.trim().toUpperCase();
    if (!code) return toast.error("Enter a promo code.");
    setPromoBusy(true);
    try {
      const p = await checkPromoCode({ data: { code } });
      if (!p || !p.valid) {
        const reason = p?.reason;
        toast.error(
          reason === "expired" ? "This code has expired." :
          reason === "limit_reached" ? "You've reached the usage limit for this code." :
          "Invalid or inactive promo code."
        );
        return;
      }
      if (!p.id || !p.kind) return toast.error("Invalid promo code.");
      setAppliedPromo({ code: p.code, kind: p.kind, discount: p.discount, id: p.id });

      toast.success(`Promo "${p.code}" applied. Complete purchase to redeem.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply code.");
    } finally {
      setPromoBusy(false);
    }
  }

  useEffect(() => {
    supabase
      .from("plans" as never)
      .select("*")
      .eq("status", "active")
      .order("display_order")
      .then(({ data }) => setPlans((data as PlanRow[]) ?? []));
  }, []);

  function discountedPrice(base: number) {
    if (!appliedPromo || appliedPromo.discount == null) return base;
    const off = Math.max(0, Math.min(100, appliedPromo.discount));
    return Math.round((base - (base * off) / 100) * 100) / 100;
  }

  async function purchase(p: PlanRow) {
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }
    setBusy(p.id);
    const basePrice = cycle === "monthly" ? p.price_monthly : p.price_yearly;
    const price = discountedPrice(basePrice);
    const { error } = await supabase
      .from("activity_log" as never)
      .insert({
        user_id: user.id,
        type: "premium_purchase_intent",
        category: "billing",
        message: `Purchase intent: ${p.name}`,
        meta: {
          plan_id: p.id,
          plan_name: p.name,
          base_price: basePrice,
          price,
          cycle,
          promo: appliedPromo?.code ?? null,
          discount: appliedPromo?.discount ?? null,
        },
      } as never);
    if (error) {
      setBusy(null);
      return toast.error(error.message);
    }
    if (appliedPromo) {
      await redeemPromoCode({ data: { promoId: appliedPromo.id } });
    }


    setBusy(null);
    toast.success(`Purchase request sent for ${p.name}. Our team will contact you shortly.`);

  }

  const currentPlan = (profile?.plan ?? "free").toLowerCase();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[12px] text-primary mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Premium
          </div>
          <h1 className="text-[28px] md:text-[32px] font-semibold tracking-tight">
            Upgrade your Metrixcom experience
          </h1>
          <p className="mt-2 text-muted-foreground text-[13.5px]">
            Unlock advanced agents, higher limits, and priority access.
          </p>

          <div className="mt-6 inline-flex rounded-lg border border-border p-1 bg-muted/30">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-4 py-1.5 text-[13px] rounded-md transition-colors ${
                  cycle === c
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mb-8 max-w-md rounded-xl border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium mb-2">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Have a promo code?
          </div>
          {appliedPromo ? (
            <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[13px]">
              <div>
                <span className="font-medium text-primary">{appliedPromo.code}</span>
                <span className="text-muted-foreground ml-2">
                  {appliedPromo.kind}
                  {appliedPromo.discount != null
                    ? ` · ${appliedPromo.discount}% off`
                    : ""}
                </span>
              </div>
              <button
                onClick={() => {
                  setAppliedPromo(null);
                  setPromoCode("");
                }}
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter code"
                className="h-9 text-[13px] uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyPromo();
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={applyPromo}
                disabled={promoBusy || !promoCode.trim()}
              >
                {promoBusy ? "…" : "Apply"}
              </Button>
            </div>
          )}
        </div>


        <h2 className="sr-only">Available Subscription Plans</h2>
        {plans.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-20">
            No plans available yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const basePrice = cycle === "monthly" ? p.price_monthly : p.price_yearly;
              const finalPrice = discountedPrice(basePrice);
              const hasDiscount = finalPrice < basePrice;
              const isCurrent = currentPlan === p.name.toLowerCase();
              const featureEntries = Object.entries(p.features ?? {}).filter(
                ([, v]) => v,
              );
              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card p-6 flex flex-col"
                >
                  <div className="text-[15px] font-semibold">{p.name}</div>
                  {p.description && (
                    <div className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
                      {p.description}
                    </div>
                  )}
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">${finalPrice}</span>
                    <span className="text-[13px] text-muted-foreground">
                      /{cycle === "monthly" ? "mo" : "yr"}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-[13px] text-muted-foreground line-through">
                          ${basePrice}
                        </span>
                        <span className="text-[11px] font-medium text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5">
                          {appliedPromo?.discount}% OFF
                        </span>
                      </>
                    )}
                  </div>

                  {featureEntries.length > 0 && (
                    <ul className="mt-5 space-y-2 flex-1">
                      {featureEntries.map(([k]) => (
                        <li key={k} className="flex items-start gap-2 text-[13px]">
                          <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <span className="capitalize">{k.replace(/_/g, " ")}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className="mt-6 w-full"
                    disabled={busy === p.id || isCurrent}
                    onClick={() => purchase(p)}
                  >
                    {isCurrent
                      ? "Current plan"
                      : busy === p.id
                        ? "…"
                        : `Get ${p.name}`}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
