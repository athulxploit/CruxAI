import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Connector } from "@/lib/connectors-catalog";
import { getBrandDomain } from "@/lib/connectors-registry";
import { Globe, RefreshCw } from "lucide-react";

/**
 * Renders the real brand logo for a connector using Logo.dev as the primary provider,
 * falling back to a custom monogram or generic icon.
 */
export function ConnectorLogo({
  connector,
  className,
}: {
  connector: Connector;
  className?: string;
}) {
  const [loadStatus, setLoadStatus] = useState<"loading" | "success" | "failed">("loading");
  const [retryCount, setRetryCount] = useState(0);
  
  const domain = getBrandDomain(connector);
  
  // Use VITE_LOGO_DEV_TOKEN if available, otherwise attempt public access or just handle the error gracefully
  const logoDevToken = import.meta.env.VITE_LOGO_DEV_TOKEN;

  const logoUrl = useMemo(() => {
    if (!domain) return null;
    const base = `https://img.logo.dev/${domain}?size=128`;
    // Logo.dev usually requires a token for reliable CDN access.
    // We append it if present, otherwise we hope for a public tier or handle error.
    return logoDevToken ? `${base}&token=${logoDevToken}` : base;
  }, [domain, logoDevToken]);

  const handleRetry = useCallback(() => {
    setLoadStatus("loading");
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    setLoadStatus("loading");
    setRetryCount(0);
  }, [connector.id, domain]);

  const monogram = useMemo(() => {
    const firstChar = connector.name.charAt(0).toUpperCase();
    const colors = [
      "bg-blue-500/20 text-blue-400",
      "bg-emerald-500/20 text-emerald-400",
      "bg-violet-500/20 text-violet-400",
      "bg-orange-500/20 text-orange-400",
      "bg-rose-500/20 text-rose-400",
      "bg-indigo-500/20 text-indigo-400",
      "bg-cyan-500/20 text-cyan-400",
      "bg-amber-500/20 text-amber-400",
    ];
    // Simple hash to pick a stable color for the same name
    const hash = connector.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorClass = colors[hash % colors.length];
    return { char: firstChar, colorClass };
  }, [connector.name]);

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[14px] font-bold ring-1 ring-border/50 transition-all",
        loadStatus === "success" ? "bg-white" : "bg-surface",
        className,
      )}
    >
      {/* Loading Shimmer Overlay */}
      {loadStatus === "loading" && domain && (
        <div className="absolute inset-0 animate-pulse bg-muted/20" />
      )}

      {domain ? (
        <>
          {loadStatus !== "failed" && logoUrl && (
            <img
              key={`${logoUrl}-${retryCount}`}
              src={logoUrl}
              alt={`${connector.name} logo`}
              loading="lazy"
              className={cn(
                "h-full w-full object-contain p-2 transition-opacity duration-300",
                loadStatus === "success" ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setLoadStatus("success")}
              onError={() => {
                console.warn(`Logo.dev failed for ${domain}. Switching to fallback.`);
                setLoadStatus("failed");
              }}
            />
          )}
          
          {loadStatus === "failed" && (
            <div className={cn("flex h-full w-full items-center justify-center", monogram.colorClass)}>
              {monogram.char}
              {/* Optional manual retry button overlay on hover */}
              <button
                onClick={handleRetry}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                title="Retry logo load"
              >
                <RefreshCw className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted/10 text-muted-foreground/40">
          <Globe className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
