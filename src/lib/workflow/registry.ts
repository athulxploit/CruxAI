
import { LucideIcon, Zap, MessageSquare, Brain, Search, Filter, Share2, Split, Repeat, Clock, Code, Shield, Mail, Github, Slack, Layout, Database, Terminal, FileText, Globe, GitBranch, Layers } from "lucide-react";

export type NodeType = 'trigger' | 'ai' | 'logic' | 'data' | 'dev' | 'security' | 'integration' | 'files' | 'system';

export interface NodeDefinition {
  type: NodeType;
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  inputs: number;
  outputs: number;
  configFields: ConfigField[];
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'boolean' | 'number' | 'code' | 'credential';
  options?: { label: string; value: string }[];
  placeholder?: string;
  defaultValue?: any;
}

export const NODE_REGISTRY: Record<string, NodeDefinition> = {
  // --- TRIGGERS ---
  'manual-trigger': {
    type: 'trigger',
    name: 'manual-trigger',
    label: 'Manual Trigger',
    description: 'Start the workflow manually',
    icon: Zap,
    color: '#10b981',
    inputs: 0,
    outputs: 1,
    configFields: []
  },
  'webhook': {
    type: 'trigger',
    name: 'webhook',
    label: 'Webhook',
    description: 'Trigger via HTTP request',
    icon: Globe,
    color: '#10b981',
    inputs: 0,
    outputs: 1,
    configFields: [
      { name: 'method', label: 'Method', type: 'select', options: [{ label: 'POST', value: 'POST' }, { label: 'GET', value: 'GET' }], defaultValue: 'POST' },
      { name: 'path', label: 'URL Path', type: 'text', placeholder: 'my-webhook-path' },
      { name: 'auth', label: 'Authentication', type: 'select', options: [{ label: 'None', value: 'none' }, { label: 'API Key', value: 'apikey' }], defaultValue: 'none' }
    ]
  },
  'cron-schedule': {
    type: 'trigger',
    name: 'cron-schedule',
    label: 'Schedule/Cron',
    description: 'Trigger on a timed interval',
    icon: Clock,
    color: '#10b981',
    inputs: 0,
    outputs: 1,
    configFields: [
      { name: 'cron', label: 'Cron Expression', type: 'text', placeholder: '0 9 * * *' }
    ]
  },
  'event-trigger': {
    type: 'trigger',
    name: 'event-trigger',
    label: 'Event Trigger',
    description: 'Trigger on system event',
    icon: Zap,
    color: '#10b981',
    inputs: 0,
    outputs: 1,
    configFields: [
      { name: 'event', label: 'Event Name', type: 'text' }
    ]
  },
  'file-trigger': {
    type: 'trigger',
    name: 'file-trigger',
    label: 'File Trigger',
    description: 'Trigger on file upload',
    icon: FileText,
    color: '#10b981',
    inputs: 0,
    outputs: 1,
    configFields: [
      { name: 'path', label: 'Storage Path', type: 'text' }
    ]
  },

  // --- AI ---
  'xcom-ai': {
    type: 'ai',
    name: 'xcom-ai',
    label: 'Crux AI',
    description: 'General intelligence processing',
    icon: Brain,
    color: '#a855f7',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Analyze this data...' },
      { name: 'model', label: 'Model', type: 'select', options: [
        { label: 'Metrix-3 Engine', value: 'metrix-3' },
        { label: 'GPT-5.6 Sol', value: 'gpt-5-6' }
      ] }
    ]
  },
  'llm-node': {
    type: 'ai',
    name: 'llm-node',
    label: 'LLM',
    description: 'Direct LLM call',
    icon: MessageSquare,
    color: '#a855f7',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'prompt', label: 'System Prompt', type: 'textarea' },
      { name: 'userPrompt', label: 'User Prompt', type: 'textarea' }
    ]
  },
  'structured-output': {
    type: 'ai',
    name: 'structured-output',
    label: 'Structured Output',
    description: 'AI with JSON output schema',
    icon: Code,
    color: '#a855f7',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'schema', label: 'JSON Schema', type: 'code' }
    ]
  },

  // --- LOGIC ---
  'if-condition': {
    type: 'logic',
    name: 'if-condition',
    label: 'IF',
    description: 'Branch based on condition',
    icon: Split,
    color: '#f59e0b',
    inputs: 1,
    outputs: 2,
    configFields: [
      { name: 'condition', label: 'Condition', type: 'code', placeholder: '{{ $json.value }} === "active"' }
    ]
  },
  'switch-node': {
    type: 'logic',
    name: 'switch-node',
    label: 'Switch',
    description: 'Route to multiple outputs',
    icon: GitBranch,
    color: '#f59e0b',
    inputs: 1,
    outputs: 4,
    configFields: [
      { name: 'expression', label: 'Expression', type: 'code' }
    ]
  },
  'merge-node': {
    type: 'logic',
    name: 'merge-node',
    label: 'Merge',
    description: 'Combine multiple inputs',
    icon: Layers,
    color: '#f59e0b',
    inputs: 2,
    outputs: 1,
    configFields: []
  },
  'loop-node': {
    type: 'logic',
    name: 'loop-node',
    label: 'Loop',
    description: 'Iterate over array data',
    icon: Repeat,
    color: '#f59e0b',
    inputs: 1,
    outputs: 2,
    configFields: [
      { name: 'field', label: 'Array Field', type: 'text' }
    ]
  },

  // --- DATA ---
  'set-data': {
    type: 'data',
    name: 'set-data',
    label: 'Set Data',
    description: 'Define workflow variables',
    icon: Database,
    color: '#06b6d4',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'values', label: 'JSON Data', type: 'code' }
    ]
  },
  'transform-node': {
    type: 'data',
    name: 'transform-node',
    label: 'Transform',
    description: 'Remap or modify data object',
    icon: Share2,
    color: '#06b6d4',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'mapping', label: 'Transformation', type: 'code' }
    ]
  },

  // --- DEVELOPMENT ---
  'http-request': {
    type: 'dev',
    name: 'http-request',
    label: 'HTTP Request',
    description: 'Make an external API call',
    icon: Globe,
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com' },
      { name: 'method', label: 'Method', type: 'select', options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' }
      ], defaultValue: 'GET' },
      { name: 'body', label: 'Body', type: 'code' }
    ]
  },
  'javascript-code': {
    type: 'dev',
    name: 'javascript-code',
    label: 'JavaScript',
    description: 'Run custom JS code',
    icon: Code,
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'code', label: 'JavaScript Code', type: 'code' }
    ]
  },

  // --- SECURITY ---
  'security-scan': {
    type: 'security',
    name: 'security-scan',
    label: 'Security Scan',
    description: 'Vulnerability analysis',
    icon: Shield,
    color: '#ef4444',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'target', label: 'Scan Target', type: 'text' }
    ]
  },
  'vuln-check': {
    type: 'security',
    name: 'vuln-check',
    label: 'Vulnerability Check',
    description: 'Check for CVEs',
    icon: Shield,
    color: '#ef4444',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'package', label: 'Package Name', type: 'text' }
    ]
  },

  // --- FILES ---
  'read-file': {
    type: 'files',
    name: 'read-file',
    label: 'Read File',
    description: 'Load file from storage',
    icon: FileText,
    color: '#71717a',
    inputs: 0,
    outputs: 1,
    configFields: [
      { name: 'path', label: 'File Path', type: 'text' }
    ]
  },

  // --- INTEGRATIONS ---
  'gmail-send': {
    type: 'integration',
    name: 'gmail-send',
    label: 'Gmail',
    description: 'Send email',
    icon: Mail,
    color: '#ef4444',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'to', label: 'To', type: 'text' },
      { name: 'subject', label: 'Subject', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea' }
    ]
  },
  'github-repo': {
    type: 'integration',
    name: 'github-repo',
    label: 'GitHub',
    description: 'Repository actions',
    icon: Github,
    color: '#000000',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'repo', label: 'Repository', type: 'text' }
    ]
  },
  'slack-notify': {
    type: 'integration',
    name: 'slack-notify',
    label: 'Slack',
    description: 'Post message',
    icon: Slack,
    color: '#4a154b',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'channel', label: 'Channel', type: 'text' },
      { name: 'message', label: 'Message', type: 'textarea' }
    ]
  },

  // --- SYSTEM ---
  'execute-command': {
    type: 'system',
    name: 'execute-command',
    label: 'Execute Command',
    description: 'Run shell command',
    icon: Terminal,
    color: '#000000',
    inputs: 1,
    outputs: 1,
    configFields: [
      { name: 'command', label: 'Command', type: 'text' }
    ]
  }
};
