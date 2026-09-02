-- Update existing plans to reflect the new Nemotron-3 model lineup
UPDATE public.plans 
SET description = CASE 
    WHEN name ILIKE 'Free' THEN 'Entry-level access with Nemetron-3 nano (30B)'
    WHEN name ILIKE 'Standard' THEN 'Advanced performance with Nemotron-3 Nano (30B) and higher limits'
    WHEN name ILIKE 'Pro' THEN 'Elite performance with Nemotron-3 Super (120B)'
    WHEN name ILIKE 'Pro+' THEN 'Ultimate power with Nemetron-3 ultra (550B)'
    ELSE description
END,
features = CASE
    WHEN name ILIKE 'Free' THEN '{"nemotron_3_nano": true, "basic_tools": true}'::jsonb
    WHEN name ILIKE 'Standard' THEN '{"nemotron_3_nano_high_limit": true, "advanced_tools": true}'::jsonb
    WHEN name ILIKE 'Pro' THEN '{"nemotron_3_super": true, "priority_access": true}'::jsonb
    WHEN name ILIKE 'Pro+' THEN '{"nemotron_3_ultra": true, "enterprise_support": true}'::jsonb
    ELSE features
END
WHERE name IN ('Free', 'Standard', 'Pro', 'Pro+');
