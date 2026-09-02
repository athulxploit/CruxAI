import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function migrate() {
  const targetUrl = process.env.MIGRATION_TARGET_URLHeader;
  const targetKey = process.env.MIGRATION_TARGET_SERVICE_ROLE_KEY;
  const sourceUrl = process.env.VITE_SUPABASE_URL;
  const sourceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!targetUrl || !targetKey || !sourceUrl || !sourceKey) {
    console.error('Missing migration environment variables.');
    process.exit(1);
  }

  const targetClient = createClient(targetUrl, targetKey);

  console.log('Reading compiled schema...');
  const schemaSql = fs.readFileSync('full_schema_migration.sql', 'utf8');
  
  // We will split the schema into manageable chunks (by -- ================= statements)
  const chunks = schemaSql.split(/-- =========================================================/);
  
  console.log(`Split schema into ${chunks.length} chunks.`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (!chunk) continue;
    
    console.log(`Executing chunk ${i}...`);
    // Using a internal/hidden RPC or trying to execute via a temporary function if allowed
    // Since we don't have a direct 'sql' RPC, we'll try to use a specific trick:
    // Some Supabase setups have an 'exec_sql' function for migrations.
    
    const { error } = await targetClient.rpc('exec_sql', { sql_query: chunk }).catch(e => ({ error: e }));
    
    if (error) {
      // If exec_sql doesn't exist, we have to fallback to user manual action for schema
      console.warn(`Chunk ${i} failed (likely RPC 'exec_sql' missing). Manual schema application may be required.`);
      console.error(error);
      break; 
    }
  }

  console.log('Schema application attempt finished.');
}

migrate();
