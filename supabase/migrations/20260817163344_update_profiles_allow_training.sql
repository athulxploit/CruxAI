DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='allow_data_collection') THEN
        ALTER TABLE public.profiles ADD COLUMN allow_data_collection boolean DEFAULT true;
    END IF;
END $$;

-- Ensure the existing user_settings table and privacy key handling is correct
-- The app uses user_settings.privacy JSON, but the user explicitly asked for allow_data_collection on profiles
-- We will implement both to be safe or just follow the specific request for "profiles" table.
-- The user said: "update their user profile/settings in the database to set 'allow_data_collection' to true"
