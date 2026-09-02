/**
 * Resolves Crux expressions like {{ $json.field }} or {{ $node("Name").json.field }}
 */
export function resolveExpressions(value: any, context: any): any {
  if (typeof value !== 'string') return value;

  const expressionRegex = /{{(.*?)}}/g;
  
  return value.replace(expressionRegex, (match, expression) => {
    try {
      const cleanExpr = expression.trim();
      
      // Handle $json.property
      if (cleanExpr.startsWith('$json')) {
        return getProperty(context.json, cleanExpr.replace('$json.', ''));
      }
      
      // Handle $node("Name").json.property
      if (cleanExpr.startsWith('$node')) {
        const nodeMatch = cleanExpr.match(/$node\("([^"]+)"\)\.json\.(.*)/);
        if (nodeMatch) {
          const [, nodeName, property] = nodeMatch;
          return getProperty(context.nodes[nodeName]?.json, property);
        }
      }
      
      // Handle $vars.property
      if (cleanExpr.startsWith('$vars')) {
        return getProperty(context.vars, cleanExpr.replace('$vars.', ''));
      }

      return match;
    } catch (e) {
      console.warn('Failed to resolve expression:', expression, e);
      return match;
    }
  });
}

function getProperty(obj: any, path: string) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
}
