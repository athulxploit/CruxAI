-- Enum for blueprint item types
CREATE TYPE public.blueprint_item_type AS ENUM (
  'vision', 'objective', 'requirement', 'feature', 'architecture', 
  'technology', 'decision', 'constraint', 'milestone', 'task', 
  'question', 'issue', 'file', 'workflow', 'test', 'state', 'history'
);

-- Enum for blueprint item status
CREATE TYPE public.blueprint_status AS ENUM (
  'planned', 'in_progress', 'completed', 'blocked', 'cancelled'
);

-- Enum for decision source
CREATE TYPE public.blueprint_source AS ENUM (
  'user', 'ai_recommendation', 'ai_inferred', 'unresolved'
);

-- Workspace Blueprints
CREATE TABLE public.blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tagline TEXT DEFAULT 'Your project''s living intelligence.',
  status TEXT DEFAULT 'active',
  progress INTEGER DEFAULT 0,
  current_milestone TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blueprint Items (Sections)
CREATE TABLE public.blueprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  type public.blueprint_item_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  meta JSONB DEFAULT '{}',
  status public.blueprint_status DEFAULT 'planned',
  source public.blueprint_source DEFAULT 'unresolved',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blueprint Versions (History)
CREATE TABLE public.blueprint_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blueprint_versions TO authenticated;

GRANT ALL ON public.blueprints TO service_role;
GRANT ALL ON public.blueprint_items TO service_role;
GRANT ALL ON public.blueprint_versions TO service_role;

-- Enable RLS
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_versions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own blueprints"
ON public.blueprints FOR ALL TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own blueprint items"
ON public.blueprint_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.blueprints
  WHERE blueprints.id = blueprint_items.blueprint_id
  AND blueprints.user_id = auth.uid()
));

CREATE POLICY "Users can manage their own blueprint versions"
ON public.blueprint_versions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.blueprints
  WHERE blueprints.id = blueprint_versions.blueprint_id
  AND blueprints.user_id = auth.uid()
));
