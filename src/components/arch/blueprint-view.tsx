import { useState, useMemo } from "react";
import { 
  Target, 
  Settings, 
  Lightbulb, 
  Zap, 
  Layers, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  FileText,
  History,
  Activity,
  Milestone,
  ShieldCheck,
  Search,
  Plus,
  Box,
  Code,
  Globe,
  Smartphone,
  Server,
  Terminal,
  Brain,
  Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface BlueprintViewProps {
  workspaceId: string;
  initialBlueprint: any;
}

export function BlueprintView({ workspaceId, initialBlueprint }: BlueprintViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const sections = [
    { id: 'identity', icon: Target, label: 'Identity', desc: 'Project name, type, and vision' },
    { id: 'requirements', icon: ShieldCheck, label: 'Requirements', desc: 'Functional, technical, and security' },
    { id: 'features', icon: Lightbulb, label: 'Features', desc: 'Core capabilities and priority' },
    { id: 'ux', icon: Layers, label: 'UX & Design', desc: 'User flows and interaction' },
    { id: 'architecture', icon: Layers, label: 'Technical', desc: 'Stack, APIs, and Infrastructure' },
    { id: 'security', icon: ShieldCheck, label: 'Security', desc: 'Threats and auth logic' },
    { id: 'logic', icon: Activity, label: 'Business Logic', desc: 'Rules and workflows' },
    { id: 'decisions', icon: Zap, label: 'Decisions', desc: 'Key choices and tracking' },
    { id: 'constraints', icon: AlertCircle, label: 'Constraints', desc: 'Budget, performance, legal' },
    { id: 'milestones', icon: Milestone, label: 'Milestones', desc: 'Development stages' },
    { id: 'tasks', icon: CheckCircle2, label: 'Tasks', desc: 'Implementation items' },
    { id: 'questions', icon: HelpCircle, label: 'Open Questions', desc: 'Missing requirements' },
    { id: 'history', icon: History, label: 'Change History', desc: 'Version timeline' },
  ];

  const blueprint = initialBlueprint || {
    title: workspaceId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
    tagline: "Your project's living intelligence.",
    progress: 0,
    status: 'active',
    current_milestone: 'Initial Setup'
  };

  const projectTypeIcons: Record<string, any> = {
    'Website': Globe,
    'SaaS': Cloud,
    'Software': Box,
    'Desktop': Terminal,
    'Mobile': Smartphone,
    'API': Server,
    'AI System': Brain,
    'Cybersecurity': ShieldCheck,
    'Automation': Activity,
    'Engineering': Code,
  };

  const TypeIcon = blueprint.project_type ? (projectTypeIcons[blueprint.project_type] || Box) : Box;

  return (
    <div className="flex flex-col h-full bg-background selection:bg-primary/20">
      {/* Header */}
      <div className="px-8 py-8 border-b border-border bg-surface/30 backdrop-blur-md relative overflow-hidden">
        {/* Abstract intelligence background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-8 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <TypeIcon className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{blueprint.title}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10">
                    {blueprint.project_type || 'Unclassified Project'}
                  </span>
                  <p className="text-muted-foreground text-xs font-medium opacity-70 italic">
                    {blueprint.tagline}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-12 gap-y-6 text-xs">
            <div className="space-y-2">
              <div className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">Protocol ID</div>
              <div className="font-mono text-[11px] text-foreground/90 bg-surface/80 px-3 py-1 rounded-md border border-border/60 shadow-sm">
                {blueprint.protocol_id || 'XCOMM-PRJ-PENDING'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">Protocol Status</div>
              <div className="flex items-center gap-2.5 px-3 py-1 rounded-md bg-primary/5 border border-primary/10">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]",
                  blueprint.status === 'ready_for_build' ? "bg-green-500 text-green-500" : "bg-primary text-primary animate-pulse"
                )} />
                <span className="capitalize font-bold tracking-wide">{blueprint.status?.replace('_', ' ') || 'Discovery'}</span>
              </div>
            </div>
            
            <div className="space-y-2 min-w-[140px]">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">completeness</span>
                <span className="font-mono text-[11px] text-primary font-bold">{blueprint.completeness ?? 0}%</span>
              </div>
              <Progress value={blueprint.completeness ?? 0} className="h-1 bg-surface border border-border/20" />
            </div>
            
            <div className="space-y-2">
              <div className="text-muted-foreground uppercase tracking-widest text-[9px] font-bold">Current Milestone</div>
              <div className="font-bold text-foreground/90 flex items-center gap-2">
                <Milestone className="h-3 w-3 text-muted-foreground" />
                {blueprint.current_milestone || "Discovery Phase"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 p-8 items-start">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 flex-none md:sticky md:top-6 self-start">

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Ask this Blueprint..." 
                className="pl-9 bg-surface/50 border-border/50 text-xs h-9 focus-visible:ring-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="max-h-[calc(100vh-220px)] pr-4">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      const el = document.getElementById(`section-${section.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface transition-all group"
                  >
                    <section.icon className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                    <span className="truncate">{section.label}</span>
                  </button>
                ))}
              </nav>
            </ScrollArea>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 bg-surface/20 rounded-2xl border border-border/40 flex flex-col">
             <div className="flex-1">
                <div className="p-8 space-y-16 pb-24">

                  {blueprint.status === 'ready_for_build' && (
                    <div className="p-8 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-8 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)] relative overflow-hidden group mb-8">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-colors" />
                      <div className="space-y-1.5 relative z-10">
                        <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          Blueprint Validated
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          The Project Protocol is now authoritative. High-fidelity implementation plan generated.
                        </p>
                      </div>
                      <Button className="bg-primary text-primary-foreground font-bold px-8 h-12 rounded-xl hover:shadow-[0_0_20px_var(--primary)] transition-all relative z-10">
                        Start Building
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-16">
                    {sections.map((section) => (
                      <section key={section.id} id={`section-${section.id}`} className="space-y-6 scroll-mt-8">
                        <div className="flex items-center justify-between border-b border-border/40 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-surface border border-border/50">
                              <section.icon className="h-4 w-4 text-primary" strokeWidth={2} />
                            </div>
                            <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold text-foreground/80">{section.label}</h2>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono opacity-50"># {section.id}</span>
                        </div>
                        
                        <div className="min-h-[160px] rounded-2xl border border-dashed border-border/40 bg-surface/10 p-8 flex flex-col items-center justify-center text-center group hover:bg-surface/20 hover:border-primary/30 transition-all duration-500">
                          <div className="w-12 h-12 rounded-full bg-surface border border-border/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Plus className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                          </div>
                          <p className="text-sm text-muted-foreground/60 max-w-sm font-medium mb-6">
                            {section.desc}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 px-6 text-xs border-border/60 hover:border-primary/50 gap-2 bg-surface/50 backdrop-blur-sm rounded-lg"
                          >
                            Add {section.label}
                          </Button>
                        </div>
                      </section>
                    ))}
                  </div>

                  <div className="py-12 border-t border-border/20 flex flex-col items-center justify-center text-center opacity-40">
                     <Layers className="h-8 w-8 text-muted-foreground mb-4" strokeWidth={1} />
                     <p className="text-sm text-muted-foreground font-medium">The Project Protocol continuously evolves with your conversation.</p>
                  </div>
                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
}
