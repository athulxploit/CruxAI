import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Save, MoreHorizontal, AlertCircle, CheckCircle2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuildWithAIModal } from "./BuildWithAIModal";

export function WorkflowHeader({ name, status, onSave, onTest, onExecute, onGenerate }: { 
  name: string, 
  status: 'saved' | 'saving' | 'unsaved',
  onSave: () => void,
  onTest: () => void,
  onExecute: () => void,
  onGenerate: (prompt: string) => void
}) {
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
      <div className="flex items-center gap-4">
        <input 
          className="bg-transparent font-semibold text-lg outline-none focus:border-b border-primary transition-all"
          value={name}
          onChange={() => {}} // Handle name change if needed
        />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === 'saved' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
          {status === 'unsaved' && <AlertCircle className="h-3.5 w-3.5 text-amber-500" />}
          <span className="capitalize">{status}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAIModalOpen(true)}
          className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
        >
          <Wand2 className="h-3.5 w-3.5" /> Build with AI
        </Button>
        <div className="w-px h-4 bg-border mx-2" />
        <Button variant="outline" size="sm" onClick={onTest}>Test</Button>
        <Button variant="outline" size="sm" onClick={onExecute} className="gap-2">
          <Play className="h-3.5 w-3.5" fill="currentColor" /> Execute
        </Button>
        <Button size="sm" onClick={onSave} className="gap-2">
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
      </div>

      <BuildWithAIModal 
        isOpen={isAIModalOpen} 
        onClose={() => setIsAIModalOpen(false)} 
        onGenerate={onGenerate}
      />
    </div>
  );
}

