import type { ReactNode } from "react";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-8 py-10">
        <header className="mb-8">
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
