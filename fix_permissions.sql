-- ====================================================================
-- FIX SUPABASE TABLE PERMISSION DENIED (42501) & RLS ERRORS
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ====================================================================

-- 1. Grant usage on schema public to Supabase API roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- 2. Grant ALL permissions on all tables in public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 3. Grant ALL permissions on all sequences in public schema
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Grant ALL permissions on all functions in public schema
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. Set default privileges so any future tables automatically get permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- 6. Enable RLS and add permissive policy for all public tables
DO $$ 
DECLARE 
    tbl text;
BEGIN 
    FOR tbl IN 
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP 
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow_Public_Full_Access" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow_Public_Full_Access" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP; 
END $$;
