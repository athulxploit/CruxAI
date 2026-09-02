import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, X, Sparkles, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export function BuildWithAIModal({ isOpen, onClose, onGenerate }: { 
  isOpen: boolean, 
  onClose: () => void,
  onGenerate: (prompt: string) => void
}) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    toast.info("Crux AI is designing your workflow...");
    
    // Simulate AI generation
    await new Promise(r => setTimeout(r, 2000));
    
    onGenerate(prompt);
    setIsGenerating(false);
    onClose();
    toast.success("Workflow generated successfully!");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Build with Crux AI</h3>
                  <p className="text-xs text-muted-foreground">Describe your automation goal in natural language</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
            
            <div className="p-6 space-y-4">
              <Textarea 
                placeholder="Example: Every morning at 9 AM, check my Gmail for security alerts, summarize them using Crux AI, and send the summary to Slack."
                className="min-h-[150px] text-sm resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>AI will identify required nodes, configure defaults, and create the graph.</span>
              </div>
            </div>

            <div className="p-6 bg-surface border-t border-border flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim()}
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Wand2 className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                {isGenerating ? "Generating..." : "Generate Workflow"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Utility for cn
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
