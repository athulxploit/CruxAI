import { cn } from "@/lib/utils";
import logoAsset from "@/assets/arch-logo.png.asset.json";

export function ArchLogo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img
        src={logoAsset.url}
        alt="Metrixcom"
        width={size}
        height={size}
        className="object-contain brightness-0 dark:brightness-0 dark:invert"
        style={{ width: size, height: size }}
      />
      <span
        className="text-[11px] font-normal uppercase tracking-[0.14em]"
        style={{ fontFamily: "'Michroma', 'Orbitron', sans-serif" }}
      >
        XCOM<span className="text-muted-foreground ml-1.5 tracking-normal normal-case text-[10.5px]" style={{ fontFamily: "inherit" }}>AI</span>
      </span>
    </div>
  );
}

