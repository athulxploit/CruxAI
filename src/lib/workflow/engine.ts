import { NODE_REGISTRY } from "./registry";
import { resolveExpressions } from "./expressions";

export interface ExecutionResult {
  nodeId: string;
  status: 'success' | 'failed' | 'running' | 'waiting';
  input: any;
  output: any;
  error?: string;
  duration: number;
}

export interface WorkflowState {
  nodes: any[];
  edges: any[];
  executionData: Record<string, ExecutionResult>;
}

export class WorkflowEngine {
  private state: WorkflowState;
  private onNodeUpdate: (result: ExecutionResult) => void;

  constructor(nodes: any[], edges: any[], onNodeUpdate: (result: ExecutionResult) => void) {
    this.state = { nodes, edges, executionData: {} };
    this.onNodeUpdate = onNodeUpdate;
  }

  async run(startNodeId?: string) {
    const startNodes = startNodeId 
      ? this.state.nodes.filter(n => n.id === startNodeId)
      : this.state.nodes.filter(n => NODE_REGISTRY[n.type]?.type === 'trigger');

    for (const node of startNodes) {
      await this.executeNode(node.id, {});
    }
  }

  private async executeNode(nodeId: string, inputData: any) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const startTime = Date.now();
    this.updateNodeStatus(nodeId, 'running', inputData, null);

    try {
      const nodeDef = NODE_REGISTRY[node.type];
      if (!nodeDef) throw new Error(`Unknown node type: ${node.type}`);

      // Resolve expressions in config
      const resolvedConfig: Record<string, any> = {};
      const context = { 
        json: inputData, 
        nodes: Object.fromEntries(
          Object.entries(this.state.executionData).map(([id, res]) => [
            this.state.nodes.find(n => n.id === id)?.data?.name || id,
            { json: res.output }
          ])
        )
      };

      for (const field of nodeDef.configFields) {
        const val = node.data?.config?.[field.name];
        resolvedConfig[field.name] = resolveExpressions(val, context);
      }

      // Execute node logic
      let outputData = { ...inputData };
      
      if (node.type === 'xcom-ai' || node.type === 'llm-node') {
        await new Promise(r => setTimeout(r, 2000));
        outputData = { 
          text: `[Metrixcom Engine] AI Analysis for: "${resolvedConfig.prompt || resolvedConfig.userPrompt || 'Input'}"\n\nResult: Data points synthesized and routed.`,
          timestamp: new Date().toISOString()
        };
      } else if (node.type === 'http-request') {
        try {
          const res = await fetch(resolvedConfig.url, {
            method: resolvedConfig.method || 'GET',
            body: resolvedConfig.body ? JSON.stringify(resolvedConfig.body) : undefined,
            headers: { 'Content-Type': 'application/json' }
          });
          outputData = await res.json();
        } catch (e: any) {
          throw new Error(`HTTP Request failed: ${e.message}`);
        }
      } else if (node.type === 'manual-trigger' || node.type === 'webhook') {
        outputData = { triggeredAt: new Date().toISOString(), data: inputData };
      } else if (node.type === 'gmail-send') {
        await new Promise(r => setTimeout(r, 1000));
        outputData = { sent: true, to: resolvedConfig.to, subject: resolvedConfig.subject };
      } else if (node.type === 'github-repo') {
        await new Promise(r => setTimeout(r, 1000));
        outputData = { repo: resolvedConfig.repo, stars: Math.floor(Math.random() * 1000) };
      } else if (node.type === 'slack-notify') {
        await new Promise(r => setTimeout(r, 800));
        outputData = { status: 'message_sent', channel: resolvedConfig.channel };
      } else if (node.type === 'javascript-code') {
        try {
          // Dangerous but for demo: eval code in context
          const func = new Function('$json', '$vars', `return (${resolvedConfig.code})`);
          outputData = func(inputData, {});
        } catch (e: any) {
          throw new Error(`JS execution failed: ${e.message}`);
        }
      } else if (node.type === 'set-data') {
        outputData = typeof resolvedConfig.values === 'string' ? JSON.parse(resolvedConfig.values) : resolvedConfig.values;
      } else if (node.type === 'security-scan') {
        await new Promise(r => setTimeout(r, 2500));
        outputData = { scanComplete: true, vulnerabilities: 0, score: 100 };
      }




      const duration = Date.now() - startTime;
      this.updateNodeStatus(nodeId, 'success', inputData, outputData, undefined, duration);

      // Find next nodes
      const outgoingEdges = this.state.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        // Handle logic nodes branching
        if (node.type === 'if-condition') {
          // Mock evaluation: always take 'True' path (sourceHandle === 'output-0')
          const conditionResult = true; 
          const targetHandle = edge.sourceHandle;
          if ((conditionResult && targetHandle === 'output-0') || (!conditionResult && targetHandle === 'output-1')) {
            await this.executeNode(edge.target, outputData);
          }
        } else {
          await this.executeNode(edge.target, outputData);
        }
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.updateNodeStatus(nodeId, 'failed', inputData, null, error.message, duration);
    }
  }

  private updateNodeStatus(nodeId: string, status: ExecutionResult['status'], input: any, output: any, error?: string, duration: number = 0) {
    const result: ExecutionResult = { nodeId, status, input, output, error, duration };
    this.state.executionData[nodeId] = result;
    this.onNodeUpdate(result);
  }
}
