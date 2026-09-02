import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Brain, Split, Globe, Terminal, Mail, Plus, Search, 
  ChevronRight, Play, Save, Trash2, Settings2, X, Info,
  SearchIcon, Layers, Activity, Database, History, HelpCircle,
  MoreHorizontal, AlertCircle, CheckCircle2, Clock, FileText, Code, Shield, Repeat, GitBranch
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NODE_REGISTRY, type NodeType, type NodeDefinition } from "@/lib/workflow/registry";
import { WorkflowEngine, type ExecutionResult } from "@/lib/workflow/engine";
import { toast } from "sonner";
import { WorkflowHeader } from "./WorkflowHeader";
import { NodeLibrary } from "./NodeLibrary";

// --- Types ---

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, any>;
    status?: ExecutionResult['status'];
    executionData?: ExecutionResult;
  };
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

// --- Components ---

export function WorkflowEditor() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [workflowName, setWorkflowName] = useState("New Workflow");
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [activeConnection, setActiveConnection] = useState<{ 
    nodeId: string, 
    portId: string, 
    portType: 'source' | 'target', 
    pos: { x: number, y: number } 
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // --- Handlers ---

  const addNode = (type: string, pos?: { x: number, y: number }) => {
    const def = NODE_REGISTRY[type];
    if (!def) return;

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type,
      position: pos || { x: 400 - viewState.x, y: 300 - viewState.y },
      data: {
        label: def.label,
        config: {}
      }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setIsConfigOpen(true);
    setSaveStatus('unsaved');
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background'))) {
      setIsDraggingCanvas(true);
      dragStart.current = { x: e.clientX - viewState.x, y: e.clientY - viewState.y };
      setSelectedNodeId(null);
      setIsConfigOpen(false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setViewState(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
    } else if (activeConnection) {
      setActiveConnection(prev => prev ? { ...prev, pos: { x: e.clientX, y: e.clientY } } : null);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    setActiveConnection(null);
  };

  const runWorkflow = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    toast.info("Starting workflow execution...");

    // Reset statuses
    setNodes(prev => prev.map(n => ({ ...n, data: { ...n.data, status: undefined, executionData: undefined } })));

    // For now, auto-connect nodes if no edges
    let workflowEdges = edges;
    if (edges.length === 0 && nodes.length > 1) {
      const newEdges: Edge[] = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        newEdges.push({
          id: `edge_${Date.now()}_${i}`,
          source: nodes[i].id,
          target: nodes[i+1].id
        });
      }
      setEdges(newEdges);
      workflowEdges = newEdges;
    }

    const engine = new WorkflowEngine(nodes, workflowEdges, (result) => {
      setNodes(prev => prev.map(n => 
        n.id === result.nodeId 
          ? { ...n, data: { ...n.data, status: result.status, executionData: result } }
          : n
      ));
    });

    try {
      await engine.run();
      toast.success("Workflow completed successfully");
    } catch (err) {
      toast.error("Workflow failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAIGenerate = (prompt: string) => {
    // Basic mock generation of nodes for the demo
    const newNodes: Node[] = [
      {
        id: 'node_cron',
        type: 'cron-schedule',
        position: { x: 100, y: 100 },
        data: { label: '9 AM Schedule', config: { cron: '0 9 * * *' } }
      },
      {
        id: 'node_gmail',
        type: 'gmail-send',
        position: { x: 400, y: 100 },
        data: { label: 'Check Alerts', config: { subject: 'Security Alert' } }
      },
      {
        id: 'node_ai',
        type: 'xcom-ai',
        position: { x: 700, y: 100 },
        data: { label: 'Crux AI Summary', config: { prompt: 'Summarize the security alerts found in the email.' } }
      },
      {
        id: 'node_slack',
        type: 'slack-notify',
        position: { x: 1000, y: 100 },
        data: { label: 'Slack Alert', config: { channel: '#security', message: '{{ $node("Crux AI Summary").json.text }}' } }
      }
    ];
    
    const newEdges: Edge[] = [
      { id: 'e1', source: 'node_cron', target: 'node_gmail' },
      { id: 'e2', source: 'node_gmail', target: 'node_ai' },
      { id: 'e3', source: 'node_ai', target: 'node_slack' }
    ];

    setNodes(newNodes);
    setEdges(newEdges);
    setWorkflowName("AI Generated Workflow");
    setSaveStatus('unsaved');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const { saveWorkflow } = await import('@/lib/workflow/persistence.functions');
      // Pass the object directly to the function, do not use fetcher-style object yet
      // unless we are using a hook. Direct call is function(data).
      await saveWorkflow({
        data: {
          name: workflowName,
          nodes: nodes,
          edges: edges,
          status: 'draft'
        }
      });
      setSaveStatus('saved');
      toast.success("Workflow saved to database");
    } catch (err: any) {
      setSaveStatus('unsaved');
      toast.error("Failed to save workflow: " + err.message);
    }
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden select-none">
      <WorkflowHeader 
        name={workflowName} 
        status={saveStatus}
        onSave={handleSave}
        onTest={() => toast.info("Test execution started")}
        onExecute={runWorkflow}
        onGenerate={handleAIGenerate}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Node Library */}
        <NodeLibrary onAdd={addNode} />

        {/* Central Canvas */}
        <main 
          ref={canvasRef}
          className="relative flex-1 bg-dot-grid cursor-grab active:cursor-grabbing overflow-hidden canvas-background"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          <div 
            style={{ 
              transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.zoom})`,
              transformOrigin: '0 0'
            }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Edges */}
            <svg className="absolute inset-0 w-[10000px] h-[10000px] overflow-visible pointer-events-none">
              {edges.map(edge => (
                <WorkflowEdge key={edge.id} edge={edge} nodes={nodes} />
              ))}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <WorkflowNode 
                key={node.id} 
                node={node} 
                selected={selectedNodeId === node.id}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setIsConfigOpen(true);
                }}
                onDrag={(pos) => {
                  setNodes(prev => prev.map(n => n.id === node.id ? { ...n, position: pos } : n));
                  setSaveStatus('unsaved');
                }}
                onStartConnection={(nodeId, portId, portType, pos) => {
                  setActiveConnection({ nodeId, portId, portType, pos });
                }}
              />
            ))}
          </div>

          {/* Canvas Controls */}
          <div className="absolute bottom-6 right-6 flex items-center gap-2 p-1 rounded-xl bg-surface/80 backdrop-blur-md border border-border shadow-lg z-20">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewState(v => ({ ...v, zoom: Math.max(0.2, v.zoom - 0.1) }))}>
              <X className="h-4 w-4" />
            </Button>
            <div className="text-[10px] font-mono px-2">{Math.round(viewState.zoom * 100)}%</div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewState(v => ({ ...v, zoom: Math.min(2, v.zoom + 0.1) }))}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </main>

        {/* Right Sidebar: Config Panel */}
        <AnimatePresence>
          {isConfigOpen && selectedNode && (
            <motion.aside 
              initial={{ x: 350 }}
              animate={{ x: 0 }}
              exit={{ x: 350 }}
              className="z-30 w-[350px] border-l border-border bg-surface flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    {(() => {
                      const Icon = NODE_REGISTRY[selectedNode.type]?.icon || Brain;
                      return <Icon className="h-3.5 w-3.5 text-primary" />;
                    })()}
                  </div>
                  <span className="text-sm font-semibold">{selectedNode.data.label}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsConfigOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {selectedNode.data.status && (
                  <div className={cn(
                    "p-3 rounded-xl border flex items-center gap-3 mb-4",
                    selectedNode.data.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                    selectedNode.data.status === 'failed' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                    "bg-primary/10 border-primary/20 text-primary"
                  )}>
                    <Activity className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="text-[10px] uppercase font-bold">Execution Status</div>
                      <div className="text-xs capitalize">{selectedNode.data.status}</div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {NODE_REGISTRY[selectedNode.type]?.configFields.map(field => (
                    <div key={field.name} className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{field.label}</label>
                      {field.type === 'textarea' ? (
                        <textarea 
                          className="w-full min-h-[100px] rounded-xl border border-border bg-background/50 p-3 text-xs focus:ring-1 focus:ring-primary outline-none transition-all"
                          placeholder={field.placeholder}
                          value={selectedNode.data.config[field.name] || ''}
                          onChange={(e) => {
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? {
                              ...n,
                              data: { ...n.data, config: { ...n.data.config, [field.name]: e.target.value } }
                            } : n));
                            setSaveStatus('unsaved');
                          }}
                        />
                      ) : field.type === 'code' ? (
                         <textarea 
                          className="w-full min-h-[150px] font-mono rounded-xl border border-border bg-black/80 p-3 text-[10px] text-emerald-400 focus:ring-1 focus:ring-primary outline-none transition-all"
                          placeholder={field.placeholder}
                          value={selectedNode.data.config[field.name] || ''}
                          onChange={(e) => {
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? {
                              ...n,
                              data: { ...n.data, config: { ...n.data.config, [field.name]: e.target.value } }
                            } : n));
                            setSaveStatus('unsaved');
                          }}
                        />
                      ) : (
                        <Input 
                          className="h-9 rounded-xl border border-border bg-background/50 text-xs"
                          placeholder={field.placeholder}
                          value={selectedNode.data.config[field.name] || ''}
                          onChange={(e) => {
                            setNodes(prev => prev.map(n => n.id === selectedNode.id ? {
                              ...n,
                              data: { ...n.data, config: { ...n.data.config, [field.name]: e.target.value } }
                            } : n));
                            setSaveStatus('unsaved');
                          }}
                        />
                      )}
                    </div>
                  ))}

                  {selectedNode.data.executionData && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Output Data</div>
                      <pre className="p-3 rounded-xl bg-background border border-border text-[10px] font-mono overflow-x-auto">
                        {JSON.stringify(selectedNode.data.executionData.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2 h-8"
                  onClick={() => {
                    setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
                    setEdges(prev => prev.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                    setSelectedNodeId(null);
                    setSaveStatus('unsaved');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Node
                </Button>
                <Button size="sm" className="h-8 px-4" onClick={() => setIsConfigOpen(false)}>Done</Button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WorkflowNode({ 
  node, 
  selected, 
  onClick, 
  onDrag, 
  onStartConnection 
}: { 
  node: Node, 
  selected: boolean, 
  onClick: () => void, 
  onDrag: (pos: { x: number, y: number }) => void,
  onStartConnection: (nodeId: string, portId: string, portType: 'source' | 'target', pos: { x: number, y: number }) => void
}) {
  const isDragging = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const def = NODE_REGISTRY[node.type];

  const onMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    isDragging.current = true;
    dragStartOffset.current = { x: e.clientX - node.position.x, y: e.clientY - node.position.y };
    onClick();

    const moveHandler = (e: MouseEvent) => {
      if (isDragging.current) {
        onDrag({ x: e.clientX - dragStartOffset.current.x, y: e.clientY - dragStartOffset.current.y });
      }
    };
    
    const upHandler = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  };

  const handlePortMouseDown = (e: React.MouseEvent, portId: string, type: 'source' | 'target') => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    // Get center of port relative to canvas origin (0,0) - this is tricky because of zoom/pan
    // For now we use the mouse position as a start
    onStartConnection(node.id, portId, type, { x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      style={{ left: node.position.x, top: node.position.y }}
      className={cn(
        "absolute w-[220px] pointer-events-auto rounded-2xl border-2 bg-surface shadow-2xl transition-all z-10",
        selected ? "border-primary shadow-primary/20 scale-[1.02]" : "border-border hover:border-primary/30",
        node.data.status === 'running' && "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse"
      )}
      onMouseDown={onMouseDown}
    >
      <div className={cn(
        "h-2 w-full rounded-t-[14px]",
        def?.type === 'trigger' ? "bg-emerald-500" :
        def?.type === 'ai' ? "bg-purple-500" :
        def?.type === 'logic' ? "bg-amber-500" :
        "bg-blue-500"
      )} />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-background flex items-center justify-center border border-border">
            {def && <def.icon className="h-5 w-5" style={{ color: def.color }} />}
          </div>
          <div className="flex-1 min-w-0">
             <div className="text-sm font-bold truncate">{node.data.label}</div>
             <div className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{def?.type}</div>
          </div>
          {node.data.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />}
          {node.data.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500 fill-red-500/20" />}
        </div>
      </div>

      {/* Ports */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        {Array.from({ length: def?.inputs || 0 }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 w-4 rounded-full border-2 border-border bg-surface hover:bg-primary transition-colors cursor-crosshair group relative"
            onMouseDown={(e) => handlePortMouseDown(e, `in-${i}`, 'target')}
          >
             <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-[8px] text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-30">Input</div>
          </div>
        ))}
      </div>
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3">
        {Array.from({ length: def?.outputs || 0 }).map((_, i) => (
          <div 
            key={i} 
            className="h-4 w-4 rounded-full border-2 border-border bg-surface hover:bg-primary transition-colors cursor-crosshair group relative"
            onMouseDown={(e) => handlePortMouseDown(e, `out-${i}`, 'source')}
          >
             <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-[8px] text-white px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-30">Output</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowEdge({ edge, nodes }: { edge: Edge, nodes: Node[] }) {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  const startX = sourceNode.position.x + 220;
  const startY = sourceNode.position.y + 60;
  const endX = targetNode.position.x;
  const endY = targetNode.position.y + 60;

  const cp1x = startX + (endX - startX) * 0.4;
  const cp2x = startX + (endX - startX) * 0.6;

  const path = `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;

  return (
    <g>
      <path 
        d={path} 
        fill="none" 
        stroke="var(--border)" 
        strokeWidth="2" 
        className="transition-colors hover:stroke-primary/50"
      />
      <path 
        d={path} 
        fill="none" 
        stroke="var(--primary)" 
        strokeWidth="2" 
        strokeDasharray="8 8" 
        className={cn(
          "opacity-0 transition-opacity",
          sourceNode.data.status === 'running' && "opacity-100 animate-workflow-flow"
        )}
      />
    </g>
  );
}
