import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NODE_REGISTRY } from "@/lib/workflow/registry";

export function NodeLibrary({ onAdd }: { onAdd: (type: string) => void }) {
  const categories = Array.from(new Set(Object.values(NODE_REGISTRY).map(n => n.type)));

  return (
    <div className="w-64 border-r border-border bg-surface flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search nodes..." className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {categories.map(cat => (
          <div key={cat}>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">{cat}</h4>
            <div className="grid gap-1">
              {Object.values(NODE_REGISTRY).filter(n => n.type === cat).map(n => (
                <button key={n.name} onClick={() => onAdd(n.name)} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-background transition-colors text-xs text-left w-full">
                  <n.icon className="h-4 w-4" style={{ color: n.color }} />
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
