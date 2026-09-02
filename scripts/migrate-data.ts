import { createClient } from '@supabase/supabase-js';

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

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
  const sourceClient = createClient(sourceUrl, sourceKey, {
    global: { fetch: createSupabaseFetch(sourceKey) },
  });

  console.log('--- DATA MIGRATION START (Auth Users & Roles) ---');
  
  // 1. Fetch source users (via profiles as a proxy for IDs, or just migrate tables that don't depend on auth.users first)
  // Note: We cannot easily migrate auth.users via PostgREST. 
  // However, we can migrate tables that are NOT strictly tied to auth.users if we disable FKs temporarily or if they are already there.
  // Since we are moving to a new project, the user IDs must exist in the new project's auth.users table.
  
  const tables = [
    'agents_config',
    'app_settings',
    'profiles',
    'user_settings',
    'notifications',
    'activity_log',
    'xcomm_interactions',
    'app_user_connections',
    'workflows',
    'blueprints',
    'plugin_settings',
    'chats',
    'messages',
    'memories',
    'broadcasts',
  ];

  for (const table of tables) {
    console.log(`Table: ${table}`);
    const { data, error: fetchError } = await sourceClient.from(table).select('*');
    if (fetchError) {
      console.error(`  Fetch Error:`, fetchError.message);
      continue;
    }

    if (data && data.length > 0) {
      console.log(`  Found ${data.length} rows. Attempting upsert...`);
      const { error: insertError } = await targetClient.from(table).upsert(data);
      if (insertError) {
        console.error(`  Insert Error:`, insertError.message);
        if (insertError.message.includes('foreign key constraint')) {
          console.log(`  Tip: Ensure users have signed up in the new project so their IDs exist in auth.users.`);
        }
      } else {
        console.log(`  SUCCESS: Migrated ${data.length} rows.`);
      }
    } else {
      console.log(`  No data to migrate.`);
    }
  }

  console.log('--- DATA MIGRATION END ---');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
