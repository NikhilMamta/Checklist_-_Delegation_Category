-- ====================================================================
-- MAMTA HOSPITAL - STANDALONE USER CREDENTIALS DATABASE TABLE
-- Target: Supabase PostgreSQL Database
-- Purpose: Creates a brand new, isolated user credentials table with ONLY 
--          2 seed accounts (admin / admin123 & user / user123).
-- ====================================================================

-- 1. Create the user_credentials table
CREATE TABLE IF NOT EXISTS public.user_credentials (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '121212',
    name TEXT NOT NULL,
    email TEXT,
    mobile TEXT,
    employee_id TEXT,
    role TEXT DEFAULT 'User', -- 'Admin' | 'User'
    department TEXT DEFAULT 'General',
    designation TEXT,
    status TEXT DEFAULT 'Active', -- 'Active' | 'Inactive'
    can_self_assign BOOLEAN DEFAULT false,
    profile_image TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_user_credentials_username ON public.user_credentials(username);
CREATE INDEX IF NOT EXISTS idx_user_credentials_role ON public.user_credentials(role);
CREATE INDEX IF NOT EXISTS idx_user_credentials_status ON public.user_credentials(status);

-- 3. Seed ONLY 2 User Accounts: admin (admin123) and user (user123)
INSERT INTO public.user_credentials (id, username, password, name, email, mobile, role, department, designation, can_self_assign)
VALUES 
    ('1', 'admin', 'admin123', 'System Administrator', 'admin@mamtahospital.com', '9876543210', 'Admin', 'Management', 'Hospital Admin', true),
    ('2', 'user', 'user123', 'Hospital Staff User', 'user@mamtahospital.com', '9876543211', 'User', 'General Operations', 'Hospital Staff', true)
ON CONFLICT (id) DO UPDATE SET
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    status = EXCLUDED.status;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to user_credentials" ON public.user_credentials;
CREATE POLICY "Allow all access to user_credentials" 
ON public.user_credentials 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 5. Enable Realtime updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_credentials'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_credentials;
  END IF;
END $$;
