import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
  stickyHeader,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  stickyHeader?: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 pointer-events-auto relative z-0 scroll-smooth overscroll-contain h-full">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <header className={cn("mb-8", stickyHeader && "sticky top-[-40px] z-20 bg-background/80 backdrop-blur-md pb-4 -mx-8 px-8 pt-10")}>
          <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
