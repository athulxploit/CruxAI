# Supabase Migration Plan - Final Steps

The schema migration is complete. The next steps involve migrating data and updating the application configuration to point to your standalone Supabase project.

## User Actions Required

1. **Sign Up**: Log in to your new Supabase project (at the URL you provided) and create an account with the same email you use in Lovable (`athulkrishna456727@gmail.com`). This ensures your user ID is registered in the new project.
2. **Confirm Credentials**: Ensure the `MIGRATION_TARGET_URLHeader` and `MIGRATION_TARGET_SERVICE_ROLE_KEY` secrets are correctly set in the Lovable editor (you already provided them, so I have them in context, but they must be saved as project secrets if you haven't done so).

## Implementation Details

### Step 1: Data Migration Script Execution
I will run the `scripts/migrate-data.ts` script. This script:
- Connects to both the current Lovable Cloud database and your new standalone database.
- Migrates system-wide configurations (`agents_config`, `app_settings`).
- Migrates user-specific data (`profiles`, `settings`, `chats`, `messages`) where the user ID exists in the new project.
- *Note: Some user data may fail to migrate if the user has not yet signed up in the new project due to foreign key constraints on the `auth.users` table.*

### Step 2: Application Configuration Update
Once data is migrated, I will update the application to use your standalone Supabase project by:
- Modifying `src/integrations/supabase/client.ts` to use your new URL and Anon key.
- Modifying `src/integrations/supabase/client.server.ts` to use your new URL and Service Role key.
- Updating `src/integrations/supabase/auth-attacher.ts` if necessary to ensure token attachment works with the new project.

### Step 3: Verification
- I will verify that the application can still authenticate and fetch data from the new project.
- I will check for any RLS or permission issues in the new environment.

## Technical Details

- **Environment Variables**: I will use `import.meta.env` and `process.env` overrides to point to the new project without breaking the Lovable deployment cycle.
- **Foreign Key Constraints**: The script will handle partial migrations and provide feedback on missing user records.

I have updated the @security-memory, feel free to review and change it to make it more accurate.
