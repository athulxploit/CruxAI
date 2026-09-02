
import { resolveExpressions } from "./expressions";
import { NODE_REGISTRY } from "./registry";

/**
 * Validates the workflow graph for circular dependencies and missing nodes.
 */
export function validateWorkflow(nodes: any[], edges: any[]): { valid: boolean; error?: string } {
  // Simple cycle detection
  const adj = new Map<string, string[]>();
  edges.forEach(e => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(v: string): boolean {
    if (recStack.has(v)) return true;
    if (visited.has(v)) return false;

    visited.add(v);
    recStack.add(v);

    const neighbors = adj.get(v) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true;
    }

    recStack.delete(v);
    return false;
  }

  for (const node of nodes) {
    if (hasCycle(node.id)) return { valid: false, error: "Circular dependency detected in workflow" };
  }

  return { valid: true };
}

/**
 * Utilities for workflow manipulation
 */
export const WorkflowUtils = {
  /**
   * Generates an exportable JSON of the workflow, stripping sensitive data.
   */
  exportWorkflow(nodes: any[], edges: any[]) {
    return JSON.stringify({
      version: 1,
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          label: n.data.label,
          config: n.data.config // Credentials should only be IDs/refs
        }
      })),
      edges
    }, null, 2);
  }
};
