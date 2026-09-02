export type BlueprintItemType = 
  | 'vision' | 'objective' | 'requirement' | 'feature' | 'architecture' 
  | 'technology' | 'decision' | 'constraint' | 'milestone' | 'task' 
  | 'question' | 'issue' | 'file' | 'workflow' | 'test' | 'state' | 'history'
  | 'identity' | 'logic' | 'security' | 'ux';

export type BlueprintStatus = 
  | 'discovery' | 'understanding' | 'incomplete' | 'ready_for_build' 
  | 'in_development' | 'testing' | 'completed' | 'blocked' | 'cancelled';

export type BlueprintSource = 
  | 'user_confirmed' | 'ai_recommendation' | 'ai_inferred' 
  | 'user_preference' | 'system_requirement' | 'unresolved';

export interface BlueprintItem {
  id: string;
  blueprint_id: string;
  type: BlueprintItemType;
  title: string;
  content: string | null;
  meta: {
    source: BlueprintSource;
    conflict?: string;
    dependencies?: string[];
    decision_history?: Array<{
      value: any;
      timestamp: string;
      reason?: string;
    }>;
    [key: string]: any;
  };
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Blueprint {
  id: string;
  protocol_id: string; // XCOMM-PRJ-XXXXXXXX
  workspace_id: string;
  user_id: string;
  title: string;
  tagline: string;
  status: BlueprintStatus;
  progress: number;
  completeness: number; // 0-100%
  current_milestone: string | null;
  project_type: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  items?: BlueprintItem[];
}

export interface BlueprintVersion {
  id: string;
  blueprint_id: string;
  version: number;
  snapshot: any;
  created_at: string;
  created_by: string | null;
}
