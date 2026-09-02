import { cn } from "@/lib/utils";
import logoAsset from "@/assets/arch-logo.png.asset.json";
import { store } from "@/lib/app-store";

export function ArchLogo({ className, size = 20, iconOnly, clickable = true }: { className?: string; size?: number; iconOnly?: boolean; clickable?: boolean }) {
  const handleClick = () => {
    if (!clickable) return;
    store.setActiveChat(null);
  };

  return (
    <div 
      className={cn("flex items-center gap-2", clickable && "cursor-pointer hover:opacity-80 transition-opacity", className)}
      onClick={handleClick}
    >
      <img
        src={logoAsset.url}
        alt="Metrixcom"
        width={size}
        height={size}
        className="object-contain brightness-0 dark:brightness-0 dark:invert shrink-0"
        style={{ width: size, height: size }}
      />
      {!iconOnly && (
        <span
          className="text-[11px] font-normal uppercase tracking-[0.14em] whitespace-nowrap"
          style={{ fontFamily: "'Michroma', 'Orbitron', sans-serif" }}
        >
          Crux<span className="text-muted-foreground ml-1.5 tracking-normal normal-case text-[10.5px]" style={{ fontFamily: "inherit" }}>AI</span>
        </span>
      )}
    </div>
  );
}

